import bcrypt from 'bcrypt';
import { ObjectId } from "mongodb";
import { generateId } from '../../utils/generateId.js';
import { getTenantCollections } from "../../config/db.js";
import { maskAccountNumber } from "../../utils/maskAccNo.js"

export const getEmployeesStats = async (companyId, hrId, filters = {}) => {
  try {
    const collections = getTenantCollections(companyId);
    const hrCount = await collections.hr.countDocuments({
      userId: hrId,
    });

    if (hrCount === 0) {
      console.warn("HR not found in specified company");
      return { done: false, error: "HR not found in the specified company" };
    }

    let start, end;
    if (filters.startDate) {
      start = new Date(filters.startDate);
      start.setUTCHours(0, 0, 0, 0);
    }
    if (filters.endDate) {
      end = new Date(filters.endDate);
      end.setUTCHours(23, 59, 59, 999);
    }

    const baseMatch = {};
    if (filters.status && ["active", "inactive", "Active", "Inactive"].includes(filters.status)) {
      baseMatch.status = filters.status;
    }
    if (filters.departmentId && typeof filters.departmentId === "string") {
      baseMatch.departmentId = filters.departmentId;
    }

    // Create aggregation pipeline
    const pipeline = [
      {
        $addFields: {
          dateOfJoining: { $toDate: "$dateOfJoining" }
        }
      },
      {
        $match: {
          ...baseMatch,
          ...(start || end
            ? {
              dateOfJoining: {
                ...(start ? { $gte: start } : {}),
                ...(end ? { $lte: end } : {})
              }
            }
            : {})
        }
      },
      {
        $lookup: {
          from: "designations",
          localField: "designation",
          foreignField: "_id",
          as: "designationInfo",
        }
      },
      {
        $lookup: {
          from: "departments",
          localField: "department",
          foreignField: "_id",
          as: "departmentInfo",
        }
      },
      {
        $addFields: {
          designationName: { $arrayElemAt: ["$designationInfo.name", 0] },
          departmentName: { $arrayElemAt: ["$departmentInfo.name", 0] },
        }
      },
      {
        $lookup: {
          from: "permissions",
          localField: "_id",
          foreignField: "employeeId",
          as: "permissionsInfo"
        }
      },
      {
        $addFields: {
          employeeRecord: "$$ROOT"  // Wrap entire document
        }
      },
      {
        $project: {
          employeeRecord: 1,
          permissionsInfo: 1
        }
      }
    ];

    // Get employees with populated names
    let employees = await collections.employees.aggregate(pipeline).toArray();

    employees = employees.map(emp => {
      const { permissionsInfo, ...rest } = emp.employeeRecord;  // destructure to exclude old permissionInfo
      const effectivePermissionsInfo = emp.permissionsInfo.length === 1 ? emp.permissionsInfo[0] : emp.permissionsInfo

      return {
        ...rest,
        enabledModules: effectivePermissionsInfo.enabledModules,
        permissions: effectivePermissionsInfo.permissions,
      };
    });

    // Get counts (not filtered — global stats)
    const [
      totalEmployees,
      activeCount,
      inactiveCount,
      newJoinersCount,
    ] = await Promise.all([
      collections.employees.countDocuments({}),
      collections.employees.countDocuments({ status: { $in: ["Active", "active"] } }),
      collections.employees.countDocuments({ status: { $in: ["Inactive", "inactive"] } }),
      collections.employees.countDocuments({
        dateOfJoining: {
          $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    return {
      done: true,
      message: "Employee details updated successfully",
      data: {
        stats: {
          totalEmployees,
          activeCount,
          inactiveCount,
          newJoinersCount,
        },
        employees,
      }
    };
  } catch (error) {
    console.error("❌ Error in getEmployeesWithStats:", error);
    return {
      done: false,
      error: `Failed to get employee stats: ${error.message}`,
    };
  }
};

export const getEmployeeGridsStats = async (companyId, hrId, filters) => {
  try {
    const collections = getTenantCollections(companyId);

    // Validate HR
    const hrCount = await collections.hr.countDocuments({
      userId: hrId,
    });
    if (hrCount === 0) {
      console.warn("HR not found in specified company");
      return { done: false, error: "HR not found in the specified company" };
    }

    // Date filters
    let start, end;
    if (filters.startDate) {
      start = new Date(filters.startDate);
      start.setUTCHours(0, 0, 0, 0);
    }
    if (filters.endDate) {
      end = new Date(filters.endDate);
      end.setUTCHours(23, 59, 59, 999);
    }

    // Query match construction
    const baseMatch = {};
    if (filters.status && ["active", "inactive"].includes(filters.status)) {
      baseMatch.status = filters.status;
    }
    if (filters.designationId && typeof filters.designationId === "string") {
      baseMatch.designationId = filters.designationId;
    }

    // Faceted aggregation pipeline
    const pipeline = [
      {
        $facet: {
          employees: [
            {
              $addFields: {
                dateOfJoining: { $toDate: "$dateOfJoining" }
              }
            },
            {
              $match: {
                ...baseMatch,
                ...(start || end
                  ? {
                    dateOfJoining: {
                      ...(start ? { $gte: start } : {}),
                      ...(end ? { $lte: end } : {})
                    }
                  }
                  : {})
              }
            },
            {
              $lookup: {
                from: "designations",
                localField: "designation",
                foreignField: "_id",
                as: "designationInfo"
              }
            },
            {
              $lookup: {
                from: "departments",
                localField: "department",
                foreignField: "_id",
                as: "departmentInfo"
              }
            },
            {
              $addFields: {
                designationName: { $arrayElemAt: ["$designationInfo.name", 0] },
                departmentName: { $arrayElemAt: ["$departmentInfo.name", 0] },
              }
            },
            {
              $lookup: {
                from: "permissions",
                localField: "_id",
                foreignField: "employeeId",
                as: "permissionsInfo"
              }
            },
            {
              $lookup: {
                from: "projects",
                let: { employeeIdStr: { $toString: "$_id" } },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $in: [
                          "$$employeeIdStr",
                          { $ifNull: ["$empMembers", []] }
                        ]
                      }
                    }
                  },
                  {
                    $group: {
                      _id: null,
                      totalProjects: { $sum: 1 },
                      completedProjects: {
                        $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
                      }
                    }
                  }
                ],
                as: "projectStats"
              }
            },
            {
              $addFields: {
                totalProjects: { $ifNull: [{ $arrayElemAt: ["$projectStats.totalProjects", 0] }, 0] },
                completedProjects: { $ifNull: [{ $arrayElemAt: ["$projectStats.completedProjects", 0] }, 0] },
                productivity: {
                  $cond: [
                    { $eq: [{ $arrayElemAt: ["$projectStats.totalProjects", 0] }, 0] },
                    0,
                    {
                      $multiply: [
                        {
                          $divide: [
                            { $arrayElemAt: ["$projectStats.completedProjects", 0] },
                            { $arrayElemAt: ["$projectStats.totalProjects", 0] }
                          ]
                        },
                        100
                      ]
                    }
                  ]
                }
              }
            },
            {
              $addFields: { employeeRecord: "$$ROOT" }
            },
            {
              $project: {
                employeeRecord: 1,
                totalProjects: 1,
                completedProjects: 1,
                productivity: 1
              }
            }
          ],
          stats: [
            {
              $group: {
                _id: null,
                totalEmployees: { $sum: 1 },
                activeCount: {
                  $sum: {
                    $cond: [{ $eq: [{ $toLower: "$status" }, "active"] }, 1, 0]
                  }
                },
                inactiveCount: {
                  $sum: {
                    $cond: [{ $eq: [{ $toLower: "$status" }, "inactive"] }, 1, 0]
                  }
                },
                newJoinersCount: {
                  $sum: {
                    $cond: [
                      { $gte: ["$dateOfJoining", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)] },
                      1,
                      0
                    ]
                  }
                }
              }
            }
          ]
        }
      }
    ];

    // Aggregation execution
    const result = await collections.employees.aggregate(pipeline).toArray();
    const employeesRaw = result[0].employees;

    // Flatten and format employee records
    const employees = employeesRaw.map(emp => {
      const { permissionsInfo, ...rest } = emp.employeeRecord;
      const effectivePermissionsInfo = Array.isArray(emp.employeeRecord.permissionsInfo) && emp.employeeRecord.permissionsInfo.length === 1
        ? emp.employeeRecord.permissionsInfo[0]
        : emp.employeeRecord.permissionsInfo;

      return {
        ...rest,
        enabledModules: effectivePermissionsInfo?.enabledModules || {},
        permissions: effectivePermissionsInfo?.permissions || {},
        totalProjects: emp.totalProjects,
        completedProjects: emp.completedProjects,
        productivity: emp.productivity,
      };
    });

    // Extract global stats
    const statsObj = (result[0].stats && result[0].stats[0])
      ? result[0].stats[0]
      : { totalEmployees: 0, activeCount: 0, inactiveCount: 0, newJoinersCount: 0 };

    return {
      done: true,
      message: "Employee details updated successfully",
      data: {
        stats: statsObj,
        employees,
      }
    };
  } catch (error) {
    console.error("Error in getEmployeeGridsStats:", error);
    return {
      done: false,
      error: `Failed to get employee stats: ${error.message}`,
    };
  }
};

export const updateEmployeeDetails = async (companyId, hrId, payload) => {
  try {
    if (!companyId || !hrId) {
      return { done: false, error: "Missing required parameters" };
    }
    const collections = getTenantCollections(companyId);
    const hrCount = await collections.hr.countDocuments({
      userId: hrId
    });

    if (hrCount !== 1) {
      return { done: false, error: "HR not found in the company" };
    }

    if (!payload?.employeeId) {
      return { done: false, error: "Employee ID is required" };
    }

    // Remove _id from updateData if present
    const { employeeId, ...updateData } = payload;

    // Optionally, add updatedAt field
    updateData.updatedAt = new Date();

    const result = await collections.employees.updateOne(
      { employeeId: employeeId },
      { $set: updateData }
    );

    if (result.modifiedCount === 0) {
      return {
        done: false,
        error: "No changes made - employee not found or data identical"
      };
    }

    return {
      done: true,
      message: "Employee details updated successfully",
      data: {
        employeeId,
        ...updateData
      }
    };

  } catch (error) {
    console.error("Error in updateEmployeeDetails:", error);
    return {
      done: false,
      error: `Failed to update employee details: ${error.message}`
    };
  }
};

export const getPermissions = async (companyId, hrId, employeeId) => {
  try {
    if (!companyId || !hrId || !employeeId) {
      return { done: false, error: "Missing required parameters" };
    }

    const collections = getTenantCollections(companyId);
    const hrCount = await collections.hr.countDocuments({
      _id: new ObjectId(hrId)
    });
    if (hrCount !== 1) {
      return { done: false, error: "HR not found in the company" };
    }

    const empCount = await collections.employees.countDocuments({
      _id: new ObjectId(employeeId)
    });
    if (empCount !== 1) {
      return { done: false, error: "Employee not found in the company" };
    }

    const permission = await collections.permissions.findOne({
      employeeId: new ObjectId(employeeId),
    });

    if (!permission) {
      return {
        done: true,
        data: {
          enableAllModules: false,
          modules: {
            holidays: { read: false, write: false, create: false, delete: false, import: false, export: false },
            leaves: { read: false, write: false, create: false, delete: false, import: false, export: false },
            clients: { read: false, write: false, create: false, delete: false, import: false, export: false },
            projects: { read: false, write: false, create: false, delete: false, import: false, export: false },
            tasks: { read: false, write: false, create: false, delete: false, import: false, export: false },
            chats: { read: false, write: false, create: false, delete: false, import: false, export: false },
            assets: { read: false, write: false, create: false, delete: false, import: false, export: false },
            timingSheets: { read: false, write: false, create: false, delete: false, import: false, export: false }
          }
        }
      };
    }

    return {
      done: true,
      data: {
        enableAllModules: permission.enableAllModules || false,
        modules: {
          holidays: permission.modules?.holidays || { read: false, write: false, create: false, delete: false, import: false, export: false },
          leaves: permission.modules?.leaves || { read: false, write: false, create: false, delete: false, import: false, export: false },
          clients: permission.modules?.clients || { read: false, write: false, create: false, delete: false, import: false, export: false },
          projects: permission.modules?.projects || { read: false, write: false, create: false, delete: false, import: false, export: false },
          tasks: permission.modules?.tasks || { read: false, write: false, create: false, delete: false, import: false, export: false },
          chats: permission.modules?.chats || { read: false, write: false, create: false, delete: false, import: false, export: false },
          assets: permission.modules?.assets || { read: false, write: false, create: false, delete: false, import: false, export: false },
          timingSheets: permission.modules?.timingSheets || { read: false, write: false, create: false, delete: false, import: false, export: false }
        }
      }
    };

  } catch (error) {
    console.error("Error in getPermissions:", error);
    return {
      done: false,
      error: `Failed to get employee permissions: ${error.message}`
    };
  }
};

export const updatePermissions = async (companyId, hrId, employeeId, payload) => {
  try {
    if (!companyId || !hrId || !employeeId) {
      return { done: false, error: "Missing required parameters" };
    }

    const collections = getTenantCollections(companyId);
    const hrCount = await collections.hr.countDocuments({
      _id: new ObjectId(hrId)
    });
    if (hrCount !== 1) {
      return { done: false, error: "HR not found in the company" };
    }

    const empCount = await collections.employees.countDocuments({
      _id: new ObjectId(employeeId)
    });
    if (empCount !== 1) {
      return { done: false, error: "Employee not found in the company" };
    }

    const safePayload = payload || {};
    const updateData = {
      enabledModules: safePayload.enabledModules ?? false,
      permissions: {
        holidays: safePayload.permissions?.holidays ?? { read: false, write: false, create: false, delete: false, import: false, export: false },
        leaves: safePayload.permissions?.leaves ?? { read: false, write: false, create: false, delete: false, import: false, export: false },
        clients: safePayload.permissions?.clients ?? { read: false, write: false, create: false, delete: false, import: false, export: false },
        projects: safePayload.permissions?.projects ?? { read: false, write: false, create: false, delete: false, import: false, export: false },
        tasks: safePayload.permissions?.tasks ?? { read: false, write: false, create: false, delete: false, import: false, export: false },
        chats: safePayload.permissions?.chats ?? { read: false, write: false, create: false, delete: false, import: false, export: false },
        assets: safePayload.permissions?.assets ?? { read: false, write: false, create: false, delete: false, import: false, export: false },
        timingSheets: safePayload.permissions?.timingSheets ?? { read: false, write: false, create: false, delete: false, import: false, export: false }
      },
      updatedAt: new Date()
    };

    updateData.updatedBy = new ObjectId(hrId);

    const result = await collections.permissions.updateOne(
      {
        employeeId: new ObjectId(employeeId),
      },
      { $set: updateData },
    );

    return {
      done: true,
      data: updateData,
      message: "Permissions updated successfully"
    };

  } catch (error) {
    console.error("Error in updatePermissions:", error);
    return {
      done: false,
      error: `Failed to update permissions: ${error.message}`
    };
  }
};

export const deleteEmployee = async (companyId, hrId, employeeId) => {
  try {
    if (!companyId || !hrId || !employeeId) {
      return { done: false, error: "Missing required parameters" };
    }

    const collections = getTenantCollections(companyId);

    const [hrExists, empExists] = await Promise.all([
      collections.hr.countDocuments({ userId: hrId }),
      collections.employees.countDocuments({ _id: new ObjectId(employeeId) })
    ]);

    if (!hrExists) return { done: false, error: "HR not found" };
    if (!empExists) return { done: false, error: "Employee not found" };

    const [employeeDelete, permissionsDelete] = await Promise.all([
      collections.employees.deleteOne({ _id: new ObjectId(employeeId) }),
      collections.permissions.deleteMany({ employeeId: new ObjectId(employeeId) })
    ]);

    if (!employeeDelete.deletedCount) {
      return { done: false, error: "Failed to delete employee" };
    }

    return {
      done: true,
      message: "Employee deleted successfully",
      data: {
        employeeDeleted: employeeDelete.deletedCount,
        permissionsDeleted: permissionsDelete.deletedCount
      }
    };

  } catch (error) {
    console.error("Delete failed:", error.message);
    return {
      done: false,
      error: error.message.includes('not found')
        ? error.message
        : "Failed to delete employee"
    };
  }
};

export const addEmployee = async (companyId, hrId, employeeData, permissionsData) => {
  try {
    if (!companyId || !hrId) {
      return { done: false, error: "Missing companyId or hrId." };
    }

    // Validate required top-level fields
    // const requiredFields = [
    //   "account", "firstName", "lastName", "companyName", "departmentId", "designationId", "dateOfJoining"
    // ];
    // const missingFields = requiredFields.filter(
    //   field => !employeeData[field] && employeeData[field] !== 0
    // );

    // // Validate required nested fields
    // if (!employeeData.account?.userName) missingFields.push("account.userName");
    // if (!employeeData.account?.password) missingFields.push("account.password");
    // if (!employeeData.contact?.phone) missingFields.push("contact.phone");
    // if (!employeeData.contact?.email) missingFields.push("contact.email");

    // if (missingFields.length > 0) {
    //   return { done: false, error: `Missing required fields: ${missingFields.join(", ")}` };
    // }

    // Validate permissions data
    // const hasProperPermissionsData =
    //   permissionsData &&
    //   typeof permissionsData === "object" &&
    //   permissionsData.enabledModules &&
    //   permissionsData.permissions &&
    //   Object.keys(permissionsData.enabledModules).length > 0 &&
    //   Object.keys(permissionsData.permissions).length > 0;

    // if (!hasProperPermissionsData) {
    //   return { done: false, error: "Missing or incomplete permissions data." };
    // }

    const collections = getTenantCollections(companyId);

    // Check HR exists
    const hrExists = await collections.hr.countDocuments({ userId: hrId });
    if (!hrExists) {
      return { done: false, error: "HR not found." };
    }

    // Check email and phone number uniqueness (nested in contact)
    const exists = await collections.employees.countDocuments({
      $or: [
        { "contact.email": employeeData.contact.email },
        { "contact.phone": employeeData.contact.phone }
      ]
    });

    if (exists) {
      return { done: false, error: "Employee email or phone number already exists." };
    }


    // Hash password (nested in account)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(employeeData.account.password, saltRounds);

    // Prepare employee data for insertion
    const employeeToInsert = {
      ...employeeData,
      account: {
        ...employeeData.account,
        password: hashedPassword
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: hrId,
      status: "active"
    };

    const employeeResult = await collections.employees.insertOne(employeeToInsert);

    if (!employeeResult.insertedId) {
      return { done: false, error: "Failed to add employee." };
    }

    const employeeId = employeeResult.insertedId;

    // Insert permissions
    const permissionsResult = await collections.permissions.insertOne({
      employeeId,
      enabledModules: permissionsData.enabledModules,
      permissions: permissionsData.permissions,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    if (!permissionsResult.insertedId) {
      await collections.employees.deleteOne({ _id: employeeId });
      return { done: false, error: "Failed to save permissions." };
    }

    return {
      done: true,
      data: { employeeId: employeeId.toString() },
      message: "Employee and permissions added successfully"
    };
  } catch (error) {
    const errorMsg = error.message && error.message.includes("duplicate key")
      ? "Employee with same details already exists"
      : "Failed to add employee";
    return { done: false, error: errorMsg };
  }
}

export const getEmployeeProjectsStats = async (companyId, hrId, employeeId) => {
  try {
    if (!companyId || !hrId || !employeeId) {
      return { done: false, error: "Missing required parameters" };
    }

    const collections = getTenantCollections(companyId);

    const [hrExists, empExists] = await Promise.all([
      collections.hr.countDocuments({ _id: new ObjectId(hrId) }),
      collections.employees.countDocuments({ _id: new ObjectId(employeeId) })
    ]);

    if (!hrExists) return { done: false, error: "HR not found" };
    if (!empExists) return { done: false, error: "Employee not found" };

    const [result] = await collections.projects.aggregate([
      {
        $match: {
          employeeId: new ObjectId(employeeId),
        }
      },
      {
        $facet: {
          total: [{ $count: "count" }],
          completed: [
            { $match: { status: "completed" } },
            { $count: "count" }
          ],
          cancelled: [
            { $match: { status: "cancelled" } },
            { $count: "count" }
          ]
        }
      },
      {
        $project: {
          total: { $ifNull: [{ $arrayElemAt: ["$total.count", 0] }, 0] },
          completed: { $ifNull: [{ $arrayElemAt: ["$completed.count", 0] }, 0] },
          cancelled: { $ifNull: [{ $arrayElemAt: ["$cancelled.count", 0] }, 0] },
          inProgress: {
            $subtract: [
              { $ifNull: [{ $arrayElemAt: ["$total.count", 0] }, 0] },
              {
                $add: [
                  { $ifNull: [{ $arrayElemAt: ["$completed.count", 0] }, 0] },
                  { $ifNull: [{ $arrayElemAt: ["$cancelled.count", 0] }, 0] }
                ]
              }
            ]
          }
        }
      }
    ]).toArray();

    const total = result?.total || 0;
    const completed = result?.completed || 0;
    const productivityPercent = total > 0 ? (completed / total) * 100 : 0;

    return {
      done: true,
      data: {
        totalProjects: total,
        completedProjects: completed,
        cancelledProjects: result?.cancelled || 0,
        inProgressProjects: result?.inProgress || 0,
        productivity: Math.round(productivityPercent * 100) / 100 // Round to 2 decimal places       
      }
    };

  } catch (error) {
    console.error("Error in getEmployeeProjectsStats:", error);
    return {
      done: false,
      error: `Failed to get employee projects stats: ${error.message}`
    };
  }
};

///////
export const getBankStatutory = async (companyId, hrId, employeeId) => {
  const session = client.startSession();
  try {
    session.startTransaction();

    if (!companyId || !hrId || !employeeId) {
      await session.abortTransaction();
      return { done: false, error: "Missing required parameters" };
    }

    const collections = getTenantCollections(companyId);
    const employeeObjId = new ObjectId(employeeId);

    const [hrExists, employee] = await Promise.all([
      collections.hr.countDocuments({ _id: new ObjectId(hrId) }, { session }),
      collections.employees.findOne(
        { _id: employeeObjId },
        {
          '+salaryInformation': 1,
          '+pfInformation': 1,
          '+esiInformation': 1,
          updatedBy: 1,
          updatedAt: 1
        },
        { session }
      )
    ]);

    if (!hrExists || !employee) {
      await session.abortTransaction();
      return {
        done: false,
        error: !hrExists ? "HR not found" : "Employee not found"
      };
    }

    await session.commitTransaction();
    return {
      done: true,
      data: {
        salary: employee.salaryInformation || null,
        pf: employee.pfInformation || null,
        esi: employee.esiInformation || null,
        lastUpdated: {
          by: employee.updatedBy,
          at: employee.updatedAt
        }
      }
    };

  } catch (error) {
    await session.abortTransaction();
    console.error("Bank/statutory fetch error:", error);
    return {
      done: false,
      error: "Internal server error",
    };
  } finally {
    session.endSession();
  }
};

export const getFamilyInfo = async (companyId, hrId, employeeId) => {
  const session = client.startSession();
  try {
    session.startTransaction();

    if (!companyId || !hrId || !employeeId) {
      await session.abortTransaction();
      return { done: false, error: "Missing required parameters" };
    }

    const collections = getTenantCollections(companyId);
    const employeeObjId = new ObjectId(employeeId);

    const [hrExists, employee] = await Promise.all([
      collections.hr.countDocuments({ _id: new ObjectId(hrId) }, { session }),
      collections.employees.findOne(
        { _id: employeeObjId },
        {
          '+family': 1,
          updatedBy: 1,
          updatedAt: 1
        },
        { session }
      )
    ]);

    if (!hrExists || !employee) {
      await session.abortTransaction();
      return {
        done: false,
        error: !hrExists ? "HR not found" : "Employee not found"
      };
    }

    await session.commitTransaction();

    return {
      done: true,
      data: {
        familyInfo: employee.family || null,
        lastUpdated: {
          by: employee.updatedBy,
          at: employee.updatedAt
        }
      }
    };

  } catch (error) {
    await session.abortTransaction();
    return {
      done: false,
      error: "Internal server error",
      systemError: process.env.NODE_ENV === 'development' ? error.message : undefined
    };
  } finally {
    session.endSession();
  }
};

export const getExperienceInfo = async (companyId, hrId, employeeId) => {
  const session = client.startSession();
  try {
    session.startTransaction();

    if (!companyId || !hrId || !employeeId) {
      await session.abortTransaction();
      return { done: false, error: "Missing required parameters" };
    }

    const collections = getTenantCollections(companyId);
    const employeeObjId = new ObjectId(employeeId);

    const [hrExists, employee] = await Promise.all([
      collections.hr.countDocuments({ _id: new ObjectId(hrId) }, { session }),
      collections.employees.findOne(
        { _id: employeeObjId },
        {
          '+experience': 1,
          updatedBy: 1,
          updatedAt: 1
        },
        { session }
      )
    ]);

    if (!hrExists || !employee) {
      await session.abortTransaction();
      return {
        done: false,
        error: !hrExists ? "HR not found" : "Employee not found"
      };
    }

    await session.commitTransaction();

    return {
      done: true,
      data: {
        experience: employee.experience || [],
        lastUpdated: {
          by: employee.updatedBy,
          at: employee.updatedAt
        }
      }
    };

  } catch (error) {
    await session.abortTransaction();
    return {
      done: false,
      error: "Internal server error",
      systemError: process.env.NODE_ENV === 'development' ? error.message : undefined
    };
  } finally {
    session.endSession();
  }
};
/////////////

export const updateFamilyInfo = async (companyId, hrId, payload) => {
  const session = client.startSession();
  try {
    session.startTransaction();

    if (!companyId || !hrId || !payload?.employeeId || !payload?.familyInfo) {
      await session.abortTransaction();
      return { done: false, error: "Missing required parameters" };
    }

    const collections = getTenantCollections(companyId);
    const employeeObjId = new ObjectId(payload.employeeId);

    const [hrExists, empExists] = await Promise.all([
      collections.hr.countDocuments({ _id: new ObjectId(hrId) }, { session }),
      collections.employees.countDocuments({ _id: employeeObjId }, { session })
    ]);

    if (!hrExists || !empExists) {
      await session.abortTransaction();
      return {
        done: false,
        error: !hrExists ? "HR not found" : "Employee not found"
      };
    }

    const updateData = {
      family: {
        name: payload.familyInfo.name,
        relationship: payload.familyInfo.relationship,
        phone: payload.familyInfo.phone,
        passportExpiry: payload.familyInfo.passportExpiry,
        updatedBy: new ObjectId(hrId),
      },
      updatedBy: new ObjectId(hrId)
    };

    const result = await collections.employees.updateOne(
      { _id: employeeObjId },
      { $set: updateData },
      { session }
    );

    if (result.matchedCount === 0) {
      await session.abortTransaction();
      return { done: false, error: "Update failed - employee not found" };
    }

    await session.commitTransaction();
    return {
      done: true,
      message: "Family information updated successfully",
      updatedFields: {
        familyInfo: payload.familyInfo,
        updatedAt: new Date()
      }
    };

  } catch (error) {
    await session.abortTransaction();
    return {
      done: false,
      error: "Internal server error",
    };
  } finally {
    session.endSession();
  }
};

export const updateBankStatutory = async (companyId, hrId, payload = {}) => {
  const session = client.startSession();
  try {
    session.startTransaction();

    if (!companyId || !hrId || !payload) {
      await session.abortTransaction();
      return { done: false, error: "Missing required parameters" };
    }

    const collections = getTenantCollections(companyId);
    const employeeObjId = new ObjectId(payload?.employeeId);

    const [hrExists, empExists] = await Promise.all([
      collections.hr.countDocuments({ _id: new ObjectId(hrId) }, { session }),
      collections.employees.countDocuments({ _id: employeeObjId }, { session })
    ]);

    if (!hrExists || !empExists) {
      await session.abortTransaction();
      return {
        done: false,
        error: !hrExists ? "HR not found" : "Employee not found"
      };
    }

    const updateData = {
      updatedBy: new ObjectId(hrId),
    };

    // Salary information update
    if (payload.salary) {
      updateData.salaryInformation = {
        basisType: payload.salary.basisType,
        amount: payload.salary.amount,
        paymentType: payload.salary.paymentType,
        updatedBy: new ObjectId(hrId),
      };
    }

    // PF information update
    if (payload.pf) {
      updateData.pfInformation = {
        pfContribution: payload.pf.pfContribution,
        pfNo: payload.pf.pfNo,
        pfRate: payload.pf.pfRate,
        additionalRate: payload.pf.additionalRate,
        totalRate: payload.pf.totalRate,
        updatedBy: new ObjectId(hrId),
      };
    }

    // ESI information update
    if (payload.esi) {
      updateData.esiInformation = {
        esiContribution: payload.esi.esiContribution,
        esiNo: payload.esi.esiNo,
        esiRate: payload.esi.esiRate,
        additionalRate: payload.esi.additionalRate,
        totalRate: payload.esi.totalRate,
        updatedBy: new ObjectId(hrId),
      };
    }

    const result = await collections.employees.updateOne(
      { _id: employeeObjId },
      { $set: updateData },
      { session }
    );

    if (result.matchedCount === 0) {
      await session.abortTransaction();
      return { done: false, error: "Update failed - employee not found" };
    }

    await session.commitTransaction();
    return {
      done: true,
      message: "Bank and statutory information updated successfully",
      updatedFields: Object.keys(updateData).filter(key => !['updatedBy', 'updatedAt'].includes(key))
    };

  } catch (error) {
    await session.abortTransaction();
    console.error("Bank/statutory update error:", error);
    return {
      done: false,
      error: "Internal server error",
    };
  } finally {
    session.endSession();
  }
};

export const updateBankDetails = async (companyId, hrId, payload = {}) => {
  const session = client.startSession();
  try {
    session.startTransaction();

    if (!companyId || !hrId || !payload?.employeeId || !payload?.bankDetails) {
      await session.abortTransaction();
      return { done: false, error: "Missing required parameters" };
    }

    const collections = getTenantCollections(companyId);
    const employeeObjId = new ObjectId(payload.employeeId);

    const [hrExists, empExists] = await Promise.all([
      collections.hr.countDocuments({ _id: new ObjectId(hrId) }, { session }),
      collections.employees.countDocuments({ _id: employeeObjId }, { session })
    ]);

    if (!hrExists || !empExists) {
      await session.abortTransaction();
      return {
        done: false,
        error: !hrExists ? "HR not found" : "Employee not found"
      };
    }

    // Prepare bank details update with audit trail
    const updateData = {
      bank: {
        accountNumber: payload.bankDetails.accountNumber,
        bankName: payload.bankDetails.bankName,
        branchAddress: payload.bankDetails.branchAddress,
        ifsc: payload.bankDetails.ifscCode,
        updatedBy: new ObjectId(hrId)
      },
      updatedBy: new ObjectId(hrId)
    };

    const result = await collections.employees.updateOne(
      { _id: employeeObjId },
      { $set: updateData },
      { session }
    );

    if (result.matchedCount === 0) {
      await session.abortTransaction();
      return { done: false, error: "Update failed - employee not found" };
    }

    await session.commitTransaction();
    return {
      done: true,
      message: "Bank details updated successfully",
      updatedAt: new Date()
    }
  } catch (error) {
    await session.abortTransaction();
    console.error("Bank details update error:", error);
    return {
      done: false,
      error: "Internal server error",
    };
  } finally {
    session.endSession();
  }
};

export const updateExperience = async (companyId, hrId, payload = {}) => {
  const session = client.startSession();
  try {
    session.startTransaction();

    if (!companyId || !hrId || !payload?.employeeId || !payload?.experienceDetails) {
      await session.abortTransaction();
      return { done: false, error: "Missing required parameters" };
    }

    const collections = getTenantCollections(companyId);
    const employeeObjId = new ObjectId(payload.employeeId);

    const [hrExists, empExists] = await Promise.all([
      collections.hr.countDocuments({ _id: new ObjectId(hrId) }, { session }),
      collections.employees.countDocuments({ _id: employeeObjId }, { session })
    ]);

    if (!hrExists || !empExists) {
      await session.abortTransaction();
      return {
        done: false,
        error: !hrExists ? "HR not found" : "Employee not found"
      };
    }

    const updateData = {
      experience: {
        previousCompany: payload.experienceDetails.companyName,
        designation: payload.experienceDetails.designation,
        startDate: payload.experienceDetails.startDate,
        endDate: payload.experienceDetails.endDate,
        currentlyWorking: payload.experienceDetails.currentlyWorking,
        updatedBy: new ObjectId(hrId)
      },
      updatedBy: new ObjectId(hrId)
    };

    const result = await collections.employees.updateOne(
      { _id: employeeObjId },
      { $set: updateData },
      { session }
    );

    if (result.matchedCount === 0) {
      await session.abortTransaction();
      return { done: false, error: "Update failed - employee not found" };
    }

    await session.commitTransaction();
    return {
      done: true,
      message: "Experience details updated successfully",
      updatedAt: new Date()
    }
  } catch (error) {
    await session.abortTransaction();
    console.error("Experience details update error:", error);
    return {
      done: false,
      error: "Internal server error",
    };
  } finally {
    session.endSession();
  }
};

export const updateEducation = async (companyId, hrId, payload = {}) => {
  const session = client.startSession();
  try {
    session.startTransaction();

    if (!companyId || !hrId || !payload?.employeeId || !payload?.educationDetails) {
      await session.abortTransaction();
      return { done: false, error: "Missing required parameters" };
    }

    const collections = getTenantCollections(companyId);
    const employeeObjId = new ObjectId(payload.employeeId);

    const [hrExists, empExists] = await Promise.all([
      collections.hr.countDocuments({ _id: new ObjectId(hrId) }, { session }),
      collections.employees.countDocuments({ _id: employeeObjId }, { session })
    ]);

    if (!hrExists || !empExists) {
      await session.abortTransaction();
      return {
        done: false,
        error: !hrExists ? "HR not found" : "Employee not found"
      };
    }

    // Prepare education details update with audit trail
    const updateData = {
      education: {
        institution: payload.educationDetails.institution,
        course: payload.educationDetails.course,
        startDate: payload.educationDetails.startDate,
        endDate: payload.educationDetails.endDate,
        updatedBy: new ObjectId(hrId)
      },
      updatedBy: new ObjectId(hrId)
    };

    const result = await collections.employees.updateOne(
      { _id: employeeObjId },
      { $set: updateData },
      { session }
    );

    if (result.matchedCount === 0) {
      await session.abortTransaction();
      return { done: false, error: "Update failed - employee not found" };
    }

    await session.commitTransaction();
    return {
      done: true,
      message: "Education details updated successfully",
      updatedAt: new Date()
    };
  } catch (error) {
    await session.abortTransaction();
    console.error("Education details update error:", error);
    return {
      done: false,
      error: "Internal server error",
    };
  } finally {
    session.endSession();
  }
};

export const updateEmergencyContacts = async (companyId, hrId, payload = {}) => {
  const session = client.startSession();
  try {
    session.startTransaction();

    if (!companyId || !hrId || !payload?.employeeId || !payload?.emergencyContacts) {
      await session.abortTransaction();
      return { done: false, error: "Missing required parameters" };
    }

    if (!Array.isArray(payload.emergencyContacts) || payload.emergencyContacts.length === 0) {
      await session.abortTransaction();
      return { done: false, error: "At least one emergency contact is required" };
    }

    const collections = getTenantCollections(companyId);
    const employeeObjId = new ObjectId(payload.employeeId);

    const [hrExists, empExists] = await Promise.all([
      collections.hr.countDocuments({ _id: new ObjectId(hrId) }, { session }),
      collections.employees.countDocuments({ _id: employeeObjId }, { session })
    ]);

    if (!hrExists || !empExists) {
      await session.abortTransaction();
      return {
        done: false,
        error: !hrExists ? "HR not found" : "Employee not found"
      };
    }

    const updateData = {
      emergencyContacts: payload.emergencyContacts.map(contact => ({
        name: contact.name,
        relationship: contact.relationship,
        phone: Array.isArray(contact.phone) ? contact.phone : [contact.phone],
        updatedBy: new ObjectId(hrId)
      })),
      updatedBy: new ObjectId(hrId)
    };

    const result = await collections.employees.updateOne(
      { _id: employeeObjId },
      { $set: updateData },
      { session }
    );

    if (result.matchedCount === 0) {
      await session.abortTransaction();
      return { done: false, error: "Update failed - employee not found" };
    }

    await session.commitTransaction();
    return {
      done: true,
      message: "Emergency contacts updated successfully",
      updatedAt: new Date()
    };
  } catch (error) {
    await session.abortTransaction();
    console.error("Emergency contacts update error:", error);
    return {
      done: false,
      error: "Internal server error",
    };
  } finally {
    session.endSession();
  }
};

export const raiseAssetIssue = async (companyId, hrId, payload = {}) => {
  const session = client.startSession();
  try {
    session.startTransaction();

    if (!companyId || !hrId || !payload?.assetId || !payload?.description || payload?.employeeId) {
      await session.abortTransaction();
      return { success: false, error: "Missing required parameters: assetId and description are mandatory" };
    }

    const collections = getTenantCollections(companyId);
    const assetObjId = new ObjectId(payload.assetId);

    const [hrExists, assetExists] = await Promise.all([
      collections.hr.countDocuments({ _id: new ObjectId(hrId) }, { session }),
      collections.assets.countDocuments({ _id: assetObjId }, { session })
    ]);

    if (!hrExists || !assetExists) {
      await session.abortTransaction();
      return {
        success: false,
        error: !hrExists ? "HR not found" : "Asset not found"
      };
    }

    const issueId = generateId("ISS");

    const issueData = {
      isIssue: true,
      issueDetails: {
        issueId,
        description: payload.description,
        status: 'OPEN',
        raisedBy: new ObjectId(hrId),
        raisedOn: new Date()
      },
      updatedBy: new ObjectId(hrId)
    };

    const result = await collections.assets.updateOne(
      { _id: assetObjId },
      { $set: issueData },
      { session }
    );

    if (result.matchedCount === 0) {
      await session.abortTransaction();
      return { success: false, error: "Failed to create issue - asset not found" };
    }

    await session.commitTransaction();
    return {
      success: true,
      message: "Asset issue raised successfully",
      data: {
        issueId,
        assetId: payload.assetId,
        status: 'OPEN'
      }
    };
  } catch (error) {
    await session.abortTransaction();
    console.error("Asset issue creation error:", error);
    return {
      success: false,
      error: "Internal server error while creating asset issue"
    };
  } finally {
    session.endSession();
  }
};

export const getBankDetails = async (companyId, hrId, employeeId) => {
  const session = client.startSession();
  try {
    session.startTransaction();

    if (!companyId || !hrId || !employeeId) {
      await session.abortTransaction();
      return { done: false, error: "Missing required parameters" };
    }

    const collections = getTenantCollections(companyId);
    const employeeObjId = new ObjectId(employeeId);

    const [hrExists, employee] = await Promise.all([
      collections.hr.countDocuments({ _id: new ObjectId(hrId) }, { session }),
      collections.employees.findOne(
        { _id: employeeObjId },
        {
          '+bank': 1,
          updatedBy: 1,
          updatedAt: 1
        },
        { session }
      )
    ]);

    if (!hrExists || !employee) {
      await session.abortTransaction();
      return {
        done: false,
        error: !hrExists ? "HR not found" : "Employee not found"
      };
    }

    await session.commitTransaction();

    return {
      done: true,
      data: {
        bankDetails: employee.bank ? {
          bankName: employee.bank.bankName,
          accountNumber: employee.bank.accountNumber ? maskAccountNumber(employee.bank.accountNumber) : null,
          ifscCode: employee.bank.ifsc,
          branch: employee.bank.branchAddress
        } : null,
        lastUpdated: {
          by: employee.updatedBy,
          at: employee.updatedAt
        }
      }
    };

  } catch (error) {
    await session.abortTransaction();
    return {
      done: false,
      error: "Internal server error",
      systemError: process.env.NODE_ENV === 'development' ? error.message : undefined
    };
  } finally {
    session.endSession();
  }
};

///// generic function

export const getEmployeeDetails = async (companyId, hrId, employeeId) => {
  try {
    if (!companyId || !hrId || !employeeId) {
      return { done: false, message: "Missing required parameters" };
    }

    const collections = getTenantCollections(companyId);
    const employeeObjId = new ObjectId(employeeId);

    const hrExists = await collections.hr.countDocuments({ userId: hrId });

    if (!hrExists) {
      return { done: false, message: "HR not authorized" };
    }

    const employee = await collections.employees.findOne(
      { _id: employeeObjId },
    );

    if (!employee) {
      return { done: false, message: "Employee not found" };
    }

    return {
      done: true,
      data: employee,
    };
  } catch (error) {
    return {
      done: false,
      message: "Internal server error",
    };
  }
};
