/**
 * Removes all users that don't have an organization field set.
 * Run this once after the multi-tenant migration, then re-run seed.js.
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI not defined in .env.local');
  process.exit(1);
}

async function cleanup() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // Remove users without organization
    const usersResult = await db.collection('users').deleteMany({
      organization: { $exists: false }
    });
    console.log(`Deleted ${usersResult.deletedCount} user(s) without organization`);

    // Remove roles without organization
    const rolesResult = await db.collection('roles').deleteMany({
      organization: { $exists: false }
    });
    console.log(`Deleted ${rolesResult.deletedCount} role(s) without organization`);

    console.log('\nDone. Now run: node seed.js');
    process.exit(0);
  } catch (error) {
    console.error('Cleanup error:', error);
    process.exit(1);
  }
}

cleanup();
