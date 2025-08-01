import { ObjectId } from "mongodb";
import { getTenantCollections } from "../../config/db";

export const getEmployeeStats = async (companyId, hrId, filters = {}) => {
  try {
    const collections = getTenantCollections(companyId);

    const { timeRange = "alltime", designation = "Developer", status = "Active" } = filters;

    const hrCount = await collections.hr.countDocuments({
      _id: new ObjectId(hrId)
    });
    if (hrCount == 0) {
      return { done: false, error: "HR not found in the specified company" };
    }

    const filter = {};
    if (designation) filter.designation = designation;
    if (status) filter.status = status;
    if (timeRange !== "alltime") {
      const date = new Date();
      if (timeRange === "7days") date.setDate(date.getDate() - 7);
      if (timeRange === "30days") date.setDate(date.getDate() - 30);
      filter.joiningDate = { $gte: date };
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const pipeline = [
      { $match: filter },
      {
        $facet: {
          totalEmployees: [{ $count: "count" }],
          statusCounts: [
            { $group: { _id: "$status", count: { $sum: 1 } } }
          ],
          newJoiners: [
            { $match: { joiningDate: { $gte: thirtyDaysAgo } } },
            { $count: "count" }
          ],
          employees: [{ $match: {} }]
        }
      },
      {
        $project: {
          totalEmployees: { $arrayElemAt: ["$totalEmployees.count", 0] },
          statusCounts: "$statusCounts",
          newJoinersCount: { $arrayElemAt: ["$newJoiners.count", 0] },
          employees: "$employees"
        }
      }
    ];

    const [result] = await collections.employees.aggregate(pipeline).toArray();

    const statusStats = result.statusCounts.reduce((acc, { _id, count }) => {
      acc[`${_id}Count`] = count;
      return acc;
    }, {});

    return {
      done: true,
      data: {
        totalEmployees: result.totalEmployees || 0,
        ...statusStats,
        newJoinersCount: result.newJoinersCount || 0,
        employees: result.employees
      }
    };

  } catch (error) {
    console.error("Error in getEmployeeStats:", error);
    return { done: false, error: error.message };
  }
};
