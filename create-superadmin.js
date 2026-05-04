/**
 * One-time script to create the SuperAdmin account.
 * Run: node create-superadmin.js
 */
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const readline = require("readline");
require("dotenv").config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI not defined in .env.local");
  process.exit(1);
}

const SuperAdminSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  email:     { type: String, required: true, unique: true, lowercase: true },
  password:  { type: String, required: true },
  lastLogin: { type: Date },
}, { timestamps: true });

const SuperAdmin = mongoose.models.SuperAdmin || mongoose.model("SuperAdmin", SuperAdminSchema);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

async function main() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB\n");

    const existing = await SuperAdmin.findOne({});
    if (existing) {
      console.log(`SuperAdmin already exists: ${existing.email}`);
      console.log("Delete it from MongoDB first if you want to recreate.");
      process.exit(0);
    }

    const name     = await ask("Name:     ");
    const email    = await ask("Email:    ");
    const password = await ask("Password: ");

    if (!name || !email || !password) {
      console.error("All fields are required.");
      process.exit(1);
    }

    const hashed = await bcrypt.hash(password, 10);
    await SuperAdmin.create({ name, email: email.toLowerCase(), password: hashed });

    console.log("\nSuperAdmin created successfully!");
    console.log(`  Email: ${email.toLowerCase()}`);
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
