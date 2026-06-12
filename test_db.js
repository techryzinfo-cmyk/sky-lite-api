const mongoose = require('mongoose');

async function test() {
  await mongoose.connect('mongodb://pratham:16451645@ac-kvycyc7-shard-00-00.inoo42n.mongodb.net:27017,ac-kvycyc7-shard-00-01.inoo42n.mongodb.net:27017,ac-kvycyc7-shard-00-02.inoo42n.mongodb.net:27017/?ssl=true&authSource=admin&retryWrites=true&w=majority');
  const users = await mongoose.connection.collection('users').find({}).toArray();
  let count = 0;
  for (const user of users) {
    let issue = false;
    if (user.__enc_name && typeof user.name === 'string' && !user.name.includes(':')) {
      console.log(`User ${user._id} has unencrypted name but __enc_name is true: ${user.name}`);
      issue = true;
    }
    if (user.__enc_phoneNumber && typeof user.phoneNumber === 'string' && !user.phoneNumber.includes(':')) {
      console.log(`User ${user._id} has unencrypted phone but __enc_phoneNumber is true: ${user.phoneNumber}`);
      issue = true;
    }
    if (issue) count++;
  }
  console.log(`Found ${count} users with corrupted encryption state.`);
  process.exit(0);
}
test();
