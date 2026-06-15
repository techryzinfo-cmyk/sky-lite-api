require('dotenv').config({path: '.env.local'});
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const userIdObj = new mongoose.Types.ObjectId('6a2e9a347a08f1a50092ea98');
  
  const count = await mongoose.connection.collection('chatmessages').countDocuments({
    sender: { $ne: userIdObj },
    readBy: { $ne: userIdObj }
  });
  
  console.log('Unread count:', count);
  
  // also get one
  const msg = await mongoose.connection.collection('chatmessages').findOne({
    sender: { $ne: userIdObj },
    readBy: { $ne: userIdObj }
  });
  console.log('Unread msg:', msg);
  
  process.exit(0);
});
