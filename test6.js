require('dotenv').config({path: '.env.local'});
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = require('./src/models/User').default || require('./src/models/User');
  const users = await User.find({}).select('name email pushTokens');
  console.log(users.map(u => ({ name: u.name, pushTokens: u.pushTokens })));
  process.exit(0);
});
