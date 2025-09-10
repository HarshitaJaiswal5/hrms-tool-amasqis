// File: backend/services/employee/employee.services.js

import { getTenantCollections } from "../../config/db.js";

/**
 * Fetches all active employees for a given company.
 * @param {string} companyId - The ID of the company.
 * @returns {Promise<object>} - A promise that resolves to the list of employees.
 */
export const getAllEmployees = async (companyId) => {
  try {
    const collections = getTenantCollections(companyId);
    const employees = await collections.employees
      .find({ status: "Active" }) // You can adjust this filter if needed
      .sort({ createdAt: -1 })
      .toArray();

    return employees;
  } catch (error) {
    console.error("Error fetching all employees:", error);
    throw new Error("Could not retrieve employees.");
  }
};