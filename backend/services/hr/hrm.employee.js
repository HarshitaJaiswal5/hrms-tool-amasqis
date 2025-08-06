import { ObjectId } from "mongodb";
import { generateId } from '../../utils/generateId.js';
import { getTenantCollections } from "../../config/db.js";
import { maskAccountNumber } from "../../utils/maskAccNo.js"

export const getEmployeesStats = async (companyId, hrId, filters = {}) => {
  try {
    const collections = getTenantCollections(companyId);

    const hrCount = await collections.hr.countDocuments({
      _id: new ObjectId(hrId),
    });
    if (hrCount === 0) {
      return { done: false, error: "HR not found in the specified company" };
    }
    const query = {};

    if (filters.status && ['Active', 'Inactive'].includes(filters.status)) {
      query.status = filters.status;
    }

    if (filters.designation && typeof filters.designation === 'string') {
      query.designation = filters.designation;
    }

    if (filters.startDate || filters.endDate) {
      query.joiningDate = {};
      if (filters.startDate) {
        const start = new Date(filters.startDate);
        if (!isNaN(start.getTime())) query.joiningDate.$gte = start;
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        if (!isNaN(end.getTime())) query.joiningDate.$lte = end;
      }
      if (Object.keys(query.joiningDate).length === 0) {
        delete query.joiningDate;
      }
    }

    const employees = await collections.employees.find(query).toArray();

    const [totalEmployees, activeCount, inactiveCount, newJoinersCount] = await Promise.all([
      collections.employees.countDocuments({}),
      collections.employees.countDocuments({ status: 'Active' }),
      collections.employees.countDocuments({ status: 'InActive' }),
      collections.employees.countDocuments({
        joiningDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      }),
    ]);

    return {
      stats: {
        totalEmployees,
        activeCount,
        inactiveCount,
        newJoinersCount,
      },
      employees,
    };
  } catch (error) {
    console.error("Error in getEmployeesWithStats:", error);
    return { done: false, error: `Failed to get employee stats: ${error.message}` };
  }
};

export const updateEmployeeDetails = async (companyId, hrId, payload = {}) => {
  try {
    if (!companyId || !hrId) {
      return { done: false, error: "Missing required parameters" };
    }
    const collections = getTenantCollections(companyId);
    const hrCount = await collections.hr.countDocuments({
      _id: new ObjectId(hrId)
    });

    if (hrCount !== 1) {
      return { done: false, error: "HR not found in the company" };
    }

    if (!payload?.employeeId) {
      return { done: false, error: "Employee ID is required" };
    }

    const { _id, ...updateData } = payload;

    const result = await collections.employees.updateOne(
      { _id: new ObjectId(_id) },
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

export const updatePermissions = async (companyId, hrId, employeeId, payload = {}) => {
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
      enableAllModules: safePayload.enableAllModules ?? false,
      modules: {
        holidays: safePayload.modules?.holidays ?? { read: false, write: false, create: false, delete: false, import: false, export: false },
        leaves: safePayload.modules?.leaves ?? { read: false, write: false, create: false, delete: false, import: false, export: false },
        clients: safePayload.modules?.clients ?? { read: false, write: false, create: false, delete: false, import: false, export: false },
        projects: safePayload.modules?.projects ?? { read: false, write: false, create: false, delete: false, import: false, export: false },
        tasks: safePayload.modules?.tasks ?? { read: false, write: false, create: false, delete: false, import: false, export: false },
        chats: safePayload.modules?.chats ?? { read: false, write: false, create: false, delete: false, import: false, export: false },
        assets: safePayload.modules?.assets ?? { read: false, write: false, create: false, delete: false, import: false, export: false },
        timingSheets: safePayload.modules?.timingSheets ?? { read: false, write: false, create: false, delete: false, import: false, export: false }
      },
      updatedAt: new Date()
    };

    const result = await collections.permissions.updateOne(
      {
        employeeId: new ObjectId(employeeId),
      },
      { $set: updateData },
      { upsert: true }
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
      collections.hr.countDocuments({ _id: new ObjectId(hrId) }),
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
      permissionsDeleted: permissionsDelete.deletedCount
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

export const addEmployee = async (companyId, hrId, employeeData) => {
  try {
    if (!companyId || !hrId || !employeeData?.email) {
      return { done: false, error: "Missing required parameters" };
    }

    const collections = getTenantCollections(companyId);
    const hrExists = await collections.hr.countDocuments({
      _id: new ObjectId(hrId)
    });
    if (!hrExists) return { done: false, error: "HR not found" };

    const emailExists = await collections.employees.countDocuments({
      email: employeeData.email,
    });
    if (emailExists) return { done: false, error: "Employee email already exists" };

    let employeeId;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      employeeId = generateId('Emp');

      const idExists = await collections.employees.countDocuments({
        employeeId,
      }, { limit: 1 });

      if (!idExists) break;
    }

    if (attempts >= maxAttempts) {
      return { done: false, error: "Failed to generate unique employee ID" };
    }

    const result = await collections.employees.insertOne({
      ...employeeData,
      employeeId,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: "Active"
    });

    return {
      done: true,
      data: { employeeId },
      message: "Employee added successfully"
    };

  } catch (error) {
    console.error("Error adding employee:", error);
    return {
      done: false,
      error: error.message.includes('duplicate key') ?
        "Employee with same details already exists" :
        "Failed to add employee"
    };
  }
};

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

    const issueId = generateId("ISS") ;

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

export const getEmployeeInfo = async (companyId, hrId, employeeId, infoType) => {
    const session = client.startSession();
    try {
      session.startTransaction();

      if (!companyId || !hrId || !employeeId || !infoType) {
        await session.abortTransaction();
        return { done: false, message: "Missing required parameters" };
      }

      const allowedTypes = [
        'education',
        'family',
        'experience',
        'assets',
        'emergencyContacts',
        'personal',
        'statutory',
      ];

      if (!allowedTypes.includes(infoType)) {
        await session.abortTransaction();
        return {
          done: false,
          message: `Invalid infoType. Allowed: ${allowedTypes.join(', ')}`
        };
      }

      const collections = getTenantCollections(companyId);
      const employeeObjId = new ObjectId(employeeId);

      const hrExists = await collections.hr.countDocuments(
        { _id: new ObjectId(hrId) },
        { session }
      );

      if (!hrExists) {
        await session.abortTransaction();
        return { done: false, message: "HR not authorized" };
      }

      const employee = await collections.employees.findOne(
        { _id: employeeObjId },
        {
          [`+${infoType}`]: 1,
          updatedAt: 1
        },
        { session }
      );

      if (!employee) {
        await session.abortTransaction();
        return { done: false, message: "Employee not found" };
      }

      let resultData;
      if (infoType === 'assets' || infoType === 'emergencyContacts') {
        resultData = employee[infoType] || [];
      } else {
        resultData = employee[infoType] || {};
        if (Array.isArray(resultData)) {
          resultData = resultData[0] || {};
        }
      }

      await session.commitTransaction();
      return {
        done: true,
        data: {
          [infoType]: resultData,
          lastUpdated: employee.updatedAt
        }
      };

    } catch (error) {
      await session.abortTransaction();
      return {
        done: false,
        message: "Internal server error",
      };
    } finally {
      session.endSession();
    }
};