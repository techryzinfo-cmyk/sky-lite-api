require('dotenv').config({path: '.env.local'});
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const msgs = await mongoose.connection.collection('chatmessages').find({ readBy: { $size: 0 } }).toArray();
  console.log('Unread msgs total:', msgs.length);
  process.exit(0);
});
