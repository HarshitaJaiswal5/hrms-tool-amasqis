import { getTenantCollections } from "../../config/db.js";
import {
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { ObjectId } from "mongodb";

// Helper function to get date filter based on filter type
const getDateFilter = (filter) => {
  const now = new Date();
  let dateFilter = {};

  switch (filter) {
    case "today":
      const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );
      const endOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1
      );
      dateFilter = { $gte: startOfToday, $lt: endOfToday };
      break;
    case "week":
      const weekStart = startOfWeek(now);
      const weekEnd = endOfWeek(now);
      dateFilter = { $gte: weekStart, $lte: weekEnd };
      break;
    case "month":
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      dateFilter = { $gte: monthStart, $lte: monthEnd };
      break;
    default:
      // No date filter for 'all'
      return null;
  }

  return dateFilter;
};

// Helper function to get year filter
const getYearFilter = (year) => {
  if (!year) return null;

  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year + 1, 0, 1);

  return { $gte: startOfYear, $lt: endOfYear };
};

// Get dashboard statistics
export const getDashboardStats = async (companyId, year = null) => {
  try {
    const collections = getTenantCollections(companyId);
    const yearFilter = getYearFilter(year);

    const buildMatchCondition = (
      baseCondition = {},
      dateField = "createdAt"
    ) => {
      if (yearFilter) {
        return {
          ...baseCondition,
          [dateField]: yearFilter,
        };
      }
      return baseCondition;
    };

    // Get current period data
    const [
      attendanceStats,
      projectStats,
      clientStats,
      taskStats,
      earningsStats,
      employeeStats,
      jobApplicationStats,
    ] = await Promise.all([
      collections.attendance
        .aggregate([
          {
            $facet: {
              total: [
                { $match: buildMatchCondition({}, "date") },
                { $count: "count" },
              ],
              present: [
                {
                  $match: buildMatchCondition(
                    {
                      status: "Present",
                      date: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
                    },
                    "date"
                  ),
                },
                { $count: "count" },
              ],
            },
          },
        ])
        .toArray(),

      // Project stats
      collections.projects
        .aggregate([
          {
            $facet: {
              total: [{ $match: buildMatchCondition() }, { $count: "count" }],
              completed: [
                { $match: buildMatchCondition({ status: "Completed" }) },
                { $count: "count" },
              ],
            },
          },
        ])
        .toArray(),

      // Client stats
      collections.clients.countDocuments(
        buildMatchCondition({ status: "Active" })
      ),

      // Task stats
      collections.tasks
        .aggregate([
          {
            $facet: {
              total: [{ $match: buildMatchCondition() }, { $count: "count" }],
              completed: [
                { $match: buildMatchCondition({ status: "Completed" }) },
                { $count: "count" },
              ],
            },
          },
        ])
        .toArray(),

      // Earnings stats
      collections.earnings
        .aggregate([
          { $match: buildMatchCondition({}, "date") },
          {
            $group: {
              _id: null,
              totalEarnings: { $sum: "$amount" },
              weeklyProfit: {
                $sum: {
                  $cond: {
                    if: {
                      $gte: ["$date", startOfWeek(new Date())],
                    },
                    then: "$profit",
                    else: 0,
                  },
                },
              },
            },
          },
        ])
        .toArray(),

      // Employee stats
      collections.employees.countDocuments(
        buildMatchCondition({ status: "Active" })
      ),

      // Job applications
      collections.jobApplications.countDocuments(
        buildMatchCondition({ status: "Active" })
      ),
    ]);

    // Get previous period data for growth calculation
    const currentYear = year || new Date().getFullYear();
    const previousYear = currentYear - 1;
    const previousYearFilter = getYearFilter(previousYear);

    const buildPreviousMatchCondition = (
      baseCondition = {},
      dateField = "createdAt"
    ) => {
      if (previousYearFilter) {
        return {
          ...baseCondition,
          [dateField]: previousYearFilter,
        };
      }
      return baseCondition;
    };

    const [
      prevProjectStats,
      prevClientStats,
      prevTaskStats,
      prevEarningsStats,
      prevEmployeeStats,
      prevJobApplicationStats,
    ] = await Promise.all([
      collections.projects.countDocuments(buildPreviousMatchCondition()),
      collections.clients.countDocuments(
        buildPreviousMatchCondition({ status: "Active" })
      ),
      collections.tasks.countDocuments(buildPreviousMatchCondition()),
      collections.earnings
        .aggregate([
          { $match: buildPreviousMatchCondition({}, "date") },
          {
            $group: {
              _id: null,
              totalEarnings: { $sum: "$amount" },
              weeklyProfit: { $sum: "$profit" },
            },
          },
        ])
        .toArray(),
      collections.employees.countDocuments(
        buildPreviousMatchCondition({ status: "Active" })
      ),
      collections.jobApplications.countDocuments(
        buildPreviousMatchCondition({ status: "Active" })
      ),
    ]);

    // Calculate growth percentages
    const calculateGrowth = (current, previous) => {
      if (!previous || previous === 0) {
        // Handle edge case: if previous was 0 but now we have data
        if (current > 0) {
          // Cap the growth at reasonable percentage to avoid infinity
          return current >= 100
            ? 100
            : current >= 50
            ? 50
            : current >= 10
            ? 25
            : 10;
        }
        return 0;
      }
      const growth = Math.round(((current - previous) / previous) * 100);
      // Cap extreme growth percentages for better display
      return Math.max(-99, Math.min(999, growth));
    };

    const attendance = attendanceStats[0];
    const projects = projectStats[0];
    const tasks = taskStats[0];
    const earnings = earningsStats[0] || { totalEarnings: 0, weeklyProfit: 0 };
    const prevEarnings = prevEarningsStats[0] || {
      totalEarnings: 0,
      weeklyProfit: 0,
    };

    const currentProjectCount = projects.total[0]?.count || 0;
    const currentClientCount = clientStats || 0;
    const currentTaskCount = tasks.total[0]?.count || 0;
    const currentEarnings = earnings.totalEarnings || 0;
    const currentWeeklyProfit = earnings.weeklyProfit || 0;
    const currentEmployeeCount = employeeStats || 0;
    const currentJobAppCount = jobApplicationStats || 0;

    return {
      done: true,
      data: {
        attendance: {
          present: attendance.present[0]?.count || 0,
          total: attendance.total[0]?.count || 0,
          percentage: attendance.total[0]?.count
            ? Math.round(
                ((attendance.present[0]?.count || 0) /
                  attendance.total[0].count) *
                  100
              )
            : 0,
        },
        projects: {
          total: currentProjectCount,
          completed: projects.completed[0]?.count || 0,
          percentage: currentProjectCount
            ? Math.round(
                ((projects.completed[0]?.count || 0) / currentProjectCount) *
                  100
              )
            : 0,
        },
        clients: currentClientCount,
        tasks: {
          total: currentTaskCount,
          completed: tasks.completed[0]?.count || 0,
        },
        earnings: currentEarnings,
        weeklyProfit: currentWeeklyProfit,
        employees: currentEmployeeCount,
        jobApplications: currentJobAppCount,
        // Growth percentages
        clientsGrowth: calculateGrowth(currentClientCount, prevClientStats),
        tasksGrowth: calculateGrowth(currentTaskCount, prevTaskStats),
        earningsGrowth: calculateGrowth(
          currentEarnings,
          prevEarnings.totalEarnings
        ),
        profitGrowth: calculateGrowth(
          currentWeeklyProfit,
          prevEarnings.weeklyProfit
        ),
        applicationsGrowth: calculateGrowth(
          currentJobAppCount,
          prevJobApplicationStats
        ),
        employeesGrowth: calculateGrowth(
          currentEmployeeCount,
          prevEmployeeStats
        ),
      },
    };
  } catch (error) {
    console.error("Error fetching admin dashboard stats:", error);
    return { done: false, error: error.message };
  }
};

// Get employees by department
export const getEmployeesByDepartment = async (
  companyId,
  filter = "week",
  year = null
) => {
  try {
    const collections = getTenantCollections(companyId);

    // Build match condition with date filter and year filter
    const matchCondition = { status: "Active" };

    // Apply date filter based on filter parameter
    const dateFilter = getDateFilter(filter);
    const yearFilter = getYearFilter(year);

    if (dateFilter) {
      matchCondition.createdAt = dateFilter;
    } else if (yearFilter) {
      matchCondition.createdAt = yearFilter;
    }

    const departmentData = await collections.employees
      .aggregate([
        { $match: matchCondition },
        {
          $group: {
            _id: "$department",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ])
      .toArray();

    const data = departmentData.map((dept) => ({
      department: dept._id || "Other",
      count: dept.count,
    }));

    return {
      done: true,
      data,
    };
  } catch (error) {
    console.error("Error fetching employees by department:", error);
    return { done: false, error: error.message };
  }
};

// Get employee status distribution
export const getEmployeeStatus = async (
  companyId,
  filter = "all",
  year = null
) => {
  try {
    const collections = getTenantCollections(companyId);

    // Get date filter for employee creation
    const dateFilter = getDateFilter(filter);
    const yearFilter = getYearFilter(year);
    const employeeMatchFilter = { status: "Active" };

    if (dateFilter) {
      employeeMatchFilter.createdAt = dateFilter;
    } else if (yearFilter) {
      employeeMatchFilter.createdAt = yearFilter;
    }

    const [statusData, topPerformer] = await Promise.all([
      collections.employees
        .aggregate([
          { $match: employeeMatchFilter },
          {
            $group: {
              _id: "$employmentType",
              count: { $sum: 1 },
            },
          },
        ])
        .toArray(),

      collections.employees.findOne(
        { status: "Active" },
        { sort: { performance: -1 } }
      ),
    ]);

    const totalEmployees = await collections.employees.countDocuments(
      employeeMatchFilter
    );

    const statusDistribution = statusData.reduce((acc, curr) => {
      acc[curr._id || "Other"] = curr.count;
      return acc;
    }, {});

    return {
      done: true,
      data: {
        total: totalEmployees,
        distribution: statusDistribution,
        topPerformer: topPerformer
          ? {
              name: `${topPerformer.firstName} ${topPerformer.lastName}`,
              position: topPerformer.position,
              performance: topPerformer.performance || 95,
              avatar:
                topPerformer.avatar || "assets/img/profiles/avatar-24.jpg",
            }
          : null,
      },
    };
  } catch (error) {
    console.error("Error fetching employee status:", error);
    return { done: false, error: error.message };
  }
};

// Get attendance overview
export const getAttendanceOverview = async (
  companyId,
  filter = "today",
  year = null
) => {
  try {
    const collections = getTenantCollections(companyId);

    // Get date filter for attendance
    const dateFilter = getDateFilter(filter);
    const yearFilter = getYearFilter(year);
    let attendanceMatchFilter = {};

    if (dateFilter) {
      attendanceMatchFilter.date = dateFilter;
    } else if (yearFilter) {
      attendanceMatchFilter.date = yearFilter;
    } else {
      // Default to today if no filter or 'all' is passed
      const today = new Date();
      attendanceMatchFilter.date = {
        $gte: new Date(today.setHours(0, 0, 0, 0)),
        $lt: new Date(today.setHours(23, 59, 59, 999)),
      };
    }

    const attendanceData = await collections.attendance
      .aggregate([
        { $match: attendanceMatchFilter },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    const statusCounts = attendanceData.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    const total = Object.values(statusCounts).reduce(
      (sum, count) => sum + count,
      0
    );

    // Get absentees - use the same date filter
    const absentees = await collections.employees
      .aggregate([
        {
          $lookup: {
            from: "attendance",
            let: { empId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$employeeId", "$$empId"] },
                      dateFilter
                        ? { $gte: ["$date", dateFilter.$gte] }
                        : { $gte: ["$date", attendanceMatchFilter.date.$gte] },
                    ],
                  },
                },
              },
            ],
            as: "attendanceInPeriod",
          },
        },
        {
          $match: {
            attendanceInPeriod: { $size: 0 },
            status: "Active",
          },
        },
        { $limit: 5 },
        {
          $project: {
            name: { $concat: ["$firstName", " ", "$lastName"] },
            avatar: "$avatar",
            position: "$position",
          },
        },
      ])
      .toArray();

    return {
      done: true,
      data: {
        total,
        present: statusCounts.Present || 0,
        late: statusCounts.Late || 0,
        permission: statusCounts.Permission || 0,
        absent: statusCounts.Absent || 0,
        absentees,
      },
    };
  } catch (error) {
    console.error("Error fetching attendance overview:", error);
    return { done: false, error: error.message };
  }
};

// Get clock in/out data
export const getClockInOutData = async (
  companyId,
  filter = "today",
  year = null,
  department = null
) => {
  try {
    const collections = getTenantCollections(companyId);

    // Get date filter for clock in/out data
    const dateFilter = getDateFilter(filter);
    const yearFilter = getYearFilter(year);
    let clockMatchFilter = {};

    if (dateFilter) {
      clockMatchFilter.date = dateFilter;
    } else if (yearFilter) {
      clockMatchFilter.date = yearFilter;
    }

    // Build the aggregation pipeline
    const pipeline = [
      { $match: clockMatchFilter },
      {
        $lookup: {
          from: "employees",
          localField: "employeeId",
          foreignField: "_id",
          as: "employee",
        },
      },
      { $unwind: "$employee" },
    ];

    // Add department filter if specified
    if (department && department !== "All Departments") {
      pipeline.push({
        $match: {
          "employee.department": department,
        },
      });
    }

    // Add remaining pipeline stages
    pipeline.push(
      { $sort: { clockIn: -1 } },
      { $limit: 10 },
      {
        $project: {
          name: {
            $concat: ["$employee.firstName", " ", "$employee.lastName"],
          },
          position: "$employee.position",
          avatar: "$employee.avatar",
          department: "$employee.department",
          clockIn: 1,
          clockOut: 1,
          status: 1,
          hoursWorked: 1,
        },
      }
    );

    const clockData = await collections.attendance
      .aggregate(pipeline)
      .toArray();

    return {
      done: true,
      data: clockData,
    };
  } catch (error) {
    console.error("Error fetching clock in/out data:", error);
    return { done: false, error: error.message };
  }
};

// Get sales overview data
export const getSalesOverview = async (
  companyId,
  filter = "week",
  year = null,
  department = null
) => {
  try {
    const collections = getTenantCollections(companyId);

    // Get date filter for sales data
    const dateFilter = getDateFilter(filter);
    const yearFilter = getYearFilter(year);

    // Build date range for the specific filter/year or default to last 12 months
    let dateRange;
    if (dateFilter) {
      dateRange = dateFilter;
    } else if (yearFilter) {
      dateRange = yearFilter;
    } else if (year) {
      dateRange = {
        $gte: new Date(year, 0, 1),
        $lte: new Date(year, 11, 31),
      };
    } else {
      dateRange = {
        $gte: startOfMonth(subDays(new Date(), 365)),
        $lte: endOfMonth(new Date()),
      };
    }

    // Build the aggregation pipeline
    const pipeline = [
      {
        $match: {
          date: dateRange,
        },
      },
    ];

    // Add department filter if specified
    if (department && department !== "All Departments") {
      // Lookup employee data to filter by department
      pipeline.push(
        {
          $lookup: {
            from: "employees",
            localField: "employeeId",
            foreignField: "_id",
            as: "employee",
          },
        },
        {
          $match: {
            "employee.department": department,
          },
        }
      );
    }

    // Add grouping and sorting
    pipeline.push(
      {
        $group: {
          _id: {
            month: { $month: "$date" },
            year: { $year: "$date" },
          },
          income: { $sum: "$income" },
          expenses: { $sum: "$expenses" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      { $limit: 12 }
    );

    const monthlyData = await collections.earnings
      .aggregate(pipeline)
      .toArray();

    // Fill missing months with 0
    const income = new Array(12).fill(0);
    const expenses = new Array(12).fill(0);

    for (const item of monthlyData) {
      const monthIndex = item._id.month - 1;
      income[monthIndex] = Math.round(item.income / 1000);
      expenses[monthIndex] = Math.round(item.expenses / 1000);
    }

    return {
      done: true,
      data: {
        income,
        expenses,
        lastUpdated: new Date(),
      },
    };
  } catch (error) {
    console.error("Error fetching sales overview:", error);
    return { done: false, error: error.message };
  }
};

// Get recent invoices
export const getRecentInvoices = async (
  companyId,
  filter = "week",
  year = null,
  invoiceType = "all"
) => {
  try {
    const collections = getTenantCollections(companyId);

    // Get date filter for invoices
    const dateFilter = getDateFilter(filter);
    const yearFilter = getYearFilter(year);
    let invoiceMatchFilter = {};

    if (dateFilter) {
      invoiceMatchFilter.createdAt = dateFilter;
    } else if (yearFilter) {
      invoiceMatchFilter.createdAt = yearFilter;
    }

    // Add invoice type filter
    if (invoiceType && invoiceType !== "all") {
      if (invoiceType === "paid") {
        invoiceMatchFilter.status = { $regex: /^paid$/i };
      } else if (invoiceType === "unpaid") {
        invoiceMatchFilter.status = { $regex: /^unpaid$/i };
      }
    }

    const invoices = await collections.invoices
      .aggregate([
        ...(Object.keys(invoiceMatchFilter).length > 0
          ? [{ $match: invoiceMatchFilter }]
          : []),
        { $sort: { createdAt: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "clients",
            localField: "clientId",
            foreignField: "_id",
            as: "client",
          },
        },
        { $unwind: "$client" },
        {
          $project: {
            invoiceNumber: 1,
            title: 1,
            amount: 1,
            status: 1,
            createdAt: 1,
            clientName: "$client.name",
            clientLogo: "$client.logo",
          },
        },
      ])
      .toArray();

    return {
      done: true,
      data: invoices,
    };
  } catch (error) {
    console.error("Error fetching recent invoices:", error);
    return { done: false, error: error.message };
  }
};

// Get employees list
export const getEmployeesList = async (companyId, year = null) => {
  try {
    const collections = getTenantCollections(companyId);

    // Build match condition with year filter
    const matchCondition = { status: "Active" };
    const yearFilter = getYearFilter(year);
    if (yearFilter) {
      matchCondition.createdAt = yearFilter;
    }

    const employees = await collections.employees
      .aggregate([
        { $match: matchCondition },
        { $sort: { createdAt: -1 } },
        { $limit: 5 },
        {
          $project: {
            name: { $concat: ["$firstName", " ", "$lastName"] },
            position: 1,
            department: 1,
            avatar: 1,
          },
        },
      ])
      .toArray();

    return {
      done: true,
      data: employees,
    };
  } catch (error) {
    console.error("Error fetching employees list:", error);
    return { done: false, error: error.message };
  }
};

// Get job applicants
export const getJobApplicants = async (companyId, year = null) => {
  try {
    const collections = getTenantCollections(companyId);

    // Build match condition with year filter
    const matchCondition = { status: "Active" };
    const yearFilter = getYearFilter(year);
    if (yearFilter) {
      matchCondition.createdAt = yearFilter;
    }

    const [openings, applicants] = await Promise.all([
      collections.jobApplications
        .aggregate([
          ...(yearFilter ? [{ $match: { createdAt: yearFilter } }] : []),
          {
            $group: {
              _id: "$position",
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 4 },
        ])
        .toArray(),

      collections.jobApplications
        .aggregate([
          { $match: matchCondition },
          { $sort: { createdAt: -1 } },
          { $limit: 4 },
          {
            $project: {
              name: 1,
              position: 1,
              experience: 1,
              location: 1,
              avatar: 1,
            },
          },
        ])
        .toArray(),
    ]);

    return {
      done: true,
      data: {
        openings,
        applicants,
      },
    };
  } catch (error) {
    console.error("Error fetching job applicants:", error);
    return { done: false, error: error.message };
  }
};

// Get recent activities
export const getRecentActivities = async (companyId, year = null) => {
  try {
    const collections = getTenantCollections(companyId);

    // Build match condition with year filter
    const yearFilter = getYearFilter(year);
    const matchStage = yearFilter
      ? [{ $match: { createdAt: yearFilter } }]
      : [];

    const activities = await collections.activities
      .aggregate([
        ...matchStage,
        { $sort: { createdAt: -1 } },
        { $limit: 6 },
        {
          $lookup: {
            from: "employees",
            localField: "employeeId",
            foreignField: "_id",
            as: "employee",
          },
        },
        { $unwind: "$employee" },
        {
          $project: {
            action: 1,
            description: 1,
            createdAt: 1,
            employeeName: {
              $concat: ["$employee.firstName", " ", "$employee.lastName"],
            },
            employeeAvatar: "$employee.avatar",
          },
        },
      ])
      .toArray();

    return {
      done: true,
      data: activities,
    };
  } catch (error) {
    console.error("Error fetching recent activities:", error);
    return { done: false, error: error.message };
  }
};

// Get birthdays
export const getBirthdays = async (companyId, year = null) => {
  try {
    const collections = getTenantCollections(companyId);

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayBirthdays, tomorrowBirthdays, upcomingBirthdays] =
      await Promise.all([
        collections.employees
          .find({
            $expr: {
              $and: [
                { $eq: [{ $dayOfMonth: "$dateOfBirth" }, today.getDate()] },
                { $eq: [{ $month: "$dateOfBirth" }, today.getMonth() + 1] },
              ],
            },
            status: "Active",
          })
          .limit(3)
          .toArray(),

        collections.employees
          .find({
            $expr: {
              $and: [
                { $eq: [{ $dayOfMonth: "$dateOfBirth" }, tomorrow.getDate()] },
                { $eq: [{ $month: "$dateOfBirth" }, tomorrow.getMonth() + 1] },
              ],
            },
            status: "Active",
          })
          .limit(3)
          .toArray(),

        collections.employees
          .find({
            status: "Active",
            dateOfBirth: { $exists: true },
          })
          .limit(2)
          .toArray(),
      ]);

    return {
      done: true,
      data: {
        today: todayBirthdays.map((emp) => ({
          name: `${emp.firstName} ${emp.lastName}`,
          position: emp.position,
          avatar: emp.avatar,
        })),
        tomorrow: tomorrowBirthdays.map((emp) => ({
          name: `${emp.firstName} ${emp.lastName}`,
          position: emp.position,
          avatar: emp.avatar,
        })),
        upcoming: upcomingBirthdays.map((emp) => ({
          name: `${emp.firstName} ${emp.lastName}`,
          position: emp.position,
          avatar: emp.avatar,
          date: emp.dateOfBirth,
        })),
      },
    };
  } catch (error) {
    console.error("Error fetching birthdays:", error);
    return { done: false, error: error.message };
  }
};

// Get todos
export const getTodos = async (
  companyId,
  userId,
  filter = "all",
  year = null
) => {
  try {
    const collections = getTenantCollections(companyId);
    // Build the base query - for admin users, show all todos in the company
    let query = {
      isDeleted: { $ne: true }
    };

    // Only filter by userId for non-admin users (if needed in the future)
    // For now, admin users see all todos in the company

    // Add priority filter if not "all"
    if (filter && filter !== "all" && ["high", "medium", "low"].includes(filter.toLowerCase())) {
      query.priority = { $regex: new RegExp(`^${filter}$`, 'i') };
    }

    // Calculate date ranges for filtering (only for date-based filters)
    const now = new Date();
    let dateFilter = {};

    switch (filter) {
      case "today":
        const startOfToday = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        const endOfToday = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + 1
        );
        dateFilter = {
          createdAt: { $gte: startOfToday, $lt: endOfToday },
        };
        break;
      case "week":
        const weekStart = startOfWeek(now);
        const weekEnd = endOfWeek(now);
        dateFilter = {
          createdAt: { $gte: weekStart, $lte: weekEnd },
        };
        break;
      case "month":
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        dateFilter = {
          createdAt: { $gte: monthStart, $lte: monthEnd },
        };
        break;
    }

    // Add date filter to query if applicable
    if (Object.keys(dateFilter).length > 0) {
      query = { ...query, ...dateFilter };
    }

    const todos = await collections.todos
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return {
      done: true,
      data: todos,
    };
  } catch (error) {
    console.error("Error fetching todos:", error);
    return { done: false, error: error.message };
  }
};

export const deleteTodoPermanently = async (companyId, todoId) => {
  try {
    const collections = getTenantCollections(companyId);
    if (!todoId || !ObjectId.isValid(todoId)) {
      return { done: false, error: "Invalid todo ID format" };
    }

    const result = await collections.todos.deleteOne({
      _id: new ObjectId(todoId)
    });

    if (result.deletedCount === 0) {
      return { done: false, error: "Todo not found or already deleted" };
    }

    console.log(`[DELETE TODO] Successfully deleted todo: ${todoId}`);

    return {
      done: true,
      message: "Todo deleted permanently",
      data: { deletedId: todoId }
    };
  } catch (error) {
    console.error("Error deleting todo permanently:", error);
    return { done: false, error: error.message };
  }
};

// Get projects data
export const getProjectsData = async (
  companyId,
  filter = "week",
  year = null
) => {
  try {
    const collections = getTenantCollections(companyId);

    // Get date filter for projects
    const dateFilter = getDateFilter(filter);
    const yearFilter = getYearFilter(year);
    let projectMatchFilter = {};

    if (dateFilter) {
      projectMatchFilter.createdAt = dateFilter;
    } else if (yearFilter) {
      projectMatchFilter.createdAt = yearFilter;
    }

    const projects = await collections.projects
      .aggregate([
        ...(Object.keys(projectMatchFilter).length > 0
          ? [{ $match: projectMatchFilter }]
          : []),
        { $sort: { createdAt: -1 } },
        { $limit: 7 },
        {
          $lookup: {
            from: "employees",
            localField: "teamMembers",
            foreignField: "_id",
            as: "team",
          },
        },
        {
          $project: {
            id: { $toString: "$_id" },
            name: 1,
            hours: 1,
            totalHours: 1,
            deadline: 1,
            priority: 1,
            progress: {
              $multiply: [{ $divide: ["$hours", "$totalHours"] }, 100],
            },
            team: {
              $map: {
                input: { $slice: ["$team", 3] },
                as: "member",
                in: {
                  name: {
                    $concat: ["$$member.firstName", " ", "$$member.lastName"],
                  },
                  avatar: "$$member.avatar",
                },
              },
            },
          },
        },
      ])
      .toArray();

    return {
      done: true,
      data: projects,
    };
  } catch (error) {
    console.error("Error fetching projects data:", error);
    return { done: false, error: error.message };
  }
};

// Get task statistics
export const getTaskStatistics = async (
  companyId,
  filter = "week",
  year = null
) => {
  try {
    const collections = getTenantCollections(companyId);

    // Get date filter for tasks
    const dateFilter = getDateFilter(filter);
    const yearFilter = getYearFilter(year);
    let taskMatchFilter = {};

    if (dateFilter) {
      taskMatchFilter.createdAt = dateFilter;
    } else if (yearFilter) {
      taskMatchFilter.createdAt = yearFilter;
    }

    const taskStats = await collections.tasks
      .aggregate([
        ...(Object.keys(taskMatchFilter).length > 0
          ? [{ $match: taskMatchFilter }]
          : []),
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    const totalTasks = taskStats.reduce((sum, stat) => sum + stat.count, 0);
    const taskDistribution = taskStats.reduce((acc, stat) => {
      acc[stat._id] = {
        count: stat.count,
        percentage:
          totalTasks > 0 ? Math.round((stat.count / totalTasks) * 100) : 0,
      };
      return acc;
    }, {});

    // Get total hours spent - also apply date filter
    const hoursData = await collections.tasks
      .aggregate([
        ...(Object.keys(taskMatchFilter).length > 0
          ? [{ $match: taskMatchFilter }]
          : []),
        {
          $group: {
            _id: null,
            totalHours: { $sum: "$hoursSpent" },
            targetHours: { $sum: "$estimatedHours" },
          },
        },
      ])
      .toArray();

    const hours = hoursData[0] || { totalHours: 0, targetHours: 0 };

    return {
      done: true,
      data: {
        total: totalTasks,
        distribution: taskDistribution,
        hoursSpent: hours.totalHours,
        targetHours: hours.targetHours,
      },
    };
  } catch (error) {
    console.error("Error fetching task statistics:", error);
    return { done: false, error: error.message };
  }
};

// Get schedules
export const getSchedules = async (companyId, year = null) => {
  try {
    const collections = getTenantCollections(companyId);

    // Build match condition with year filter if provided
    const yearFilter = getYearFilter(year);
    let matchCondition = {};

    if (yearFilter) {
      matchCondition.createdAt = yearFilter;
    } else {
      // Show upcoming schedules if no year filter
      matchCondition.date = {
        $gte: new Date(),
        $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
      };
    }

    const schedules = await collections.schedules
      .aggregate([
        { $match: matchCondition },
        { $sort: { date: 1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "employees",
            localField: "participants",
            foreignField: "_id",
            as: "participantDetails",
          },
        },
        {
          $project: {
            title: 1,
            type: 1,
            date: 1,
            startTime: 1,
            endTime: 1,
            participants: {
              $map: {
                input: { $slice: ["$participantDetails", 5] },
                as: "participant",
                in: {
                  name: {
                    $concat: [
                      "$$participant.firstName",
                      " ",
                      "$$participant.lastName",
                    ],
                  },
                  avatar: "$$participant.avatar",
                },
              },
            },
          },
        },
      ])
      .toArray();

    return {
      done: true,
      data: schedules,
    };
  } catch (error) {
    console.error("Error fetching schedules:", error);
    return { done: false, error: error.message };
  }
};

// Get pending items for the user
export const getPendingItems = async (companyId, userId, year = null) => {
  try {
    const collections = getTenantCollections(companyId);

    // Count pending approvals
    const pendingApprovals = await collections.approvals.countDocuments({
      approverClerkId: userId,
      status: "Pending",
      isDeleted: { $ne: true },
    });

    // Count pending leave requests
    const pendingLeaveRequests = await collections.leaves.countDocuments({
      approverClerkId: userId,
      status: "Pending",
      isDeleted: { $ne: true },
    });

    console.log(
      `[PENDING ITEMS] Found ${pendingApprovals} approvals and ${pendingLeaveRequests} leave requests for user ${userId}`
    );

    return {
      done: true,
      data: {
        approvals: pendingApprovals,
        leaveRequests: pendingLeaveRequests,
      },
    };
  } catch (error) {
    console.error("Error fetching pending items:", error);
    return {
      done: false,
      error: error.message,
    };
  }
};

// Get employee growth data
export const getEmployeeGrowth = async (companyId, year = null) => {
  try {
    const collections = getTenantCollections(companyId);

    const currentWeekStart = startOfWeek(new Date());
    const lastWeekStart = startOfWeek(subDays(new Date(), 7));
    const lastWeekEnd = endOfWeek(subDays(new Date(), 7));

    const [currentWeekCount, lastWeekCount] = await Promise.all([
      collections.employees.countDocuments({
        status: "Active",
        createdAt: { $gte: currentWeekStart },
      }),
      collections.employees.countDocuments({
        status: "Active",
        createdAt: { $gte: lastWeekStart, $lte: lastWeekEnd },
      }),
    ]);

    const percentage =
      lastWeekCount > 0
        ? Math.round(((currentWeekCount - lastWeekCount) / lastWeekCount) * 100)
        : 0;

    let trend = "stable";
    if (percentage > 0) {
      trend = "up";
    } else if (percentage < 0) {
      trend = "down";
    }

    return {
      done: true,
      data: {
        currentWeek: currentWeekCount,
        lastWeek: lastWeekCount,
        percentage: Math.abs(percentage),
        trend,
      },
    };
  } catch (error) {
    console.error("Error fetching employee growth:", error);
    return { done: false, error: error.message };
  }
};

// Get todo tags
export const getTodoTags = async (companyId) => {
  try {
    const collections = getTenantCollections(companyId);

    const existingTags = await collections.todos.distinct("tag", {
      isDeleted: { $ne: true },
      tag: { $exists: true, $ne: "" },
    });

    const defaultTags = [
      "Internal",
      "Projects",
      "Meetings",
      "Reminder",
      "Personal",
    ];

    // Combine and remove duplicates
    const allTags = [...new Set([...defaultTags, ...existingTags])];

    return {
      done: true,
      data: allTags.map((tag) => ({ value: tag, label: tag })),
    };
  } catch (error) {
    console.error("Error fetching todo tags:", error);
    return { done: false, error: error.message };
  }
};

// Get employees for assignee dropdown
export const getTodoAssignees = async (companyId) => {
  try {
    const collections = getTenantCollections(companyId);

    const employees = await collections.employees
      .find(
        {
          status: "Active",
        },
        {
          projection: {
            _id: 1,
            firstName: 1,
            lastName: 1,
            position: 1,
            email: 1,
            avatar: 1,
          },
        }
      )
      .sort({ firstName: 1 })
      .toArray();

    // Add default options
    const defaultOptions = [
      { value: "Self", label: "Self" },
      { value: "Team", label: "Team" },
      { value: "Manager", label: "Manager" },
    ];

    // Format employees for dropdown
    const employeeOptions = employees.map((emp) => ({
      value: emp._id.toString(),
      label: `${emp.firstName} ${emp.lastName}`,
      position: emp.position,
      email: emp.email,
      avatar: emp.avatar,
    }));

    return {
      done: true,
      data: [...defaultOptions, ...employeeOptions],
    };
  } catch (error) {
    console.error("Error fetching todo assignees:", error);
    return { done: false, error: error.message };
  }
};

// Get clients for project modal
export const getProjectClients = async (companyId) => {
  try {
    const collections = getTenantCollections(companyId);

    const clients = await collections.clients
      .find({ status: "Active" })
      .sort({ name: 1 })
      .toArray();

    const clientOptions = clients.map((client) => ({
      value: client._id.toString(),
      label: client.name,
      email: client.email,
      company: client.company,
    }));

    return {
      done: true,
      data: clientOptions,
    };
  } catch (error) {
    console.error("Error fetching project clients:", error);
    return { done: false, error: error.message };
  }
};

// Get employees for project modal
export const getProjectEmployees = async (companyId) => {
  try {
    const collections = getTenantCollections(companyId);

    const employees = await collections.employees
      .find({ status: "Active" })
      .sort({ firstName: 1 })
      .toArray();

    const employeeOptions = employees.map((emp) => ({
      value: emp._id.toString(),
      label: `${emp.firstName} ${emp.lastName}`,
      position: emp.position,
      department: emp.department,
      avatar: emp.avatar,
    }));

    return {
      done: true,
      data: employeeOptions,
    };
  } catch (error) {
    console.error("Error fetching project employees:", error);
    return { done: false, error: error.message };
  }
};

// Get project tags
export const getProjectTags = async (companyId) => {
  try {
    const collections = getTenantCollections(companyId);

    const existingTags = await collections.projects.distinct("tags", {
      status: { $ne: "Deleted" },
      tags: { $exists: true, $ne: [] },
    });

    const flatTags = existingTags.flat();
    const uniqueTags = [...new Set(flatTags)];

    const defaultTags = [
      "High Priority",
      "Medium Priority",
      "Low Priority",
      "Web Development",
      "Mobile App",
      "Design",
      "Backend",
      "Frontend",
      "API",
      "Database",
    ];

    const allTags = [...new Set([...defaultTags, ...uniqueTags])];

    return {
      done: true,
      data: allTags.map((tag) => ({ value: tag, label: tag })),
    };
  } catch (error) {
    console.error("Error fetching project tags:", error);
    return { done: false, error: error.message };
  }
};

// Generate next project ID
export const generateNextProjectId = async (companyId) => {
  try {
    const collections = getTenantCollections(companyId);

    const lastProject = await collections.projects.findOne(
      {},
      { sort: { createdAt: -1 } }
    );

    let nextId = 1;
    if (lastProject && lastProject.projectId) {
      const lastIdNumber = parseInt(lastProject.projectId.replace("PRO-", ""));
      nextId = lastIdNumber + 1;
    }

    const projectId = `PRO-${String(nextId).padStart(4, "0")}`;

    return {
      done: true,
      data: { projectId },
    };
  } catch (error) {
    console.error("Error generating project ID:", error);
    return { done: false, error: error.message };
  }
};

// Add new project
export const addProject = async (companyId, userId, projectData) => {
  try {
    const collections = getTenantCollections(companyId);

    // Generate project ID
    const projectIdResult = await generateNextProjectId(companyId);
    const projectId = projectIdResult.data.projectId;

    const newProject = {
      ...projectData,
      projectId,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: projectData.status || "Active",
      progress: 0,
      hours: 0,
      isDeleted: false,
    };

    const result = await collections.projects.insertOne(newProject);

    // Add activity log
    await collections.activities.insertOne({
      employeeId: userId,
      action: "Project Created",
      description: `Created new project: ${projectData.name}`,
      createdAt: new Date(),
    });

    return {
      done: true,
      data: { ...newProject, _id: result.insertedId },
    };
  } catch (error) {
    console.error("Error adding project:", error);
    return { done: false, error: error.message };
  }
};

// Get project priorities
export const getProjectPriorities = async () => {
  try {
    const priorities = [
      { value: "High", label: "High", color: "danger" },
      { value: "Medium", label: "Medium", color: "warning" },
      { value: "Low", label: "Low", color: "success" },
    ];

    return {
      done: true,
      data: priorities,
    };
  } catch (error) {
    console.error("Error fetching project priorities:", error);
    return { done: false, error: error.message };
  }
};

// Get project statuses
export const getProjectStatuses = async () => {
  try {
    const statuses = [
      { value: "Active", label: "Active", color: "success" },
      { value: "On Hold", label: "On Hold", color: "warning" },
      { value: "Completed", label: "Completed", color: "info" },
      { value: "Cancelled", label: "Cancelled", color: "danger" },
    ];

    return {
      done: true,
      data: statuses,
    };
  } catch (error) {
    console.error("Error fetching project statuses:", error);
    return { done: false, error: error.message };
  }
};

// Get employees for leave request
export const getLeaveRequestEmployees = async (companyId) => {
  try {
    const collections = getTenantCollections(companyId);

    const employees = await collections.employees
      .find(
        {
          status: "Active",
        },
        {
          projection: {
            _id: 1,
            firstName: 1,
            lastName: 1,
            position: 1,
            department: 1,
            email: 1,
            avatar: 1,
            employeeId: 1,
            remainingLeaves: 1,
            totalLeaves: 1,
          },
        }
      )
      .sort({ firstName: 1 })
      .toArray();

    const employeeOptions = employees.map((emp) => ({
      value: emp._id.toString(),
      label: `${emp.firstName} ${emp.lastName}`,
      position: emp.position,
      department: emp.department,
      email: emp.email,
      avatar: emp.avatar,
      employeeId: emp.employeeId,
      remainingLeaves: emp.remainingLeaves || 0,
      totalLeaves: emp.totalLeaves || 21,
    }));

    return {
      done: true,
      data: employeeOptions,
    };
  } catch (error) {
    console.error("Error fetching leave request employees:", error);
    return { done: false, error: error.message };
  }
};

// Get leave types
export const getLeaveTypes = async (companyId) => {
  try {
    const collections = getTenantCollections(companyId);

    // Try to get existing leave types from database
    let leaveTypes = [];
    try {
      const existingTypes = await collections.leaveTypes.find({}).toArray();
      leaveTypes = existingTypes.map((type) => ({
        value: type._id.toString(),
        label: type.name,
        maxDays: type.maxDays,
        description: type.description,
      }));
    } catch (error) {
      console.log("Leave types collection not found, using default types");
    }

    // If no custom leave types found, use default ones
    if (leaveTypes.length === 0) {
      leaveTypes = [
        {
          value: "annual",
          label: "Annual Leave",
          maxDays: 21,
          description: "Annual vacation leave",
        },
        {
          value: "medical",
          label: "Medical Leave",
          maxDays: 30,
          description: "Medical/sick leave",
        },
        {
          value: "casual",
          label: "Casual Leave",
          maxDays: 12,
          description: "Casual leave for personal matters",
        },
        {
          value: "maternity",
          label: "Maternity Leave",
          maxDays: 90,
          description: "Maternity leave",
        },
        {
          value: "paternity",
          label: "Paternity Leave",
          maxDays: 15,
          description: "Paternity leave",
        },
        {
          value: "emergency",
          label: "Emergency Leave",
          maxDays: 7,
          description: "Emergency leave",
        },
      ];
    }

    return {
      done: true,
      data: leaveTypes,
    };
  } catch (error) {
    console.error("Error fetching leave types:", error);
    return { done: false, error: error.message };
  }
};

// Get employee leave balance
export const getEmployeeLeaveBalance = async (companyId, employeeId) => {
  try {
    const collections = getTenantCollections(companyId);

    const employee = await collections.employees.findOne({
      _id: new ObjectId(employeeId),
    });

    if (!employee) {
      return { done: false, error: "Employee not found" };
    }

    // Calculate used leaves this year
    const currentYear = new Date().getFullYear();
    const usedLeaves = await collections.leaves.countDocuments({
      employeeId: new ObjectId(employeeId),
      status: { $in: ["Approved", "Taken"] },
      year: currentYear,
    });

    const totalLeaves = employee.totalLeaves || 21;
    const remainingLeaves = totalLeaves - usedLeaves;

    return {
      done: true,
      data: {
        totalLeaves,
        usedLeaves,
        remainingLeaves: Math.max(0, remainingLeaves),
        employeeName: `${employee.firstName} ${employee.lastName}`,
      },
    };
  } catch (error) {
    console.error("Error fetching employee leave balance:", error);
    return { done: false, error: error.message };
  }
};

// Create leave request
export const createLeaveRequest = async (companyId, userId, leaveData) => {
  try {
    const collections = getTenantCollections(companyId);

    // Generate leave request ID
    const lastRequest = await collections.leaves.findOne(
      {},
      { sort: { createdAt: -1 } }
    );

    let nextId = 1;
    if (lastRequest && lastRequest.requestId) {
      const lastIdNumber = parseInt(lastRequest.requestId.replace("LR-", ""));
      nextId = lastIdNumber + 1;
    }

    const requestId = `LR-${String(nextId).padStart(4, "0")}`;

    // Calculate number of days
    const fromDate = new Date(leaveData.fromDate);
    const toDate = new Date(leaveData.toDate);
    const timeDiff = toDate.getTime() - fromDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

    const newLeaveRequest = {
      ...leaveData,
      requestId,
      employeeId: new ObjectId(leaveData.employeeId),
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: "Pending",
      numberOfDays: daysDiff,
      year: new Date().getFullYear(),
      isDeleted: false,
    };

    const result = await collections.leaves.insertOne(newLeaveRequest);

    // Add activity log
    const employee = await collections.employees.findOne({
      _id: new ObjectId(leaveData.employeeId),
    });

    if (employee) {
      await collections.activities.insertOne({
        employeeId: new ObjectId(leaveData.employeeId),
        action: "Leave Request Created",
        description: `Leave request created for ${employee.firstName} ${employee.lastName} (${leaveData.leaveType}) from ${leaveData.fromDate} to ${leaveData.toDate}`,
        createdAt: new Date(),
      });
    }

    return {
      done: true,
      data: { ...newLeaveRequest, _id: result.insertedId },
    };
  } catch (error) {
    console.error("Error creating leave request:", error);
    return { done: false, error: error.message };
  }
};

// Get leave request modal data (all data in one call)
export const getLeaveRequestModalData = async (companyId) => {
  try {
    const [employees, leaveTypes] = await Promise.all([
      getLeaveRequestEmployees(companyId),
      getLeaveTypes(companyId),
    ]);

    return {
      done: true,
      data: {
        employees: employees.data,
        leaveTypes: leaveTypes.data,
      },
    };
  } catch (error) {
    console.error("Error fetching leave request modal data:", error);
    return { done: false, error: error.message };
  }
};
// Add these functions to admin.services.js

/**
 * Fetches all employees and clients and merges them into a single list.
 */
export const getAllUsers = async (companyId, filters = {}) => {
  const { employees, clients } = getTenantCollections(companyId);
  const query = {};

  // 1. Build the query based on filters
  if (filters.status && filters.status !== 'All') {
    query.status = filters.status;
  }
  if (filters.dateRange?.startDate) {
    query.createdAt = {
      $gte: new Date(filters.dateRange.startDate),
      $lte: new Date(filters.dateRange.endDate),
    };
  }

  // 2. Build the sort options
  const sortOptions = {};
  switch (filters.sortBy) {
    case 'name_asc':
      sortOptions.name = 1;
      break;
    case 'name_desc':
      sortOptions.name = -1;
      break;
    case 'recent':
    default:
      sortOptions.createdAt = -1;
      break;
  }

  // 3. Conditionally fetch from collections based on role filter
  let employeeDocs = [];
  let clientDocs = [];

  if (filters.role === 'Employee') {
    employeeDocs = await employees.find(query).sort(sortOptions).toArray();
  } else if (filters.role === 'Client') {
    clientDocs = await clients.find(query).sort(sortOptions).toArray();
  } else {
    // Fetch from both if role is 'All' or undefined
    employeeDocs = await employees.find(query).sort(sortOptions).toArray();
    clientDocs = await clients.find(query).sort(sortOptions).toArray();
  }

  // 4. Map and combine results
  const formattedEmployees = employeeDocs.map(emp => ({
    _id: emp._id,
    name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
    image_url: emp.avatar || "default_avatar.png",
    email: emp.email,
    created_date: emp.createdAt,
    role: 'Employee',
    status: emp.status || 'Active',
  }));

  const formattedClients = clientDocs.map(client => ({
    _id: client._id,
    name: client.name,
    image_url: client.logo || "default_avatar.png",
    email: client.email,
    created_date: client.createdAt,
    role: 'Client',
    status: client.status || 'Active',
  }));
  
  const combinedUsers = [...formattedEmployees, ...formattedClients];

  return { done: true, data: combinedUsers };
};

/**
 * Creates a new user in the correct collection based on their role.
 */
export const createUser = async (companyId, userData) => {
  const { role, ...restOfData } = userData;
  const collections = getTenantCollections(companyId);
  
  // 1. Choose the collection based on the role.
  const collection = role === 'Employee' ? collections.employees : collections.clients;
  
  // 2. Insert the new user data into the collection.
  await collection.insertOne({ ...restOfData, createdAt: new Date() });
  
  return { done: true, message: "User created successfully." };
};

/**
 * Updates a user in the correct collection.
 */
export const updateUser = async (companyId, userId, updatedData) => {
  const collections = getTenantCollections(companyId);
  
  // Determine which collection to update based on the user's role
  const collection = updatedData.role === 'Employee' ? collections.employees : collections.clients;

  // Prepare the data for the database update
  // We separate the id and role, as we don't want to update those fields
  const { _id, role, ...dataToSet } = updatedData;
  
  const result = await collection.updateOne(
    { _id: new ObjectId(userId) },
    { $set: dataToSet }
  );

  if (result.matchedCount === 0) {
      // If the user wasn't found in the first collection, try the other one.
      // This handles cases where a user's role might be changed.
      const otherCollection = updatedData.role === 'Employee' ? collections.clients : collections.employees;
      await otherCollection.deleteOne({ _id: new ObjectId(userId) }); // Delete from old collection
      await collection.insertOne({ _id: new ObjectId(userId), ...dataToSet, role: updatedData.role, createdAt: new Date() }); // Insert into new
  }
  
  return { done: true, message: "User updated successfully." };
};

/**
 * Deletes a user from the correct collection.
 */
export const deleteUser = async (companyId, userId) => {
  const { employees, clients } = getTenantCollections(companyId);
  
  // 1. Attempt to delete from the employees collection.
  const employeeResult = await employees.deleteOne({ _id: new ObjectId(userId) });
  
  // 2. If not found in employees, attempt to delete from clients.
  if (employeeResult.deletedCount === 0) {
    await clients.deleteOne({ _id: new ObjectId(userId) });
  }
  
  return { done: true, message: "User deleted successfully." };
};

// Add todo
export const addTodo = async (companyId, userId, todoData) => {
  try {
    const collections = getTenantCollections(companyId);

    const newTodo = {
      ...todoData,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      completed: false,
      isDeleted: false,
    };

    const result = await collections.todos.insertOne(newTodo);

    // Add activity log
    await collections.activities.insertOne({
      employeeId: userId,
      action: "Todo Created",
      description: `Created new todo: ${todoData.title}`,
      createdAt: new Date(),
    });

    return {
      done: true,
      data: { ...newTodo, _id: result.insertedId },
    };
  } catch (error) {
    console.error("Error adding todo:", error);
    return { done: false, error: error.message };
  }
};

// Update todo
export const updateTodo = async (companyId, todoId, updateData) => {
  try {
    const collections = getTenantCollections(companyId);

    const result = await collections.todos.updateOne(
      { _id: new ObjectId(todoId) },
      { 
        $set: {
          ...updateData,
          updatedAt: new Date(),
        }
      }
    );

    if (result.matchedCount === 0) {
      return { done: false, error: "Todo not found" };
    }

    // Add activity log
    await collections.activities.insertOne({
      employeeId: updateData.createdBy || "system",
      action: "Todo Updated",
      description: `Updated todo: ${updateData.title || "Todo"}`,
      createdAt: new Date(),
    });

    return {
      done: true,
      data: { _id: todoId, ...updateData },
    };
  } catch (error) {
    console.error("Error updating todo:", error);
    return { done: false, error: error.message };
  }
};

// Delete todo (soft delete)
export const deleteTodo = async (companyId, todoId) => {
  try {
    const collections = getTenantCollections(companyId);

    const result = await collections.todos.updateOne(
      { _id: new ObjectId(todoId) },
      { 
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          updatedAt: new Date(),
        }
      }
    );

    if (result.matchedCount === 0) {
      return { done: false, error: "Todo not found" };
    }

    // Add activity log
    await collections.activities.insertOne({
      employeeId: "system",
      action: "Todo Deleted",
      description: `Deleted todo with ID: ${todoId}`,
      createdAt: new Date(),
    });

    return {
      done: true,
      message: "Todo deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting todo:", error);
    return { done: false, error: error.message };
  }
};

// Delete todo permanently
export const deleteTodoPermanently = async (companyId, todoId) => {
  try {
    const collections = getTenantCollections(companyId);

    const result = await collections.todos.deleteOne({
      _id: new ObjectId(todoId),
    });

    if (result.deletedCount === 0) {
      return { done: false, error: "Todo not found" };
    }

    // Add activity log
    await collections.activities.insertOne({
      employeeId: "system",
      action: "Todo Permanently Deleted",
      description: `Permanently deleted todo with ID: ${todoId}`,
      createdAt: new Date(),
    });

    return {
      done: true,
      message: "Todo permanently deleted",
    };
  } catch (error) {
    console.error("Error permanently deleting todo:", error);
    return { done: false, error: error.message };
  }
};

// Get todo statistics
export const getTodoStatistics = async (companyId, filter = "all") => {
  try {
    const collections = getTenantCollections(companyId);

    // Build the base query
    let query = {
      isDeleted: { $ne: true }
    };

    // Add date filter if applicable
    const now = new Date();
    let dateFilter = {};

    switch (filter) {
      case "today":
        const startOfToday = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        const endOfToday = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + 1
        );
        dateFilter = {
          createdAt: { $gte: startOfToday, $lt: endOfToday },
        };
        break;
      case "week":
        const weekStart = startOfWeek(now);
        const weekEnd = endOfWeek(now);
        dateFilter = {
          createdAt: { $gte: weekStart, $lte: weekEnd },
        };
        break;
      case "month":
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        dateFilter = {
          createdAt: { $gte: monthStart, $lte: monthEnd },
        };
        break;
    }

    // Add date filter to query if applicable
    if (Object.keys(dateFilter).length > 0) {
      query = { ...query, ...dateFilter };
    }

    const todoStats = await collections.todos
      .aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            completed: {
              $sum: {
                $cond: [{ $eq: ["$completed", true] }, 1, 0],
              },
            },
            pending: {
              $sum: {
                $cond: [{ $eq: ["$completed", false] }, 1, 0],
              },
            },
          },
        },
      ])
      .toArray();

    const stats = todoStats[0] || { total: 0, completed: 0, pending: 0 };

    // Get priority distribution
    const priorityStats = await collections.todos
      .aggregate([
        { $match: query },
        {
          $group: {
            _id: "$priority",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    const priorityDistribution = priorityStats.reduce((acc, stat) => {
      acc[stat._id || "Medium"] = stat.count;
      return acc;
    }, {});

    return {
      done: true,
      data: {
        total: stats.total,
        completed: stats.completed,
        pending: stats.pending,
        completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
        priorityDistribution,
      },
    };
  } catch (error) {
    console.error("Error fetching todo statistics:", error);
    return { done: false, error: error.message };
  }
};