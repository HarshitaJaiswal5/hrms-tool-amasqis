// seedProject.js
import { MongoClient, ObjectId } from "mongodb";

const uri = 'mongodb+srv://admin:AdMin-2025@cluster0.iooxltd.mongodb.net/';
const dbName = '68443081dcdfe43152aebf80';
const collectionName = 'hr';

async function seedProject() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(dbName);
    const projects = db.collection(collectionName);

    const newProject = [
      {
        "employeeId": "EMP-500",
        "name": "Priya Sharma",
        "email": "priya.sharma@example.com",
        "phone_number": "+91-9876543210",
        "date_of_birth": "1992-03-15",
        "gender": "Female",
        "address": "221, MG Road, Bangalore, Karnataka, 560001, India",
        "department": "Human Resources",
        "designation": "Executive",
        "date_of_joining": "2020-10-01",
        "employment_type": "Full-Time",
        "salary": 480000,
        "manager_id": "EMP010",
        "status": "Active",
        "emergency_contact_name": "Rohit Sharma",
        "emergency_contact_phone": "+91-9876512345",
        "aadhaar_number": "1234-5678-9012",
        "pan_number": "ABCDE1234F",
        "blood_group": "B+",
        "bank_account_number": "123456789012",
        "bank_ifsc": "HDFC0001234",
        "created_at": "2020-10-01T09:00:00Z",
        "updated_at": "2022-09-10T11:25:00Z"
      }

    ]

    const result = await projects.insertMany(newProject);
    console.log(`✅ Project inserted with _id: ${result.insertedIds}`);
  } catch (err) {
    console.error("❌ Error inserting project:", err.message);
  } finally {
    await client.close();
    console.log("🔒 MongoDB connection closed");
  }
}

seedProject();
