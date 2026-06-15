require('dotenv').config({path: '.env.local'});
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const ChatMessage = require('./src/models/ChatMessage').default || require('./src/models/ChatMessage');
  
  const userIdObj = new mongoose.Types.ObjectId('6a2e9a347a08f1a50092ea98');
  const projectId = new mongoose.Types.ObjectId('6a2e99d37a08f1a50092ea19');
  
  const unreadMessages = await ChatMessage.aggregate([
    { 
      $match: { 
        project: { $in: [projectId] },
        sender: { $ne: userIdObj },
        readBy: { $ne: userIdObj }
      }
    },
    {
      $group: {
        _id: "$project",
        count: { $sum: 1 }
      }
    }
  ]);
  
  console.log('Aggregation result:', unreadMessages);
  process.exit(0);
});
