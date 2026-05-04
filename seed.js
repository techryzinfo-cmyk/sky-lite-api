const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Please define the MONGODB_URI environment variable inside .env.local');
  process.exit(1);
}

const OrganizationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
});

const RoleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  permissions: [String],
  isSystemRole: { type: Boolean, default: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
});

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  status: { type: String, default: 'Active' },
  auditTrail: [Object],
});

const Organization = mongoose.models.Organization || mongoose.model('Organization', OrganizationSchema);
const Role = mongoose.models.Role || mongoose.model('Role', RoleSchema);
const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const adminEmail = 'admin@example.com';
    const existingUser = await User.findOne({ email: adminEmail });
    if (existingUser) {
      console.log('Admin user already exists — skipping seed.');
      process.exit(0);
    }

    // 1. Create Organization (placeholder owner)
    const org = await Organization.create({
      name: "System Admin Workspace",
      owner: new mongoose.Types.ObjectId(),
    });
    console.log('Organization created:', org.name);

    // 2. Create Admin Role scoped to this org
    const adminRole = await Role.create({
      name: 'Admin',
      permissions: ['*'],
      isSystemRole: true,
      organization: org._id,
    });
    console.log('Admin role created');

    // 3. Create Admin User
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    const adminUser = await User.create({
      name: 'System Admin',
      email: adminEmail,
      password: hashedPassword,
      role: adminRole._id,
      organization: org._id,
      status: 'Active',
      auditTrail: [{
        userName: 'System',
        action: 'Create',
        details: 'Initial Seed Admin Account',
        timestamp: new Date(),
      }],
    });
    console.log('Admin user created:');
    console.log('  Email:    admin@example.com');
    console.log('  Password: admin123');

    // 4. Set real owner on org
    org.owner = adminUser._id;
    await org.save();
    console.log('Organization owner updated');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
