const mongoose = require('mongoose');

const MONGODB_URI = "mongodb://pratham:16451645@ac-kvycyc7-shard-00-00.inoo42n.mongodb.net:27017,ac-kvycyc7-shard-00-01.inoo42n.mongodb.net:27017,ac-kvycyc7-shard-00-02.inoo42n.mongodb.net:27017/?ssl=true&authSource=admin&retryWrites=true&w=majority";

const BOQItemSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
  groupName: String,
  itemNumber: String,
  itemDescription: String,
  status: String,
});

const BOQ = mongoose.model("BOQ", BOQItemSchema, "boqs");

async function test() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB!");
    
    const itemId = "6a0afa39f1baecdbcc151ee2";
    const item = await BOQ.findById(itemId);
    
    if (item) {
      console.log("\nFOUND ITEM:");
      console.log("ID:", item._id);
      console.log("Project:", item.project);
      console.log("GroupName:", item.groupName);
      console.log("ItemNumber:", item.itemNumber);
      console.log("Description:", item.itemDescription);
      console.log("Status:", item.status);
    } else {
      console.log(`\nITEM ${itemId} NOT FOUND!`);
      
      // Let's search by item description or list some items to see what is in there
      const count = await BOQ.countDocuments();
      console.log("Total BOQ items in database:", count);
      
      const sample = await BOQ.findOne();
      if (sample) {
        console.log("Sample BOQ item in database:", sample);
      }
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

test();
