import { MongoClient } from "mongodb";

const uri = "mongodb+srv://admin:AdMin-2025@cluster0.iooxltd.mongodb.net/";
const companyId = "68443081dcdfe43152aebf80";

async function testActivities() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    
    const db = client.db(companyId);
    const activitiesCollection = db.collection("activities");
    
    // Test 1: Check if activities collection exists
    const collections = await db.listCollections().toArray();
    const hasActivities = collections.some(col => col.name === "activities");
    console.log("Activities collection exists:", hasActivities);
    
    if (!hasActivities) {
      console.log("Creating activities collection...");
    }
    
    // Test 2: Insert a sample activity
    const sampleActivity = {
      title: "Test Activity - Client Meeting",
      activityType: "Meeting",
      dueDate: new Date("2024-12-25"),
      owner: "John Doe",
      description: "This is a test activity for the HRMS system",
      status: "pending",
      companyId: companyId,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false
    };
    
    const insertResult = await activitiesCollection.insertOne(sampleActivity);
    console.log("Sample activity inserted:", insertResult.insertedId);
    
    // Test 3: Query activities
    const activities = await activitiesCollection.find({ 
      companyId, 
      isDeleted: { $ne: true } 
    }).toArray();
    
    console.log("Total activities found:", activities.length);
    console.log("Sample activity:", activities[0]);
    
    // Test 4: Get statistics
    const stats = await activitiesCollection.aggregate([
      { $match: { companyId, isDeleted: { $ne: true } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          overdue: { $sum: { $cond: [{ $and: [{ $lt: ["$dueDate", new Date()] }, { $ne: ["$status", "completed"] }] }, 1, 0] } }
        }
      }
    ]).toArray();
    
    console.log("Activity statistics:", stats[0] || { total: 0, pending: 0, completed: 0, overdue: 0 });
    
    // Test 5: Get activity types
    const activityTypes = await activitiesCollection.distinct("activityType", { 
      companyId, 
      isDeleted: { $ne: true } 
    });
    
    console.log("Activity types found:", activityTypes);
    
    // Test 6: Get owners
    const owners = await activitiesCollection.distinct("owner", { 
      companyId, 
      isDeleted: { $ne: true },
      owner: { $exists: true, $ne: null }
    });
    
    console.log("Activity owners found:", owners);
    
  } catch (error) {
    console.error("Error testing activities:", error);
  } finally {
    await client.close();
    console.log("MongoDB connection closed");
  }
}

testActivities(); 