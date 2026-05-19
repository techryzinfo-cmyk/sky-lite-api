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
    const id = "69f856d1d4d3a70c6b72763c";
    
    // 1. Try querying with string values
    const item1 = await BOQ.findOne({ _id: itemId, project: id });
    console.log("\nQuery 1 (String project id):", item1 ? "FOUND!" : "NOT FOUND");
    
    // 2. Try querying with ObjectIds explicitly
    const item2 = await BOQ.findOne({ 
      _id: new mongoose.Types.ObjectId(itemId), 
      project: new mongoose.Types.ObjectId(id) 
    });
    console.log("Query 2 (ObjectId project id):", item2 ? "FOUND!" : "NOT FOUND");
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

test();
