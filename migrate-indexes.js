const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Please define the MONGODB_URI environment variable inside .env.local');
  process.exit(1);
}

async function migrateIndexes() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // --- Fix roles collection ---
    const rolesCollection = db.collection('roles');
    const roleIndexes = await rolesCollection.indexes();
    console.log('Current roles indexes:', roleIndexes.map(i => i.name));

    if (roleIndexes.find(i => i.name === 'name_1')) {
      await rolesCollection.dropIndex('name_1');
      console.log('Dropped old roles.name_1 index');
    } else {
      console.log('roles.name_1 index not found — already clean');
    }

    // --- Fix templatecategories collection ---
    const categoriesCollection = db.collection('templatecategories');
    const categoryIndexes = await categoriesCollection.indexes();
    console.log('Current templatecategories indexes:', categoryIndexes.map(i => i.name));

    if (categoryIndexes.find(i => i.name === 'name_1')) {
      await categoriesCollection.dropIndex('name_1');
      console.log('Dropped old templatecategories.name_1 index');
    } else {
      console.log('templatecategories.name_1 index not found — already clean');
    }

    console.log('\nMigration complete. Restart your Next.js server — Mongoose will create the new compound indexes automatically.');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

migrateIndexes();
