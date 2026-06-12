const mongoose = require('mongoose');

async function fix() {
  await mongoose.connect('mongodb://pratham:16451645@ac-kvycyc7-shard-00-00.inoo42n.mongodb.net:27017,ac-kvycyc7-shard-00-01.inoo42n.mongodb.net:27017,ac-kvycyc7-shard-00-02.inoo42n.mongodb.net:27017/?ssl=true&authSource=admin&retryWrites=true&w=majority');
  const collection = mongoose.connection.collection('users');
  const users = await collection.find({}).toArray();
  
  for (const user of users) {
    const update = {};
    if (user.__enc_name && typeof user.name === 'string' && !user.name.includes(':')) {
      update.__enc_name = false;
    }
    if (user.__enc_phoneNumber && typeof user.phoneNumber === 'string' && !user.phoneNumber.includes(':')) {
      update.__enc_phoneNumber = false;
    }
    
    if (Object.keys(update).length > 0) {
      await collection.updateOne({ _id: user._id }, { $set: update });
      console.log(`Fixed user ${user._id}`);
    }
  }
  
  console.log("Done fixing users.");
  process.exit(0);
}
fix();
