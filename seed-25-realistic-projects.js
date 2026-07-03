const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI not found in .env.local');
  process.exit(1);
}

const OrgSchema = new mongoose.Schema({ name: String }, { strict: false });
const Organization = mongoose.models.Organization || mongoose.model('Organization', OrgSchema);

const UserSchema = new mongoose.Schema({ name: String, email: String, organization: mongoose.Schema.Types.ObjectId }, { strict: false });
const User = mongoose.models.User || mongoose.model('User', UserSchema);

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  currency: { type: String, default: "AED" },
  area: Number,
  projectType: String,
  status: String,
  priority: String,
  clientName: String,
  clientEmail: String,
  clientPhone: String,
  organization: { type: mongoose.Schema.Types.ObjectId, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, required: true },
  startDate: Date,
  endDate: Date,
}, { timestamps: true, strict: false });
const Project = mongoose.models.Project || mongoose.model('Project', ProjectSchema);

const PROJECT_NAMES = [
  "Skyline Corporate Tower", "Oceanview Retail Center", "Downtown Metro Expansion", "Riverfront Luxury Condos", 
  "Central Park Landscaping", "Tech Hub Co-working Space", "Medical Center Renovation", "Grand Hotel Lobby Redesign", 
  "Suburban Residential Complex", "Harbor View Apartments", "Westside Elementary School", "East End Community Center",
  "Oasis Shopping Mall", "Green Energy Data Center", "Sunset Boulevard Office Park", "Lakeside Marina Restoration",
  "Heritage Museum Upgrade", "City Center Sports Arena", "Aerospace Research Facility", "Blue Water Resort",
  "Urban Loft Conversions", "Pinnacle Financial Headquarters", "Apex Logistics Hub", "Sapphire Boutique Interiors",
  "Emerald Valley Estate"
];

const CLIENT_NAMES = [
  "Acme Corp", "Global Industries", "Stark Enterprises", "Wayne Foundation", "Umbrella Corp", 
  "Massive Dynamic", "Initech", "Globex", "Soylent Corp", "Cyberdyne Systems",
  "Aperture Science", "Black Mesa", "Nakatomi Trading", "LexCorp", "Oscorp",
  "Virtucon", "Goliath National Bank", "Oceanic Airlines", "Dunder Mifflin", "Vandelay Industries",
  "Bluth Company", "Sterling Cooper", "Prestige Worldwide", "Dharma Initiative", "Hooli"
];

const STATUSES = ["Initialized", "Planning", "Site Survey", "Ongoing", "Under Snagging", "Snagging Completed", "Completed"];
const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const targetEmail = "prathameshgodage@gmail.com";
    const user = await User.findOne({ email: targetEmail });
    
    if (!user || !user.organization) {
       console.log(`User ${targetEmail} or their organization not found.`);
       process.exit(1);
    }

    const projects = [];
    for (let i = 0; i < 25; i++) {
      const isConstruction = Math.random() > 0.5;
      const startOffset = Math.floor(Math.random() * 60) - 30; // -30 to +30 days from now
      const duration = Math.floor(Math.random() * 300) + 60; // 60 to 360 days
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + startOffset);
      
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + duration);

      projects.push({
        name: PROJECT_NAMES[i % PROJECT_NAMES.length],
        description: `Comprehensive ${isConstruction ? 'construction' : 'interior design'} project for ${CLIENT_NAMES[i % CLIENT_NAMES.length]}.`,
        currency: "AED",
        area: Math.floor(Math.random() * 10000) + 500,
        projectType: isConstruction ? "Construction" : "Interior",
        status: STATUSES[Math.floor(Math.random() * STATUSES.length)],
        priority: PRIORITIES[Math.floor(Math.random() * PRIORITIES.length)],
        clientName: CLIENT_NAMES[i % CLIENT_NAMES.length],
        clientEmail: `contact@${CLIENT_NAMES[i % CLIENT_NAMES.length].toLowerCase().replace(/\s/g, '')}.com`,
        clientPhone: `+971 50 ${Math.floor(Math.random() * 9000000) + 1000000}`,
        organization: user.organization,
        createdBy: user._id,
        startDate: startDate,
        endDate: endDate
      });
    }

    await Project.insertMany(projects);
    console.log(`Successfully added 25 realistic projects for User: ${targetEmail}`);
    process.exit(0);
  } catch (err) {
    console.error('Failed to seed projects:', err);
    process.exit(1);
  }
}

seed();
