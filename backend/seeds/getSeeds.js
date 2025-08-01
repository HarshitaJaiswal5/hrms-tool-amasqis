// seeds.js
import { MongoClient, ObjectId } from 'mongodb';

// Replace with your actual MongoDB URI and DB info
const uri = 'mongodb+srv://admin:AdMin-2025@cluster0.iooxltd.mongodb.net/';
const dbName = '68443081dcdfe43152aebf80';
const collectionName = 'hr';

async function getAllLeads() {
    const client = new MongoClient(uri, { useUnifiedTopology: true });

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');

        const db = client.db(dbName);
        const leadsCollection = db.collection(collectionName);
        const leads = await leadsCollection.find({}).toArray();
        // const leads = await leadsCollection.find({
        //     _id: new ObjectId("6880fd489a69a16f9eb34692") 
        // }).toArray();
        console.log(`📄 Found ${leads.length} leads:`);
        console.log(JSON.stringify(leads, null, 2));
    } catch (error) {
        console.error('❌ Error fetching leads:', error.message);
    } finally {
        await client.close();
        console.log('🔒 Connection closed');
    }
}
getAllLeads();
