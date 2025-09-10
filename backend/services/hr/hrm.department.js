import mongoose from "mongoose";
import { ObjectId } from "mongodb";
import { getTenantCollections } from "../../config/db.js";

export const allDepartments = async (companyId, hrId) => {
  try {
    if (!companyId || !hrId) {
      return { done: false, error: "All fields are required including file upload" };
    }

    const collections = getTenantCollections(companyId);
    const hrExists = await collections.hr.countDocuments({ userId: hrId });
    if (!hrExists) return { done: false, error: "HR not found" };

    const result = await collections.departments
      .find({}, { projection: { department: 1, _id: 1 } })
      .toArray();

    return {
      done: true,
      data: result,
      message: "Departments fetched successfully"
    };

  } catch (error) {
    return {
      done: false,
      error: `Failed to fetch departments: ${error.message}`
    };
  }
}

export const addDepartment = async (companyId, hrId, payload) => {
  try {

    if (!companyId || !hrId || !payload) {
      return { done: false, error: "Missing required fields" };
    }
    if (!payload.department) {
      return { done: false, message: "Department name are required" };
    }

    const collections = getTenantCollections(companyId);
    const hrExists = await collections.hr.countDocuments({  userId: hrId });
    if (!hrExists) return { done: false, message: "HR doesn't exist" };

    const departmentExists = await collections.departments.countDocuments({
      name: { $regex: `^${payload.department}$`, $options: 'i' }
    });
    if (departmentExists) {
      return { done: false, message: "Department already exists" }
    };

    const newDepartment = {
      department: payload.department,
      status: payload.status || "active",
      createdBy: hrId,
      createdAt: new Date(),
    };

    const result = await collections.departments.insertOne(newDepartment);
    return {
      done: true,
      data: { _id: result.insertedId, ...newDepartment },
      message: "Department added successfully"
    };
  } catch (error) {
    return {
      done: false,
      error: "Internal server error",
    };
  }
};

export const displayDepartment = async (companyId, hrId, filters = {}) => {
  try {
    if (!companyId || !hrId) {
      return { done: false, error: "Missing required fields" };
    }

    const collections = getTenantCollections(companyId);
    const hrExists = await collections.hr.countDocuments({ userId: hrId  });
    if (!hrExists) return { done: false, message: "HR doesn't exist" };

    const query = {};

    if (filters.status && filters.status.toLowerCase() !== "none") {
      query.status = filters.status;
    }

    const pipeline = [
      { $match: query },  
      { $sort: { createdAt: -1 } },  
      {
        $lookup: {
          from: "departments",
          let: { deptId: "$_id" },  
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$_id", { $toObjectId: "$$deptId" }]  
                }
              }
            },
            { $project: { department: 1 } }  
          ],
          as: "departmentInfo"
        }
      },
      { $unwind: "$departmentInfo" }, 
      {
        $lookup: {
          from: "employees",
          let: { departmentId: "$_id" },  
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$departmentId", { $toObjectId: "$$departmentId" }] },  // Convert for comparison
                    { $eq: ["$status", "active"] },
                  ],
                },
              },
            },
          ],
          as: "employees",
        },
      },
      {
        $addFields: {
          employeeCount: { $size: "$employees" },  
          departmentName: "$departmentInfo.department" 
        }
      },

      { $project: { employees: 0 } }, 
    ];

    const departments = await collections.departments.aggregate(pipeline).toArray();
console.log(departments);

    return {
      done: true,
      data: departments,
      message: "Departments retrieved successfully",
    };
  } catch (error) {
    console.log(error);
    
    return {
      done: false,
      error: "Internal server error",
    };
  }
};

export const updateDepartment = async (companyId, hrId, payload) => {
  try {
    if (!companyId || !hrId || !payload?.departmentId || !payload?.department || !payload?.status) {
      return { done: false, message: "Missing required fields" };
    }

    const collections = getTenantCollections(companyId);
    const departmentId = new ObjectId(payload.departmentId);

    const hrExists = await collections.hr.countDocuments({  userId: hrId });
    if (!hrExists) {
      return { done: false, message: "HR doesn't exist" };
    }

    const currentDepartment = await collections.departments.findOne({ _id: departmentId });
    if (!currentDepartment) {
      return { done: false, message: "Department not found" };
    }

    if (payload.status === "inactive" && currentDepartment.status !== "inactive") {
      const pipeline = [
        { $match: { department: currentDepartment.department, status: "active" } },
        { $count: "activeCount" }
      ];
      const [resultAgg] = await collections.employees.aggregate(pipeline).toArray();
      const activeEmployees = resultAgg ? resultAgg.activeCount : 0;
      if (activeEmployees > 0) {
        return {
          done: false,
          message: "Cannot inactivate department with active employees",
          detail: `${activeEmployees} active employees found`
        };
      }
    }

    if (payload.department !== currentDepartment.department) {
      const pipeline = [
        { $match: { department: payload.department, _id: { $ne: departmentId } } },
        { $count: "count" }
      ];
      const [dupDep] = await collections.departments.aggregate(pipeline).toArray();
      if (dupDep && dupDep.count > 0) {
        return { done: false, message: "Department name already exists" };
      }

      await collections.employees.updateMany(
        { department: currentDepartment.department },
        { $set: { department: payload.department } }
      );
    }

    const updateData = {
      department: payload.department,
      status: payload.status,
      updatedBy: hrId,
      updatedAt: new Date(),
    };

    const result = await collections.departments.updateOne(
      { _id: departmentId },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return { done: false, message: "Department not found" };
    }

    return {
      done: true,
      message: "Department updated successfully",
      data: {
        departmentId: payload.departmentId,
        department: payload.department,
        status: payload.status
      }
    };

  } catch (error) {
    return {
      done: false,
      error: "Internal server error",
    };
  }
};

export const deleteDepartment = async (companyId, hrId, departmentId) => {
  try {
    if (!companyId || !hrId || !departmentId) {
      return { done: false, error: "Missing required fields" };
    }

    const collections = getTenantCollections(companyId);
    const departmentObjId = new ObjectId(departmentId);

    const hrExists = await collections.hr.countDocuments({  userId: hrId  });
    if (!hrExists) {
      return { done: false, message: "HR doesn't exist" };
    }

    const department = await collections.departments.findOne({ _id: departmentObjId });
    if (!department) {
      return { done: false, message: "Department not found" };
    }

    const pipeline = [
      { $match: { department: department.department } },
      { $count: "employeeCount" }
    ];
    const [employeeCountResult] = await collections.employees.aggregate(pipeline).toArray();
    const hasEmployees = employeeCountResult ? employeeCountResult.employeeCount : 0;

    if (hasEmployees > 0) {
      return {
        done: false,
        message: "Cannot delete department with assigned employees",
        detail: `${hasEmployees} employees found`
      };
    }

    const result = await collections.departments.deleteOne({ _id: departmentObjId });

    if (result.deletedCount === 0) {
      return { done: false, message: "Department not found" };
    }

    return {
      done: true,
      message: "Department deleted successfully"
    };

  } catch (error) {
    return {
      done: false,
      error: "Internal server error",
    };
  }
};
