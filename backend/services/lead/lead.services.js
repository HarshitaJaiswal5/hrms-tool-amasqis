import { getTenantCollections } from "../../config/db.js";

function getDateRange(filter) {
  const now = new Date();
  let start, end;
  switch (filter) {
    case "week":
      start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 7);
      break;
    case "month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      break;
    case "year":
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear() + 1, 0, 1);
      break;
    default:
      start = null;
      end = null;
  }
  return { start, end };
}

const getDashboardData = async (
  companyId, filter = "week", dateRange = null, newLeadsFilter = "week",
  newLeadsDashboardFilter = "week", pipelineYear = null, lostLeadsReasonFilter = "thisMonth", leadsByCompaniesFilter = "thisMonth", leadsBySourceFilter = "thisMonth", topCountriesFilter = "thisMonth"
) => {
  try {
    const now = new Date();
    // Optimized logging - only log essential info
    console.log("[LeadDashboard] Fetching data for companyId:", companyId);
    
    const collections = getTenantCollections(companyId);
    const leadsCollection = collections.leads;
    const stagesCollection = collections.stages;
    const pipelinesCollection = collections.pipelines;
    const activitiesCollection = collections.activities;
    const companiesCollection = collections.companies;
    const employeesCollection = collections.employees;
    const tasksCollection = collections.tasks;
    const jobApplicationsCollection = collections.jobApplications;
    const clientsCollection = collections.clients;
    
    // Collections initialized
    
    // Debug: Check if there are any leads in the database
    try {
      const totalLeadsCount = await leadsCollection.countDocuments({});
      console.log("[LeadDashboard] Total leads in database:", totalLeadsCount);
      
      // Check a few sample leads to see their structure
      const sampleLeads = await leadsCollection.find({}).limit(3).toArray();
      console.log("[LeadDashboard] Sample leads structure:", sampleLeads);
      
      // Check if company field exists in leads
      const leadsWithCompany = await leadsCollection.find({ company: { $exists: true } }).limit(3).toArray();
      console.log("[LeadDashboard] Leads with company field:", leadsWithCompany);
      
      // Check all unique company values
      const companies = await leadsCollection.distinct("company");
      console.log("[LeadDashboard] All unique companies:", companies);
      
    } catch (error) {
      console.error("[LeadDashboard] Error checking leads count:", error);
    }

    // Build date filter based on dateRange
    let dateFilter = {};
    if (dateRange && dateRange.start && dateRange.end) {
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      // Date filter applied
      dateFilter = {
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      };
    } else {
      // Fallback to filter-based date range
      const { start, end } = getDateRange(filter);
      if (start && end) {
        dateFilter = {
          createdAt: {
            $gte: start,
            $lt: end
          }
        };
      }
    }

    // If pipelineYear is provided, override dateFilter for pipeline stages
    let pipelineYearFilter = { ...dateFilter };
    if (pipelineYear) {
      const yearStart = new Date(Number(pipelineYear), 0, 1);
      const yearEnd = new Date(Number(pipelineYear) + 1, 0, 1);
      pipelineYearFilter = {
        createdAt: {
          $gte: yearStart,
          $lt: yearEnd
        }
      };
      // Pipeline year filter applied
    }

    // Date filters ready

    // Build new leads filter based on newLeadsFilter
    let newLeadsDateFilter = {};
    const { start: newLeadsStart, end: newLeadsEnd } = getDateRange(newLeadsFilter);
    if (newLeadsStart && newLeadsEnd) {
      newLeadsDateFilter = {
        createdAt: {
          $gte: newLeadsStart,
          $lt: newLeadsEnd
        }
      };
    }
    // New leads filter ready
    
    // 1. TOTAL LEADS - All leads in the selected date range
    let totalLeads = 0;
    let newLeads = 0;
    let lostLeads = 0;
    let totalCustomers = 0;
    
    try {
      if (dateFilter && Object.keys(dateFilter).length > 0) {
        totalLeads = await leadsCollection.countDocuments(dateFilter);
        
        // NEW LEADS: Calculate leads created within last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        newLeads = await leadsCollection.countDocuments({
          createdAt: {
            $gte: sevenDaysAgo,
            $lte: new Date()
          }
        });
        
        lostLeads = await leadsCollection.countDocuments({ 
          stage: "Lost",
          ...dateFilter 
        });
        totalCustomers = await leadsCollection.countDocuments({ 
          stage: "Closed",
          ...dateFilter 
        });
      } else {
        // Fallback: get all metrics without date filter
        totalLeads = await leadsCollection.countDocuments({});
        
        // NEW LEADS: Calculate leads created within last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        newLeads = await leadsCollection.countDocuments({
          createdAt: {
            $gte: sevenDaysAgo,
            $lte: new Date()
          }
        });
        
        lostLeads = await leadsCollection.countDocuments({ stage: "Lost" });
        totalCustomers = await leadsCollection.countDocuments({ stage: "Closed" });
      }
    } catch (error) {
      console.error("[LeadDashboard] Error fetching main metrics:", error);
      // Keep default values (0)
    }

    // 5. PIPELINE STAGES - Apply pipelineYearFilter to pipeline stages
    let pipelineStagesAgg = [];
    let pipelineStagesMonthly = [];
    try {
      if (pipelineYearFilter && Object.keys(pipelineYearFilter).length > 0) {
        // Get total counts for summary cards
        pipelineStagesAgg = await leadsCollection.aggregate([
          { $match: pipelineYearFilter },
          { $group: { _id: "$stage", count: { $sum: 1 } } }
        ]).toArray();

        // Get monthly breakdown for the chart
        pipelineStagesMonthly = await leadsCollection.aggregate([
          { $match: pipelineYearFilter },
          {
            $group: {
              _id: {
                stage: "$stage",
                month: { $month: "$createdAt" }
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { "_id.month": 1 } }
        ]).toArray();
      } else {
        // Fallback: get pipeline stages without date filter
        pipelineStagesAgg = await leadsCollection.aggregate([
          { $group: { _id: "$stage", count: { $sum: 1 } } }
        ]).toArray();

        // Get monthly breakdown without date filter
        pipelineStagesMonthly = await leadsCollection.aggregate([
          {
            $group: {
              _id: {
                stage: "$stage",
                month: { $month: "$createdAt" }
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { "_id.month": 1 } }
        ]).toArray();
      }
    } catch (error) {
      console.error("[LeadDashboard] Error fetching pipeline stages:", error);
      pipelineStagesAgg = [];
      pipelineStagesMonthly = [];
    }

    const pipelineStages = {};
    // Initialize with 0 for all pipeline stages according to business logic
    pipelineStages["Contacted"] = 0;
    pipelineStages["Opportunity"] = 0;
    pipelineStages["Not Contacted"] = 0;
    pipelineStages["Closed"] = 0;
    pipelineStages["Lost"] = 0;

    // Fill in actual counts from database
    pipelineStagesAgg.forEach(s => {
      if (s._id && pipelineStages.hasOwnProperty(s._id)) {
        pipelineStages[s._id] = s.count;
      }
    });

    // Process monthly data for chart - Focus on Closed leads and their income
    const monthlyData = {
      contacted: new Array(12).fill(0),
      opportunity: new Array(12).fill(0),
      notContacted: new Array(12).fill(0),
      closed: new Array(12).fill(0),
      lost: new Array(12).fill(0),
      closedIncome: new Array(12).fill(0) // NEW: for income from closed leads
    };

    pipelineStagesMonthly.forEach(item => {
      const month = item._id.month - 1; // Convert to 0-based index
      const stage = item._id.stage;
      const count = item.count;

      switch(stage) {
        case "Contacted":
          monthlyData.contacted[month] = count;
          break;
        case "Opportunity":
          monthlyData.opportunity[month] = count;
          break;
        case "Not Contacted":
          monthlyData.notContacted[month] = count;
          break;
        case "Closed":
          monthlyData.closed[month] = count;
          break;
        case "Lost":
          monthlyData.lost[month] = count;
          break;
      }
    });

    // NEW: Get income data for closed leads per month
    let closedLeadsIncomeMonthly = [];
    try {
      if (pipelineYearFilter && Object.keys(pipelineYearFilter).length > 0) {
        closedLeadsIncomeMonthly = await leadsCollection.aggregate([
          { $match: { stage: "Closed", ...pipelineYearFilter } },
          {
            $group: {
              _id: { month: { $month: "$createdAt" } },
              totalIncome: { $sum: "$value" }
            }
          },
          { $sort: { "_id.month": 1 } }
        ]).toArray();
      } else {
        // Fallback: get closed leads income without date filter
        closedLeadsIncomeMonthly = await leadsCollection.aggregate([
          { $match: { stage: "Closed" } },
          {
            $group: {
              _id: { month: { $month: "$createdAt" } },
              totalIncome: { $sum: "$value" }
            }
          },
          { $sort: { "_id.month": 1 } }
        ]).toArray();
      }
    } catch (error) {
      console.error("[LeadDashboard] Error fetching closed leads income:", error);
      closedLeadsIncomeMonthly = [];
    }

    // Map closed leads income to monthlyData
    closedLeadsIncomeMonthly.forEach(item => {
      const month = item._id.month - 1;
      monthlyData.closedIncome[month] = Math.round((item.totalIncome || 0) / 1000); // Store in thousands
    });

    console.log("[LeadDashboard] Closed leads income monthly data:", {
      closedLeadsIncomeMonthly: closedLeadsIncomeMonthly,
      monthlyData: monthlyData,
      closedIncome: monthlyData.closedIncome
    });

    // Add monthly data to the result
    pipelineStages.monthlyData = monthlyData;
    
    // 6. LOST LEADS BY REASON - Only for leads with stage="Lost" in the selected date range
    let lostLeadsReasonDateFilter = {};
    // Use current date to match the actual data
    const nowForLostLeads = new Date();
    if (lostLeadsReasonFilter === 'thisMonth') {
      // Use updatedAt to filter by when the lead was actually lost (current month)
      lostLeadsReasonDateFilter = {
        updatedAt: {
          $gte: new Date(nowForLostLeads.getFullYear(), nowForLostLeads.getMonth(), 1),
          $lt: new Date(nowForLostLeads.getFullYear(), nowForLostLeads.getMonth() + 1, 1)
        }
      };
    } else if (lostLeadsReasonFilter === 'thisWeek') {
      const startOfWeek = new Date(nowForLostLeads);
      startOfWeek.setDate(nowForLostLeads.getDate() - nowForLostLeads.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);
      lostLeadsReasonDateFilter = {
        updatedAt: {
          $gte: startOfWeek,
          $lt: endOfWeek
        }
      };
    } else if (lostLeadsReasonFilter === 'lastWeek') {
      const startOfLastWeek = new Date(nowForLostLeads);
      startOfLastWeek.setDate(nowForLostLeads.getDate() - nowForLostLeads.getDay() - 7);
      startOfLastWeek.setHours(0, 0, 0, 0);
      const endOfLastWeek = new Date(startOfLastWeek);
      endOfLastWeek.setDate(startOfLastWeek.getDate() + 7);
      lostLeadsReasonDateFilter = {
        updatedAt: {
          $gte: startOfLastWeek,
          $lt: endOfLastWeek
        }
      };
    }
    let lostLeadsByReasonAgg = [];
    try {
      if (lostLeadsReasonDateFilter && Object.keys(lostLeadsReasonDateFilter).length > 0) {
        lostLeadsByReasonAgg = await leadsCollection.aggregate([
          { $match: { stage: "Lost", ...lostLeadsReasonDateFilter } },
          { $group: { _id: "$lostReason", count: { $sum: 1 } } }
        ]).toArray();
      } else {
        // Fallback: get lost leads by reason without date filter
        lostLeadsByReasonAgg = await leadsCollection.aggregate([
          { $match: { stage: "Lost" } },
          { $group: { _id: "$lostReason", count: { $sum: 1 } } }
        ]).toArray();
      }
    } catch (error) {
      console.error("[LeadDashboard] Error fetching lost leads by reason:", error);
      lostLeadsByReasonAgg = [];
    }
    
    const lostLeadsByReason = {};
    lostLeadsByReasonAgg.forEach(r => { 
      lostLeadsByReason[r._id || "Unknown"] = r.count; 
    });
    console.log("[LeadDashboard] Final lost leads by reason:", lostLeadsByReason);
    console.log("[LeadDashboard] Lost leads by reason keys:", Object.keys(lostLeadsByReason));
    console.log("[LeadDashboard] Lost leads by reason values:", Object.values(lostLeadsByReason));
    
    // Check if we have data for the selected filter
    if (Object.keys(lostLeadsByReason).length === 0) {
      console.log("[LeadDashboard] No data found for lost leads by reason filter:", lostLeadsReasonFilter);
      // Return a "no data" indicator
      lostLeadsByReason["No Data"] = 0;
    }

    // 7. LEADS BY COMPANIES - Apply date filter
    let leadsByCompaniesDateFilter = {};
    if (leadsByCompaniesFilter === 'thisMonth') {
      // Use a broader date range to include the test data
      const currentYear = now.getFullYear();
      leadsByCompaniesDateFilter = {
        createdAt: {
          $gte: new Date(currentYear, 0, 1), // Start of current year
          $lt: new Date(currentYear + 1, 0, 1) // Start of next year
        }
      };
    } else if (leadsByCompaniesFilter === 'thisWeek') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);
      leadsByCompaniesDateFilter = {
        createdAt: {
          $gte: startOfWeek,
          $lt: endOfWeek
        }
      };
    } else if (leadsByCompaniesFilter === 'lastWeek') {
      const startOfLastWeek = new Date(now);
      startOfLastWeek.setDate(now.getDate() - now.getDay() - 7);
      startOfLastWeek.setHours(0, 0, 0, 0);
      const endOfLastWeek = new Date(startOfLastWeek);
      endOfLastWeek.setDate(startOfLastWeek.getDate() + 7);
      leadsByCompaniesDateFilter = {
        createdAt: {
          $gte: startOfLastWeek,
          $lt: endOfLastWeek
        }
      };
    }
    
    console.log("[LeadDashboard] Leads by companies filter:", leadsByCompaniesFilter);
    console.log("[LeadDashboard] Leads by companies date filter:", leadsByCompaniesDateFilter);
    
    let leadsByCompaniesAgg = [];
    try {
      if (leadsByCompaniesDateFilter && Object.keys(leadsByCompaniesDateFilter).length > 0) {
        console.log("[LeadDashboard] Using date filter for leads by companies");
        leadsByCompaniesAgg = await leadsCollection.aggregate([
          { $match: leadsByCompaniesDateFilter },
          { $group: { _id: "$company", value: { $sum: "$value" }, status: { $first: "$stage" } } },
          { $sort: { value: -1 } },
          { $limit: 5 }
        ]).toArray();
      } else {
        console.log("[LeadDashboard] Using fallback (no date filter) for leads by companies");
        // Fallback: get leads by companies without date filter
        leadsByCompaniesAgg = await leadsCollection.aggregate([
          { $group: { _id: "$company", value: { $sum: "$value" }, status: { $first: "$stage" } } },
          { $sort: { value: -1 } },
          { $limit: 5 }
        ]).toArray();
      }
      
      console.log("[LeadDashboard] Raw leads by companies aggregation result:", leadsByCompaniesAgg);
      
    } catch (error) {
      console.error("[LeadDashboard] Error fetching leads by companies:", error);
      leadsByCompaniesAgg = [];
    }
    
    const leadsByCompanies = leadsByCompaniesAgg.map(c => ({
      name: c._id,
      value: c.value,
      status: c.status
    }));
    console.log("[LeadDashboard] Final leads by companies:", leadsByCompanies);

    // 8. LEADS BY SOURCES - Apply date filter
    let leadsBySourceDateFilter = {};
    if (leadsBySourceFilter === 'thisMonth') {
      // Current month only
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      leadsBySourceDateFilter = {
        createdAt: {
          $gte: new Date(currentYear, currentMonth, 1), // Start of current month
          $lt: new Date(currentYear, currentMonth + 1, 1) // Start of next month
        }
      };
    } else if (leadsBySourceFilter === 'thisWeek') {
      // Current week (Sunday to Saturday)
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);
      leadsBySourceDateFilter = {
        createdAt: {
          $gte: startOfWeek,
          $lt: endOfWeek
        }
      };
    } else if (leadsBySourceFilter === 'lastWeek') {
      // Last week (previous Sunday to Saturday)
      const startOfLastWeek = new Date(now);
      startOfLastWeek.setDate(now.getDate() - now.getDay() - 7);
      startOfLastWeek.setHours(0, 0, 0, 0);
      const endOfLastWeek = new Date(startOfLastWeek);
      endOfLastWeek.setDate(startOfLastWeek.getDate() + 7);
      leadsBySourceDateFilter = {
        createdAt: {
          $gte: startOfLastWeek,
          $lt: endOfLastWeek
        }
      };
    }
    
    console.log("[LeadDashboard] Leads by source filter:", leadsBySourceFilter);
    console.log("[LeadDashboard] Leads by source date filter:", leadsBySourceDateFilter);
    
    // Debug: Check what leads exist in the database with their dates
    try {
      const allLeadsWithDates = await leadsCollection
        .find({}, { projection: { source: 1, createdAt: 1 } })
        .sort({ createdAt: -1 })
        .toArray();
      console.log("[LeadDashboard] All leads with dates:", allLeadsWithDates.map(l => ({ source: l.source, createdAt: l.createdAt })));
    } catch (error) {
      console.error("[LeadDashboard] Error fetching leads for debugging:", error);
    }
    
    let leadsBySourceAgg = [];
    try {
      if (leadsBySourceDateFilter && Object.keys(leadsBySourceDateFilter).length > 0) {
        console.log("[LeadDashboard] Using date filter for leads by source");
        leadsBySourceAgg = await leadsCollection.aggregate([
          { $match: leadsBySourceDateFilter },
          { $group: { _id: "$source", count: { $sum: 1 } } }
        ]).toArray();
      } else {
        console.log("[LeadDashboard] Using fallback (no date filter) for leads by source");
        // Fallback: get leads by source without date filter
        leadsBySourceAgg = await leadsCollection.aggregate([
          { $group: { _id: "$source", count: { $sum: 1 } } }
        ]).toArray();
      }
      
      console.log("[LeadDashboard] Raw leads by source aggregation result:", leadsBySourceAgg);
      
    } catch (error) {
      console.error("[LeadDashboard] Error fetching leads by source:", error);
      leadsBySourceAgg = [];
    }
    
    const leadsBySource = leadsBySourceAgg.map(s => ({ name: s._id, count: s.count }));
    console.log("[LeadDashboard] Final leads by source:", leadsBySource);
    
    // Check if we have data for the selected filter
    if (leadsBySource.length === 0) {
      console.log("[LeadDashboard] No data found for leads by source filter:", leadsBySourceFilter);
      // Return a "no data" indicator
      leadsBySource.push({ name: "No Data", count: 0 });
    }

    // 9. RECENT LEADS - Apply date filter with fallback
    let recentLeads = [];
    try {
      if (dateFilter && Object.keys(dateFilter).length > 0) {
        recentLeads = await leadsCollection.find(dateFilter).sort({ createdAt: -1 }).limit(5).toArray();
      } else {
        // Fallback: get recent leads without date filter
        recentLeads = await leadsCollection.find({}).sort({ createdAt: -1 }).limit(5).toArray();
      }
    } catch (error) {
      console.error("[LeadDashboard] Error fetching recent leads:", error);
      // Fallback to empty array if query fails
      recentLeads = [];
    }

    // 10. TOP COUNTRIES - Apply date filter
    let topCountriesDateFilter = {};
    if (topCountriesFilter === 'thisMonth') {
      topCountriesDateFilter = {
        createdAt: {
          $gte: new Date(now.getFullYear(), now.getMonth(), 1),
          $lt: new Date(now.getFullYear(), now.getMonth() + 1, 1)
        }
      };
    } else if (topCountriesFilter === 'thisWeek') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);
      topCountriesDateFilter = {
        createdAt: {
          $gte: startOfWeek,
          $lt: endOfWeek
        }
      };
    } else if (topCountriesFilter === 'lastWeek') {
      const startOfLastWeek = new Date(now);
      startOfLastWeek.setDate(now.getDate() - now.getDay() - 7);
      startOfLastWeek.setHours(0, 0, 0, 0);
      const endOfLastWeek = new Date(startOfLastWeek);
      endOfLastWeek.setDate(startOfLastWeek.getDate() + 7);
      topCountriesDateFilter = {
        createdAt: {
          $gte: startOfLastWeek,
          $lt: endOfLastWeek
        }
      };
    }
    let topCountriesAgg = [];
    try {
      if (topCountriesDateFilter && Object.keys(topCountriesDateFilter).length > 0) {
        topCountriesAgg = await leadsCollection.aggregate([
          { $match: topCountriesDateFilter },
          { $group: { _id: "$country", leads: { $sum: 1 } } },
          { $sort: { leads: -1 } },
          { $limit: 5 }
        ]).toArray();
      } else {
        // Fallback: get top countries without date filter
        topCountriesAgg = await leadsCollection.aggregate([
          { $group: { _id: "$country", leads: { $sum: 1 } } },
          { $sort: { leads: -1 } },
          { $limit: 5 }
        ]).toArray();
      }
    } catch (error) {
      console.error("[LeadDashboard] Error fetching top countries:", error);
      topCountriesAgg = [];
    }
    
    const topCountries = topCountriesAgg.map(c => ({ name: c._id, leads: c.leads }));
    console.log("[LeadDashboard] Final top countries:", topCountries);
    
    // Check if we have data for the selected filter
    if (topCountries.length === 0) {
      console.log("[LeadDashboard] No data found for top countries filter:", topCountriesFilter);
      // Return a "no data" indicator
      topCountries.push({ name: "No Data", leads: 0 });
    }
    
    // Debug: Log the final response structure
    console.log("[LeadDashboard] Top countries in final response:", topCountries);

    // 11. RECENT ACTIVITIES - Apply date filter with fallback
    let recentActivities = [];
    try {
      if (dateFilter && Object.keys(dateFilter).length > 0) {
        recentActivities = await activitiesCollection.find({ 
          type: "lead",
          ...dateFilter 
        }).sort({ date: -1 }).limit(5).toArray();
      } else {
        // Fallback: get recent activities without date filter
        recentActivities = await activitiesCollection.find({ 
          type: "lead"
        }).sort({ date: -1 }).limit(5).toArray();
      }
    } catch (error) {
      console.error("[LeadDashboard] Error fetching recent activities:", error);
      recentActivities = [];
    }

    // 12. LEAD OWNERS - Apply date filter with fallback
    let leadOwners = [];
    try {
      if (dateFilter && Object.keys(dateFilter).length > 0) {
        const leadOwnersAgg = await leadsCollection.aggregate([
          { $match: dateFilter },
          { $group: { _id: "$owner", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 }
        ]).toArray();
        
        leadOwners = await Promise.all(
          leadOwnersAgg.map(async o => {
            const emp = await employeesCollection.findOne({ _id: o._id });
            return { owner: o._id, count: o.count, name: emp?.name || o._id };
          })
        );
      } else {
        // Fallback: get lead owners without date filter
        const leadOwnersAgg = await leadsCollection.aggregate([
          { $group: { _id: "$owner", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 }
        ]).toArray();
        
        leadOwners = await Promise.all(
          leadOwnersAgg.map(async o => {
            const emp = await employeesCollection.findOne({ _id: o._id });
            return { owner: o._id, count: o.count, name: emp?.name || o._id };
          })
        );
      }
    } catch (error) {
      console.error("[LeadDashboard] Error fetching lead owners:", error);
      leadOwners = [];
    }

    // 13. LEAD TASKS - Apply date filter with fallback
    let leadTasks = [];
    try {
      if (dateFilter && Object.keys(dateFilter).length > 0) {
        leadTasks = await tasksCollection.find({ 
          type: "lead",
          ...dateFilter 
        }).sort({ createdAt: -1 }).limit(5).toArray();
      } else {
        // Fallback: get lead tasks without date filter
        leadTasks = await tasksCollection.find({ 
          type: "lead"
        }).sort({ createdAt: -1 }).limit(5).toArray();
      }
    } catch (error) {
      console.error("[LeadDashboard] Error fetching lead tasks:", error);
      leadTasks = [];
    }

    // 14. LEAD JOB APPLICATIONS - Apply date filter with fallback
    let leadJobApplications = [];
    try {
      if (dateFilter && Object.keys(dateFilter).length > 0) {
        leadJobApplications = await jobApplicationsCollection.find(dateFilter).sort({ createdAt: -1 }).limit(5).toArray();
      } else {
        // Fallback: get job applications without date filter
        leadJobApplications = await jobApplicationsCollection.find({}).sort({ createdAt: -1 }).limit(5).toArray();
      }
    } catch (error) {
      console.error("[LeadDashboard] Error fetching lead job applications:", error);
      leadJobApplications = [];
    }

    // 15. LEAD CLIENTS - Apply date filter with fallback
    let leadClients = [];
    try {
      if (dateFilter && Object.keys(dateFilter).length > 0) {
        const leadClientsAgg = await leadsCollection.aggregate([
          { $match: dateFilter },
          { $group: { _id: "$client", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 }
        ]).toArray();
        
        leadClients = await Promise.all(
          leadClientsAgg.map(async c => {
            const client = await clientsCollection.findOne({ _id: c._id });
            return { client: c._id, count: c.count, name: client?.name || c._id };
          })
        );
      } else {
        // Fallback: get lead clients without date filter
        const leadClientsAgg = await leadsCollection.aggregate([
          { $group: { _id: "$client", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 }
        ]).toArray();
        
        leadClients = await Promise.all(
          leadClientsAgg.map(async c => {
            const client = await clientsCollection.findOne({ _id: c._id });
            return { client: c._id, count: c.count, name: client?.name || c._id };
          })
        );
      }
    } catch (error) {
      console.error("[LeadDashboard] Error fetching lead clients:", error);
      leadClients = [];
    }

    // Performance optimization: Removed excessive debug logging

    // Optimized New Leads Dashboard Data calculation - Show leads created in selected time period
    let newLeadsDashboardData = [];
    
    // Use newLeadsDashboardFilter for independent control
    if (newLeadsDashboardFilter === 'week') {
      // Get current week data - Monday to Sunday
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); // Monday
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7); // Next Monday
      
      const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      
      // Get all leads in current week
      const leads = await leadsCollection.find({
        createdAt: { 
          $gte: weekStart,
          $lt: weekEnd
        }
      }).toArray();
      
      console.log("[LeadDashboard] Week date range:", { weekStart: weekStart.toISOString(), weekEnd: weekEnd.toISOString() });
      console.log("[LeadDashboard] Found leads for week filter:", leads.length);
      leads.forEach((lead, index) => {
        console.log(`Lead ${index + 1}: ${lead.name || 'Unknown'} - Created: ${new Date(lead.createdAt).toISOString()}`);
      });
      
      // Group by day of week (0=Sunday, 1=Monday, etc.)
      const dayCounts = [0, 0, 0, 0, 0, 0, 0]; // Sun, Mon, Tue, Wed, Thu, Fri, Sat
      
      leads.forEach(lead => {
        const dayOfWeek = new Date(lead.createdAt).getDay(); // 0=Sunday, 1=Monday, etc.
        dayCounts[dayOfWeek]++;
      });
      
      // Map to weekdays (Monday first)
      weekdays.forEach((day, index) => {
        const dayIndex = (index + 1) % 7; // Convert to 0-6 where 0=Sunday
        newLeadsDashboardData.push({ x: day, y: dayCounts[dayIndex] });
      });
      
      console.log("[LeadDashboard] Day counts:", dayCounts);
      console.log("[LeadDashboard] Week data:", newLeadsDashboardData);
      
    } else if (newLeadsDashboardFilter === 'month') {
      // Get current month data
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      // Get all leads in the month
      const leads = await leadsCollection.find({
        createdAt: { 
          $gte: monthStart,
          $lt: monthEnd 
        }
      }).toArray();

      // Calculate week buckets (Week 1, 2, 3, 4, 5)
      const weeks = [0, 0, 0, 0, 0];
      leads.forEach(lead => {
        const date = new Date(lead.createdAt);
        const weekOfMonth = Math.floor((date.getDate() - 1) / 7); // 0-based: 0=Week1, 1=Week2, etc.
        if (weekOfMonth < 5) { // Ensure we don't go beyond 5 weeks
          weeks[weekOfMonth]++;
        }
      });

      for (let i = 0; i < 5; i++) {
        newLeadsDashboardData.push({ x: `Week ${i + 1}`, y: weeks[i] });
      }
      
    } else if (newLeadsDashboardFilter === 'year') {
      // Get current year data
      const now = new Date();
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const yearEnd = new Date(now.getFullYear() + 1, 0, 1);
      
      const yearData = await leadsCollection.aggregate([
        {
          $match: { 
            createdAt: { 
              $gte: yearStart,
              $lt: yearEnd 
            } 
          }
        },
        {
          $group: {
            _id: { $month: "$createdAt" },
            count: { $sum: 1 }
          }
        }
      ]).toArray();
      
      // Map to months
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      console.log("[LeadDashboard] Year aggregation result:", yearData);
      for (let month = 1; month <= 12; month++) {
        const monthData = yearData.find(d => d._id === month) || { count: 0 };
        newLeadsDashboardData.push({ x: monthNames[month - 1], y: monthData.count });
        console.log(`[LeadDashboard] Month ${monthNames[month - 1]} (${month}): ${monthData.count} leads`);
      }
    }
    
    // New leads dashboard data ready
    console.log("[LeadDashboard] Final newLeadsDashboardData:", newLeadsDashboardData);
    console.log("[LeadDashboard] Filter used:", newLeadsDashboardFilter);
    
    // Check if we have data for the selected filter
    if (newLeadsDashboardData.length === 0) {
      console.log("[LeadDashboard] No data found for new leads dashboard filter:", newLeadsDashboardFilter);
      // Return a "no data" indicator
      newLeadsDashboardData.push({ x: "No Data", y: 0 });
    }

    const result = {
      totalLeads,
      newLeads,
      lostLeads,
      totalCustomers,
      pipelineStages,
      lostLeadsByReason,
      leadsByCompanies,
      leadsBySource,
      topCountries,
      recentLeads,
      recentActivities,
      leadOwners,
      leadTasks,
      leadJobApplications,
      leadClients,
      newLeadsDashboardData,
    };

    // Dashboard data ready
    return result;
  } catch (error) {
    console.error("[LeadDashboard] Error in getDashboardData:", error);
    throw error;
  }
};

export default {
  getDashboardData,
};
