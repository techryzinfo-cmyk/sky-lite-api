const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const result = await mongoose.connection.collection('projects').updateMany({}, { $set: { status: 'Under Snagging' } });
    console.log('Fixed projects:', result);
  })
  .catch(console.error)
  .finally(() => process.exit(0));
