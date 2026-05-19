const mongoose = require('mongoose');

const MONGODB_URI = "mongodb://pratham:16451645@ac-kvycyc7-shard-00-00.inoo42n.mongodb.net:27017,ac-kvycyc7-shard-00-01.inoo42n.mongodb.net:27017,ac-kvycyc7-shard-00-02.inoo42n.mongodb.net:27017/?ssl=true&authSource=admin&retryWrites=true&w=majority";

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected successfully to DB:", mongoose.connection.name);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
