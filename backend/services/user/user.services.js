

import { getTenantCollections } from "../../config/db.js";

import { ObjectId } from "mongodb";
/**
 * @param {object} userData 
 * @returns {Promise<object>} 
 */
export const addUser = async (userData) => {
  const { role, companyId, ...restOfData } = userData;

  try {
    // Here you would add logic to create the user in Clerk if needed,
    // then save them to your database.

    if (role === 'Employee') {
      const collections = getTenantCollections(companyId);
      const newEmployee = {
        ...restOfData,
        companyId,
        status: "Active",
        createdAt: new Date(),
      };
      const result = await collections.employees.insertOne(newEmployee);
      return { ...newEmployee, _id: result.insertedId };

    } else if (role === 'Client') {
      const collections = getTenantCollections(companyId);
      const newClient = {
        name: `${restOfData.firstName} ${restOfData.lastName}`, // Clients might just have a 'name' field
        email: restOfData.email,
        phone: restOfData.phone,
        companyId,
        status: "Active",
        createdAt: new Date(),
      };
      const result = await collections.clients.insertOne(newClient);
      return { ...newClient, _id: result.insertedId };
    } else {
      throw new Error("Invalid user role specified.");
    }
  } catch (error) {
    console.error("Error adding user:", error);
    throw new Error("Could not add new user.");
  }
};
/**
 * Updates an existing user (employee or client) in the database.
 * @param {string} userId - The ID of the user to update.
 * @param {object} updatedData - The new data for the user.
 * @returns {Promise<object>} - A promise that resolves to the update result.
 */
export const updateUser = async (userId, updatedData) => {
  const { role, companyId, ...dataToUpdate } = updatedData;

  // Remove fields that should not be directly updated
  delete dataToUpdate._id;
  delete dataToUpdate.key;
  
  try {
    const collections = getTenantCollections(companyId);
    let collection;
    
    // Determine which collection to update based on the role
    if (role === 'Employee') {
      collection = collections.employees;
      // Ensure name is split into firstName and lastName for employees
      dataToUpdate.name = `${dataToUpdate.firstName} ${dataToUpdate.lastName}`;
    } else if (role === 'Client') {
      collection = collections.clients;
      // Clients might just have a 'name' field
      dataToUpdate.name = `${dataToUpdate.firstName} ${dataToUpdate.lastName}`;
    } else {
      throw new Error("Invalid user role for update.");
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(userId) }, // Find the document by its ID
      { $set: dataToUpdate }       // Set the new values
    );

    if (result.matchedCount === 0) {
      throw new Error("User not found.");
    }

    return result;

  } catch (error) {
    console.error(`Error updating user ${userId}:`, error);
    throw new Error("Could not update user.");
  }
};