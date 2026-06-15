require('dotenv').config({path: '.env.local'});
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const ChatMessage = require('./src/models/ChatMessage').default || require('./src/models/ChatMessage');
  
  const projectId = '6a2e99d37a08f1a50092ea19';
  const userIdStr = '6a2e9a347a08f1a50092ea98';
  
  const res = await ChatMessage.updateMany(
    {
      project: projectId,
      sender: { $ne: userIdStr },
      readBy: { $ne: userIdStr }
    },
    {
      $addToSet: { readBy: userIdStr }
    }
  );
  
  console.log('Update res:', res);
  
  process.exit(0);
});
