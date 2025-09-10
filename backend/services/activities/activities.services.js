import { getTenantCollections } from "../../config/db.js";
import { ObjectId } from "mongodb";
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { format } from "date-fns";

// Create new activity
export const createActivity = async (companyId, activityData) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[ActivityService] createActivity", { companyId, activityData });

    const newActivity = {
      ...activityData,
      companyId,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: activityData.status || 'pending',
      isDeleted: false,
      // Handle additional fields
      reminder: activityData.reminder || 'none',
      guests: activityData.guests || null,
      
    };

    const result = await collections.activities.insertOne(newActivity);
    console.log("[ActivityService] insertOne result", { result });

    if (result.insertedId) {
      const inserted = await collections.activities.findOne({ _id: result.insertedId });
      console.log("[ActivityService] inserted activity", { inserted });
      return { done: true, data: inserted };
    } else {
      console.error("[ActivityService] Failed to insert activity");
      return { done: false, error: "Failed to insert activity" };
    }
  } catch (error) {
    console.error("[ActivityService] Error in createActivity", { error: error.message });
    return { done: false, error: error.message };
  }
};

// Get all activities with filters
export const getActivities = async (companyId, filters = {}) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[ActivityService] getActivities", { companyId, filters });
    
    const query = { companyId, isDeleted: { $ne: true } };

    // Apply filters
    // Activity Type
    if (Array.isArray(filters.activityType) && filters.activityType.length > 0) {
      query.activityType = { $in: filters.activityType };
    } else if (filters.activityType && filters.activityType !== 'all') {
      query.activityType = filters.activityType;
    }
    
    // Owner
    if (Array.isArray(filters.owner) && filters.owner.length > 0) {
      query.owner = { $in: filters.owner };
    } else if (filters.owner && filters.owner !== 'all') {
      query.owner = filters.owner;
    }

    // Date range filter
    if (filters.startDate && filters.endDate) {
      query.dueDate = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate)
      };
    }

    // Sort by dueDate descending (most recent first)
    const sort = { dueDate: -1 };

    console.log("[ActivityService] Final query", { query, sort });
    const activities = await collections.activities.find(query).sort(sort).toArray();
    console.log("[ActivityService] found activities", { count: activities.length });
    
    // Ensure dates are properly converted to Date objects
    const processedActivities = activities.map(activity => ({
      ...activity,
      createdAt: activity.createdAt ? new Date(activity.createdAt) : null,
      updatedAt: activity.updatedAt ? new Date(activity.updatedAt) : null,
      dueDate: activity.dueDate ? new Date(activity.dueDate) : null
    }));
    
    return { done: true, data: processedActivities };
  } catch (error) {
    console.error("[ActivityService] Error in getActivities", { error: error.message });
    return { done: false, error: error.message };
  }
};

// Get single activity by ID
export const getActivityById = async (companyId, activityId) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[ActivityService] getActivityById", { companyId, activityId });
    
    if (!ObjectId.isValid(activityId)) {
      console.error("[ActivityService] Invalid ObjectId format", { activityId });
      return { done: false, error: "Invalid activity ID format" };
    }
    
    const activity = await collections.activities.findOne({ 
      _id: new ObjectId(activityId), 
      companyId,
      isDeleted: { $ne: true }
    });
    
    if (!activity) {
      console.error("[ActivityService] Activity not found", { activityId });
      return { done: false, error: "Activity not found" };
    }
    
    // Ensure dates are properly converted
    const processedActivity = {
      ...activity,
      createdAt: activity.createdAt ? new Date(activity.createdAt) : null,
      updatedAt: activity.updatedAt ? new Date(activity.updatedAt) : null,
      dueDate: activity.dueDate ? new Date(activity.dueDate) : null
    };
    
    return { done: true, data: processedActivity };
  } catch (error) {
    console.error("[ActivityService] Error in getActivityById", { error: error.message });
    return { done: false, error: error.message };
  }
};

// Update activity
export const updateActivity = async (companyId, activityId, updateData) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[ActivityService] updateActivity", { companyId, activityId, updateData });
    
    if (!ObjectId.isValid(activityId)) {
      console.error("[ActivityService] Invalid ObjectId format", { activityId });
      return { done: false, error: "Invalid activity ID format" };
    }
    
    // First check if activity exists
    const existingActivity = await collections.activities.findOne({ 
      _id: new ObjectId(activityId),
      companyId,
      isDeleted: { $ne: true }
    });
    
    if (!existingActivity) {
      console.error("[ActivityService] Activity not found for update", { activityId });
      return { done: false, error: "Activity not found" };
    }
    
    // Prepare update data
    const updateFields = {
      ...updateData,
      updatedAt: new Date()
    };
    
    // Update the activity
    const result = await collections.activities.updateOne(
      { _id: new ObjectId(activityId), companyId },
      { $set: updateFields }
    );
    
    console.log("[ActivityService] update result", { result });
    
    if (result.matchedCount === 0) {
      console.error("[ActivityService] Activity not found for update", { activityId });
      return { done: false, error: "Activity not found" };
    }
    
    // Get the updated activity
    const updatedActivity = await collections.activities.findOne({ _id: new ObjectId(activityId) });
    console.log("[ActivityService] updated activity", { updatedActivity });
    
    return { done: true, data: updatedActivity };
  } catch (error) {
    console.error("[ActivityService] Error in updateActivity", { error: error.message });
    return { done: false, error: error.message };
  }
};

// Delete activity (soft delete)
export const deleteActivity = async (companyId, activityId) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[ActivityService] deleteActivity", { companyId, activityId });
    
    if (!ObjectId.isValid(activityId)) {
      console.error("[ActivityService] Invalid ObjectId format", { activityId });
      return { done: false, error: "Invalid activity ID format" };
    }
    
    // First check if activity exists
    const existingActivity = await collections.activities.findOne({ 
      _id: new ObjectId(activityId),
      companyId,
      isDeleted: { $ne: true }
    });
    
    if (!existingActivity) {
      console.error("[ActivityService] Activity not found for delete", { activityId });
      return { done: false, error: "Activity not found" };
    }
    
    // Soft delete the activity
    const result = await collections.activities.updateOne(
      { _id: new ObjectId(activityId), companyId },
      { 
        $set: { 
          isDeleted: true, 
          deletedAt: new Date(),
          updatedAt: new Date()
        } 
      }
    );
    
    console.log("[ActivityService] delete result", { result });
    
    if (result.matchedCount === 0) {
      console.error("[ActivityService] Activity not found for delete", { activityId });
      return { done: false, error: "Activity not found" };
    }
    
    return { done: true, data: existingActivity };
  } catch (error) {
    console.error("[ActivityService] Error in deleteActivity", { error: error.message });
    return { done: false, error: error.message };
  }
};

// Get activity statistics
export const getActivityStats = async (companyId) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[ActivityService] getActivityStats", { companyId });
    
    const pipeline = [
      { $match: { companyId, isDeleted: { $ne: true } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          overdue: { $sum: { $cond: [{ $and: [{ $lt: ["$dueDate", new Date()] }, { $ne: ["$status", "completed"] }] }, 1, 0] } }
        }
      }
    ];
    
    const stats = await collections.activities.aggregate(pipeline).toArray();
    const result = stats[0] || { total: 0, pending: 0, completed: 0, overdue: 0 };
    
    // Get activity type distribution
    const typePipeline = [
      { $match: { companyId, isDeleted: { $ne: true } } },
      { $group: { _id: "$activityType", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ];
    
    const typeStats = await collections.activities.aggregate(typePipeline).toArray();
    
    return { 
      done: true, 
      data: {
        ...result,
        typeDistribution: typeStats
      }
    };
  } catch (error) {
    console.error("[ActivityService] Error in getActivityStats", { error: error.message });
    return { done: false, error: error.message };
  }
};

// Get activity owners (for filter dropdown)
export const getActivityOwners = async (companyId) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[ActivityService] getActivityOwners", { companyId });
    
    const owners = await collections.activities.distinct("owner", { 
      companyId, 
      isDeleted: { $ne: true },
      owner: { $exists: true, $ne: null }
    });
    
    return { done: true, data: owners };
  } catch (error) {
    console.error("[ActivityService] Error in getActivityOwners", { error: error.message });
    return { done: false, error: error.message };
  }
};

// Export activities as PDF
export const exportActivitiesPDF = async (companyId) => {
  try {
    console.log("Starting PDF generation for activities:", companyId);
    
    if (!companyId) {
      throw new Error("Company ID is required");
    }

    const collections = getTenantCollections(companyId);
    
    if (!collections || !collections.activities) {
      throw new Error("Activities collection not found for company");
    }
    
    // Fetch all activities for the company
    const activities = await collections.activities.find({ 
      companyId, 
      isDeleted: { $ne: true } 
    }).sort({ createdAt: -1 }).toArray();

    if (!activities || activities.length === 0) {
      throw new Error("No activities found for export");
    }

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      bufferPages: true
    });

    const fileName = `activities_${companyId}_${Date.now()}.pdf`;
    const tempDir = path.join(process.cwd(), 'temp');
    const filePath = path.join(tempDir, fileName);
    
    // Create write stream
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Set up fonts and colors
    const primaryColor = '#333333';
    const secondaryColor = '#666666';
    const accentColor = '#0d6efd';
    const pageWidth = doc.page.width - 100;

    // Add header
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .fillColor(primaryColor)
       .text('Activities Report', 50, 50)
       .moveDown(0.5);

    // Add report details
    doc.fontSize(12)
       .font('Helvetica')
       .fillColor(secondaryColor)
       .text(`Generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, { align: 'right' })
       .text(`Total Activities: ${activities.length}`, { align: 'right' })
       .moveDown(2);

    // Table header
    const tableTop = 150;
    const columnWidth = pageWidth / 6;

    // Draw table header background
    doc.rect(50, tableTop - 10, pageWidth, 30)
       .fillColor('#f8f9fa')
       .fill();

    // Table headers
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor(primaryColor)
       .text('Title', 50, tableTop, { width: columnWidth })
       .text('Activity Type', 50 + columnWidth, tableTop, { width: columnWidth })
       .text('Due Date', 50 + columnWidth * 2, tableTop, { width: columnWidth })
       .text('Owner', 50 + columnWidth * 3, tableTop, { width: columnWidth })
       .text('Created Date', 50 + columnWidth * 5, tableTop, { width: columnWidth });

    // Table content
    let currentY = tableTop + 20;
    activities.forEach((activity, index) => {
      // Check if we need a new page
      if (currentY > doc.page.height - 100) {
        doc.addPage();
        currentY = 50;
      }

      // Helper function to safely format dates
      const formatDate = (dateValue) => {
        try {
          if (!dateValue) return 'N/A';
          const date = new Date(dateValue);
          if (isNaN(date.getTime())) return 'N/A';
          return format(date, 'dd/MM/yyyy');
        } catch (error) {
          console.warn('Date formatting error:', error);
          return 'N/A';
        }
      };

      doc.fontSize(9)
         .font('Helvetica')
         .fillColor(secondaryColor)
         .text(activity.title || 'N/A', 50, currentY, { width: columnWidth })
         .text(activity.activityType || 'N/A', 50 + columnWidth, currentY, { width: columnWidth })
         .text(formatDate(activity.dueDate), 50 + columnWidth * 2, currentY, { width: columnWidth })
         .text(activity.owner || 'N/A', 50 + columnWidth * 3, currentY, { width: columnWidth })
         .text(formatDate(activity.createdAt), 50 + columnWidth * 5, currentY, { width: columnWidth });

      currentY += 20;
    });

    // Add page numbers
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#999999')
         .text(`Page ${i + 1} of ${pages.count}`, 50, doc.page.height - 30, {
           align: 'center'
         });
    }

    // Finalize PDF
    doc.end();

    // Wait for stream to finish
    await new Promise((resolve, reject) => {
      stream.on('finish', () => {
        console.log("PDF file written successfully");
        resolve();
      });
      stream.on('error', (err) => {
        console.error("Error writing PDF file:", err);
        reject(err);
      });
    });

    // Verify file exists
    if (!fs.existsSync(filePath)) {
      throw new Error("PDF file was not created");
    }

    console.log("PDF generation completed successfully");
    
    return {
      done: true,
      data: {
        pdfPath: filePath,
        pdfUrl: `http://localhost:5000/temp/${fileName}`
      }
    };
  } catch (error) {
    console.error("Error generating PDF:", error);
    return { done: false, error: error.message };
  }
};

// Export activities as Excel
export const exportActivitiesExcel = async (companyId) => {
  try {
    console.log("Starting Excel generation for activities:", companyId);
    
    if (!companyId) {
      throw new Error("Company ID is required");
    }

    const collections = getTenantCollections(companyId);
    
    if (!collections || !collections.activities) {
      throw new Error("Activities collection not found for company");
    }
    
    // Fetch all activities for the company
    const activities = await collections.activities.find({ 
      companyId, 
      isDeleted: { $ne: true } 
    }).sort({ createdAt: -1 }).toArray();

    if (!activities || activities.length === 0) {
      throw new Error("No activities found for export");
    }

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Activities');

    // Define columns
    worksheet.columns = [
      { header: 'Title', key: 'title', width: 40 },
      { header: 'Activity Type', key: 'activityType', width: 15 },
      { header: 'Due Date', key: 'dueDate', width: 15 },
      { header: 'Owner', key: 'owner', width: 20 },
      { header: 'Created Date', key: 'createdAt', width: 15 }
    ];

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Helper function to safely format dates
    const formatDate = (dateValue) => {
      try {
        if (!dateValue) return 'N/A';
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return 'N/A';
        return format(date, 'dd/MM/yyyy');
      } catch (error) {
        console.warn('Date formatting error:', error);
        return 'N/A';
      }
    };

    // Add data rows
    activities.forEach(activity => {
      worksheet.addRow({
        title: activity.title || 'N/A',
        activityType: activity.activityType || 'N/A',
        dueDate: formatDate(activity.dueDate),
        owner: activity.owner || 'N/A',
        createdAt: formatDate(activity.createdAt)
      });
    });

    // Add summary row
    const totalRow = worksheet.addRow({
      title: 'TOTAL',
      activityType: activities.length,
      dueDate: '',
      owner: '',
      createdAt: ''
    });
    totalRow.font = { bold: true };
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F0F0' }
    };

    // Generate file
    const fileName = `activities_${companyId}_${Date.now()}.xlsx`;
    const tempDir = path.join(process.cwd(), 'temp');
    const filePath = path.join(tempDir, fileName);

    await workbook.xlsx.writeFile(filePath);

    console.log("Excel generation completed successfully");
    
    return {
      done: true,
      data: {
        excelPath: filePath,
        excelUrl: `http://localhost:5000/temp/${fileName}`
      }
    };
  } catch (error) {
    console.error("Error generating Excel:", error);
    return { done: false, error: error.message };
  }
};