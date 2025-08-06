import mongoose from "mongoose";
import { getTenantCollections } from "../../config/db";

export const addDesignation = async (companyId, hrId, payload) => {
    try {
        if (!companyId || !hrId || !payload) {
            return { done: false, error: "Missing required parameters" };
        }
        const collections = getTenantCollections(companyId);
        const hrExists = await collections.hr.countDocuments({ 
            _id: new ObjectId(hrId) 
        });
        if (!hrExists) return { done: false, error: "HR not found" };
        if (!payload.designation || !payload.department) {
            return { done: false, error: "Designation and department are required" };
        }
        const existingDesignation = await collections.designations.findOne({
            designation: payload.designation,
            department: payload.department
        });
        if (existingDesignation) {
            return { done: false, error: "Designation already exists in this department" };
        }
        const newDesignation = {
            ...payload,
            status: payload.status || 'Active', 
        };
        const result = await collections.designations.insertOne(newDesignation);
        return {
            done: true,
            data: {
                _id: result.insertedId,
                ...newDesignation,
                createdBy: new ObjectId(hrId),
            },
            message: "Designation added successfully"
        };
    } catch (error) {
        console.error("Error in addDesignation:", error);
        return {
            done: false,
            error: `Failed to add designation: ${error.message}`
        };
    }
};

export const deleteDesignation = async (companyId, hrId, designationId) => {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        const collections = getTenantCollections(companyId);
        const [hrExists, designation] = await Promise.all([
            collections.hr.countDocuments({ _id: new ObjectId(hrId) }, { session }),
            collections.designations.findOne(
                { _id: new ObjectId(designationId)},
                { session }
            )
        ]);

        if (!hrExists) {
            await session.abortTransaction();
            return { done: false, error: "HR not found" };
        }

        if (!designation) {
            await session.abortTransaction();
            return { done: false, error: "Designation not found" };
        }

        const employeeCount = await collections.employees.countDocuments(
            { designation: designation.designation},
            { session }
        );

        if (employeeCount > 0) {
            await session.abortTransaction();
            return { 
                done: false, 
                error: `${employeeCount} employee(s) use '${designation.designation}'` 
            };
        }
        await collections.designations.deleteOne(
            { _id: new ObjectId(designationId) },
            { session }
        );
        await session.commitTransaction();
        return {
            done: true,
            data: { deletedDesignation: designation.designation },
            message: `'${designation.designation}' deleted successfully`
        };
    } catch (error) {
        await session.abortTransaction();
        return {
            done: false,
            error: `Operation failed: ${error.message}`
        };
    } finally {
        session.endSession();
    }
};

export const displayDesignations = async (companyId, hrId, filters = {}) => {
    try {
        if (!companyId || !hrId) {
            return { done: false, error: "Missing companyId or hrId" };
        }

        const collections = getTenantCollections(companyId);
        const hrExists = await collections.hr.countDocuments({ 
            _id: new ObjectId(hrId) 
        });
        if (!hrExists) return { done: false, error: "HR not found" };

        const query = {};
        if (filters.status) {
            query.status = filters.status;
        }
        if (filters.department) {
            query.department = filters.department;
        }

        const designations = await collections.designations.find(query)
            .sort({ designation: 1 })
            .toArray();

        return {
            done: true,
            data: designations,
            message: designations.length 
                ? "Designations retrieved successfully" 
                : "No designations found matching filters"
        };

    } catch (error) {
        console.error("Error in displayDesignations:", error);
        return {
            done: false,
            error: `Failed to fetch designations: ${error.message}`
        };
    }
};

export const updateDesignation = async (companyId, hrId, payload) => {
    try {
        if (!companyId || !hrId || !payload) {
            return { done: false, error: "Missing required fields" };
        }

        if (!payload?.designationId || !payload?.designationName || !payload?.status) {
            return { done: false, message: "Designation ID, name, and status are required" };
        }

        const collections = getTenantCollections(companyId);
        const hrExists = await collections.hr.countDocuments({ 
            _id: new ObjectId(hrId) 
        });
        if (!hrExists) {
            return { done: false, message: "HR doesn't exist" };
        }

        const designationExists = await collections.designations.countDocuments({ 
            _id: new ObjectId(payload.designationId) 
        });
        if (!designationExists) {
            return { done: false, message: "Designation doesn't exist" };
        }
        
        const result = await collections.designations.updateOne(
            { _id: new ObjectId(payload.designationId) },
            { 
                $set: {
                    designation: payload.designationName,
                    status: payload.status,
                    updatedBy: new ObjectId(hrId),
                } 
            }
        );
        if (result.modifiedCount === 0) {
            return { done: false, message: "No changes made to designation" };
        }
        return {
            done: true,
            message: "Designation updated successfully"
        };
    } catch (error) {
        console.error("Error updating designation:", error);
        return {
            done: false,
            error: "Internal server error",
            systemError: error.message
        };
    }
};