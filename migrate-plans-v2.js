const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not defined in .env.local');
  process.exit(1);
}

// Define the old/new schema briefly for migration
const PlanFolderSchema = new mongoose.Schema({
  documents: [mongoose.Schema.Types.Mixed],
});

const PlanFolder = mongoose.model('PlanFolder', PlanFolderSchema, 'planfolders');

async function migrate() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const folders = await PlanFolder.find({});
    console.log(`Found ${folders.length} folders to check.`);

    let updatedCount = 0;

    for (const folder of folders) {
      let modified = false;

      if (!folder.documents || folder.documents.length === 0) continue;

      const newDocuments = folder.documents.map((doc) => {
        // Check if it's already in the new format (has versions)
        if (doc.versions && Array.isArray(doc.versions)) {
          return doc;
        }

        // It's in the old format, migrate it
        console.log(`Migrating document: ${doc.name || 'Untitled'}`);
        modified = true;
        updatedCount++;

        return {
          _id: doc._id || new mongoose.Types.ObjectId(),
          name: doc.name || 'Untitled Plan',
          createdAt: doc.uploadedAt || new Date(),
          versions: [
            {
              _id: new mongoose.Types.ObjectId(),
              url: doc.url || '',
              name: doc.name || 'Untitled File',
              versionNumber: 1,
              mimeType: doc.mimeType || 'application/octet-stream',
              size: doc.size || 0,
              uploadedAt: doc.uploadedAt || new Date(),
              approvalStatus: doc.approvalStatus || 'Draft',
              approvalNote: doc.approvalNote || '',
              approvals: doc.approvals || [],
            },
          ],
        };
      });

      if (modified) {
        folder.documents = newDocuments;
        folder.markModified('documents');
        await folder.save();
      }
    }

    console.log(`Migration complete! ${updatedCount} documents migrated across folders.`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
