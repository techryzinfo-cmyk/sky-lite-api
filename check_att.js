import mongoose from 'mongoose';
import dbConnect from './src/lib/db.js';
import Attendance from './src/models/Attendance.js';

async function run() {
  await dbConnect();
  const deleted = await Attendance.deleteMany({ checkInPhoto: 'https://example.com/dummy-selfie.jpg' });
  console.log("Deleted dummy records:", deleted.deletedCount);
  process.exit(0);
}

run();
