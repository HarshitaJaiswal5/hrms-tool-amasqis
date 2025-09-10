import mongoose from "mongoose";
import { ObjectId } from "mongodb";
import { getTenantCollections } from "../../config/db.js";

export const addDesignation = async (companyId, hrId, payload) => {
    try {
        if (!companyId || !hrId || !payload) {
            return { done: false, error: "Missing required parameters" };
        }
        const collections = getTenantCollections(companyId);
        const hrExists = await collections.hr.countDocuments({
             userId: hrId 
        });
        if (!hrExists) return { done: false, error: "HR not found" };
        if (!payload.designation || !payload.departmentId) {
            return { done: false, error: "Designation and department are required" };
        }
        const existingDesignation = await collections.designations.findOne({
            designation: { $regex: `^${payload.designation}$`, $options: "i" },
            departmentId: payload.departmentId,
        });

        if (existingDesignation) {
            console.log("Hello");

            return { done: false, error: "Designation already exists in this department" };
        }

        const result = await collections.designations.insertOne({
            ...payload,
            status: payload.status || 'active',
            createdBy: hrId,
            createdAt: new Date(),
        });

        return {
            done: true,
            data: {
                _id: result.insertedId,
                createdBy: hrId,
            },
            message: "Designation added successfully"
        };
    } catch (error) {
        console.log("Error in addDesignation:", error);
        return {
            done: false,
            error: `Failed to add designation: ${error.message}`
        };
    }
}

export const deleteDesignation = async (companyId, hrId, designationId) => {
    try {
        if (!companyId || !hrId || !designationId) {
            return { done: false, error: "Missing required fields" };
        }

        const collections = getTenantCollections(companyId);
        const designationObjId = new ObjectId(designationId);

        const [hrExists, designation] = await Promise.all([
            collections.hr.countDocuments({  userId: hrId  }),
            collections.designations.findOne({ _id: designationObjId }),
        ]);

        if (!hrExists) {
            return { done: false, error: "HR not found" };
        }

        if (!designation) {
            return { done: false, error: "Designation not found" };
        }

        const employeeCount = await collections.employees.countDocuments({
            designation: designation.designation,
        });

        if (employeeCount > 0) {
            return {
                done: false,
                error: `${employeeCount} employee(s) use '${designation.designation}'`,
            };
        }

        const deleteResult = await collections.designations.deleteOne({ _id: designationObjId });

        if (deleteResult.deletedCount === 0) {
            return { done: false, error: "Failed to delete designation" };
        }

        return {
            done: true,
            data: { deletedDesignation: designation.designation },
            message: `'${designation.designation}' deleted successfully`,
        };
    } catch (error) {
        console.error("Delete designation failed:", error);
        return {
            done: false,
            error: `Operation failed: ${error.message}`,
        };
    }
};

export const displayDesignations = async (companyId, hrId, filters) => {
    try {
        if (!companyId || !hrId) {
            return { done: false, error: "Missing companyId or hrId" };
        }
        
        const collections = getTenantCollections(companyId);
        const hrExists = await collections.hr.countDocuments({  userId: hrId  });
        if (!hrExists) return { done: false, error: "HR not found" };

        const query = {};
        if (filters.status && filters.status !== "all") query.status = filters.status;
        
        // Handle departmentId filtering - works whether stored as String or ObjectId
        if (filters.departmentId) {
            query.departmentId = filters.departmentId;
        }

        console.log("Query from desingation", query);

        console.log("Filters from desingation", filters);

        const pipeline = [
            { $match: query },
            { $sort: { createdAt: -1 } },
            // Convert to ObjectId for consistent joins
            { $addFields: { 
                departmentObjId: { 
                    $cond: {
                        if: { $eq: [{ $type: "$departmentId" }, "string"] },
                        then: { $toObjectId: "$departmentId" },
                        else: "$departmentId"
                    }
                } 
            } },
            {
                $lookup: {
                    from: "employees",
                    let: { designationId: "$_id", departmentId: "$departmentObjId" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$designationId", "$$designationId"] },
                                        { $eq: ["$departmentId", "$$departmentId"] },
                                        { $eq: ["$isActive", true] }
                                    ]
                                }
                            }
                        },
                        { $count: "count" }
                    ],
                    as: "employeeCount"
                }
            },
            {
                $lookup: {
                    from: "departments",
                    localField: "departmentObjId",
                    foreignField: "_id",
                    as: "department"
                }
            },
            {
                $addFields: {
                    employeeCount: { $ifNull: [{ $arrayElemAt: ["$employeeCount.count", 0] }, 0] },
                    department: { $ifNull: [{ $arrayElemAt: ["$department.department", 0] }, "Unknown Department"] }
                }
            },
            {
                $project: {
                    _id: 1,
                    designation: 1,
                    status: 1,
                    departmentId: 1,
                    department: 1,
                    employeeCount: 1,
                    createdAt: 1
                }
            }
        ];

        const designations = await collections.designations.aggregate(pipeline).toArray();

        return {
            done: true,
            data: designations,
            message: designations.length ? "Designations retrieved successfully" : "No designations found matching filters"
        };

    } catch (error) {
        console.error("Error in displayDesignations:", error);
        return { done: false, error: `Failed to fetch designations: ${error.message}` };
    }
};

export const updateDesignation = async (companyId, hrId, payload) => {
    try {

        if (!companyId || !hrId || !payload) {
            return { done: false, error: "Missing required fields" };
        }

        if (!payload?.designationId) {
            return { done: false, error: "Designation ID required" };
        }

        const collections = getTenantCollections(companyId);

        const hrExists = await collections.hr.countDocuments({
             userId: hrId 
        });
        if (!hrExists) {
            return { done: false, error: "HR doesn't exist" };
        }

        const designationExists = await collections.designations.findOne({
            _id: new ObjectId(payload.designationId)
        });
        if (!designationExists) {
            return { done: false, error: "Designation doesn't exist" };
        }

        if (payload.departmentId && 
            payload.departmentId !== designationExists.departmentId.toString()) {
            
            const departmentExists = await collections.departments.countDocuments({
                _id: new ObjectId(payload.departmentId)
            });
            if (!departmentExists) {
                return { done: false, error: "New department doesn't exist" };
            }

            const duplicateExists = await collections.designations.countDocuments({
                _id: { $ne: new ObjectId(payload.designationId) }, 
                departmentId: new ObjectId(payload.departmentId),
                designation: payload.designation
            });

            if (duplicateExists > 0) {
                return { 
                    done: false, 
                    error: "Designation with this name already exists in the selected department" 
                };
            }
        } else if (payload.designation && 
                  payload.designation !== designationExists.designation) {

            const duplicateExists = await collections.designations.countDocuments({
                _id: { $ne: new ObjectId(payload.designationId) },
                departmentId: designationExists.departmentId,
                designation: payload.designation
            });

            if (duplicateExists > 0) {
                return { 
                    done: false, 
                    error: "Designation with this name already exists in the department" 
                };
            }
        }

        const result = await collections.designations.updateOne(
            { _id: new ObjectId(payload.designationId) },
            {
                $set: {
                    designation: payload.designation || designationExists.designation,
                    departmentId: payload.departmentId ? 
                        new ObjectId(payload.departmentId) : 
                        designationExists.departmentId,
                    status: payload.status || designationExists.status,
                    updatedBy: hrId,
                    updatedAt: new Date()
                }
            }
        );

        if (result.modifiedCount === 0) {
            return { done: false, error: "No changes made to designation" };
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