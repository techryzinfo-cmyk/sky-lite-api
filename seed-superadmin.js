const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error("MONGODB_URI missing"); process.exit(1); }

const SuperAdminSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  email:     { type: String, required: true, unique: true, lowercase: true },
  password:  { type: String, required: true },
  lastLogin: { type: Date },
}, { timestamps: true });

const SuperAdmin = mongoose.models.SuperAdmin || mongoose.model("SuperAdmin", SuperAdminSchema);

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  const existing = await SuperAdmin.findOne({});
  if (existing) {
    console.log("SuperAdmin already exists:", existing.email);
    process.exit(0);
  }

  const hashed = await bcrypt.hash("superadmin123", 10);
  await SuperAdmin.create({
    name: "Super Admin",
    email: "superadmin@skystruct.com",
    password: hashed,
  });

  console.log("SuperAdmin created:");
  console.log("  Email:    superadmin@skystruct.com");
  console.log("  Password: superadmin123");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
