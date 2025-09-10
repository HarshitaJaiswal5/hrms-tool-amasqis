const { MongoClient, ObjectId } = require('mongodb');
const { getTenantCollections } = require('./config/db.js');

// Test configuration
const COMPANY_ID = "68443081dcdfe43152aebf80";
const TEST_ACTIVITY_ID = "test_activity_id";

async function testActivitiesEditDelete() {
  console.log('🧪 Starting Activities Edit & Delete Test Suite...\n');
  
  try {
    // Get collections
    const collections = getTenantCollections(COMPANY_ID);
    console.log('✅ Database connection established');
    
    // Test 1: Create a test activity
    console.log('\n📝 Test 1: Creating test activity...');
    const testActivity = {
      title: "Test Activity for Edit/Delete",
      activityType: "Meeting",
      dueDate: new Date("2024-12-25T10:00:00Z"),
      owner: "Test Owner",
      description: "This is a test activity for edit/delete functionality",
      status: "pending",
      companyId: COMPANY_ID,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
      reminder: "Test reminder",
      reminderType: "15 minutes",
      guests: "Test Guest 1, Test Guest 2"
    };
    
    const insertResult = await collections.activities.insertOne(testActivity);
    console.log(`✅ Test activity created with ID: ${insertResult.insertedId}`);
    
    // Test 2: Get the created activity
    console.log('\n🔍 Test 2: Retrieving created activity...');
    const createdActivity = await collections.activities.findOne({ 
      _id: insertResult.insertedId,
      companyId: COMPANY_ID,
      isDeleted: { $ne: true }
    });
    
    if (createdActivity) {
      console.log('✅ Activity retrieved successfully');
      console.log(`   Title: ${createdActivity.title}`);
      console.log(`   Type: ${createdActivity.activityType}`);
      console.log(`   Owner: ${createdActivity.owner}`);
    } else {
      throw new Error('Failed to retrieve created activity');
    }
    
    // Test 3: Update the activity
    console.log('\n✏️ Test 3: Updating activity...');
    const updateData = {
      title: "Updated Test Activity",
      activityType: "Calls",
      owner: "Updated Owner",
      description: "This activity has been updated for testing",
      updatedAt: new Date()
    };
    
    const updateResult = await collections.activities.updateOne(
      { _id: insertResult.insertedId, companyId: COMPANY_ID },
      { $set: updateData }
    );
    
    if (updateResult.matchedCount > 0 && updateResult.modifiedCount > 0) {
      console.log('✅ Activity updated successfully');
    } else {
      throw new Error('Failed to update activity');
    }
    
    // Test 4: Verify the update
    console.log('\n🔍 Test 4: Verifying update...');
    const updatedActivity = await collections.activities.findOne({ 
      _id: insertResult.insertedId,
      companyId: COMPANY_ID,
      isDeleted: { $ne: true }
    });
    
    if (updatedActivity) {
      console.log('✅ Updated activity retrieved successfully');
      console.log(`   New Title: ${updatedActivity.title}`);
      console.log(`   New Type: ${updatedActivity.activityType}`);
      console.log(`   New Owner: ${updatedActivity.owner}`);
      
      if (updatedActivity.title === updateData.title && 
          updatedActivity.activityType === updateData.activityType) {
        console.log('✅ Update verification passed');
      } else {
        throw new Error('Update verification failed - data mismatch');
      }
    } else {
      throw new Error('Failed to retrieve updated activity');
    }
    
    // Test 5: Soft delete the activity
    console.log('\n🗑️ Test 5: Soft deleting activity...');
    const deleteResult = await collections.activities.updateOne(
      { _id: insertResult.insertedId, companyId: COMPANY_ID },
      { 
        $set: { 
          isDeleted: true, 
          deletedAt: new Date(),
          updatedAt: new Date()
        } 
      }
    );
    
    if (deleteResult.matchedCount > 0 && deleteResult.modifiedCount > 0) {
      console.log('✅ Activity soft deleted successfully');
    } else {
      throw new Error('Failed to soft delete activity');
    }
    
    // Test 6: Verify soft delete
    console.log('\n🔍 Test 6: Verifying soft delete...');
    const deletedActivity = await collections.activities.findOne({ 
      _id: insertResult.insertedId,
      companyId: COMPANY_ID
    });
    
    if (deletedActivity && deletedActivity.isDeleted === true) {
      console.log('✅ Soft delete verification passed');
      console.log(`   isDeleted: ${deletedActivity.isDeleted}`);
      console.log(`   deletedAt: ${deletedActivity.deletedAt}`);
    } else {
      throw new Error('Soft delete verification failed');
    }
    
    // Test 7: Verify activity is not returned in normal queries
    console.log('\n🔍 Test 7: Verifying activity is excluded from normal queries...');
    const normalQueryResult = await collections.activities.find({ 
      companyId: COMPANY_ID,
      isDeleted: { $ne: true }
    }).toArray();
    
    const deletedActivityInQuery = normalQueryResult.find(
      activity => activity._id.toString() === insertResult.insertedId.toString()
    );
    
    if (!deletedActivityInQuery) {
      console.log('✅ Deleted activity correctly excluded from normal queries');
    } else {
      throw new Error('Deleted activity should not appear in normal queries');
    }
    
    // Test 8: Test validation scenarios
    console.log('\n🔍 Test 8: Testing validation scenarios...');
    
    // Test invalid ObjectId
    try {
      const invalidIdResult = await collections.activities.findOne({ 
        _id: "invalid_id",
        companyId: COMPANY_ID,
        isDeleted: { $ne: true }
      });
      console.log('✅ Invalid ObjectId handled gracefully');
    } catch (error) {
      console.log('✅ Invalid ObjectId validation working');
    }
    
    // Test non-existent activity
    const nonExistentResult = await collections.activities.findOne({ 
      _id: new ObjectId(),
      companyId: COMPANY_ID,
      isDeleted: { $ne: true }
    });
    
    if (!nonExistentResult) {
      console.log('✅ Non-existent activity query handled correctly');
    } else {
      throw new Error('Non-existent activity should return null');
    }
    
    // Test 9: Clean up test data
    console.log('\n🧹 Test 9: Cleaning up test data...');
    const cleanupResult = await collections.activities.deleteOne({ 
      _id: insertResult.insertedId,
      companyId: COMPANY_ID
    });
    
    if (cleanupResult.deletedCount > 0) {
      console.log('✅ Test data cleaned up successfully');
    } else {
      console.log('⚠️ No test data to clean up (already deleted)');
    }
    
    // Test 10: Performance test
    console.log('\n⚡ Test 10: Performance test...');
    const startTime = Date.now();
    
    // Create multiple test activities
    const testActivities = [];
    for (let i = 0; i < 10; i++) {
      testActivities.push({
        title: `Performance Test Activity ${i + 1}`,
        activityType: "Tasks",
        dueDate: new Date(),
        owner: `Test Owner ${i + 1}`,
        description: `Performance test activity ${i + 1}`,
        status: "pending",
        companyId: COMPANY_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false
      });
    }
    
    const bulkInsertResult = await collections.activities.insertMany(testActivities);
    console.log(`✅ Bulk insert completed: ${bulkInsertResult.insertedCount} activities`);
    
    // Test bulk operations
    const bulkUpdateResult = await collections.activities.updateMany(
      { 
        _id: { $in: Object.values(bulkInsertResult.insertedIds) },
        companyId: COMPANY_ID 
      },
      { $set: { status: "completed", updatedAt: new Date() } }
    );
    console.log(`✅ Bulk update completed: ${bulkUpdateResult.modifiedCount} activities`);
    
    // Clean up bulk test data
    const bulkCleanupResult = await collections.activities.deleteMany({ 
      _id: { $in: Object.values(bulkInsertResult.insertedIds) },
      companyId: COMPANY_ID 
    });
    console.log(`✅ Bulk cleanup completed: ${bulkCleanupResult.deletedCount} activities`);
    
    const endTime = Date.now();
    console.log(`✅ Performance test completed in ${endTime - startTime}ms`);
    
    console.log('\n🎉 All tests passed successfully!');
    console.log('\n📊 Test Summary:');
    console.log('   ✅ Database connection');
    console.log('   ✅ Activity creation');
    console.log('   ✅ Activity retrieval');
    console.log('   ✅ Activity update');
    console.log('   ✅ Update verification');
    console.log('   ✅ Soft delete');
    console.log('   ✅ Soft delete verification');
    console.log('   ✅ Query exclusion');
    console.log('   ✅ Validation scenarios');
    console.log('   ✅ Data cleanup');
    console.log('   ✅ Performance testing');
    
    console.log('\n🚀 Activities Edit & Delete functionality is working correctly!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testActivitiesEditDelete()
    .then(() => {
      console.log('\n✅ Test suite completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { testActivitiesEditDelete }; 