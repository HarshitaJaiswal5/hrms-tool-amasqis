import { getsuperadminCollections } from "../../config/db.js";
import { ObjectId } from "mongodb";
import { format } from "date-fns";
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// Fetch dashboard stats for subscriptions
export const fetchSubscriptionStats = async () => {
  try {
    const { companiesCollection, packagesCollection } = getsuperadminCollections();
  
    const aggregationPipeline = [
      {
        $lookup: {
          from: "packages",
          localField: "plan_id",
          foreignField: "_id",
          as: "packageDetails"
        }
      },
      {
        $unwind: {
          path: "$packageDetails",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $facet: {
          // Total transaction amount
          total_transaction: [
            { 
              $match: { 
                status: "Active"
              } 
            },
            { 
              $group: { 
                _id: null, 
                total: { $sum: { $ifNull: ["$packageDetails.price", 0] } } 
              } 
            }
          ],

          // Total subscriptions count
          total_subscribers: [{ $count: "count" }],

          // Active subscribers count
          active_subscribers: [
            { 
              $match: { 
                status: "Active"
              } 
            },
            { $count: "count" }
          ],

          // Expired subscribers count
          expired_subscribers: [
            { 
              $match: { 
                status: "Inactive"
              } 
            },
            { $count: "count" }
          ]
        }
      },
      {
        $project: {
          total_transaction: { $arrayElemAt: ["$total_transaction.total", 0] },
          total_subscribers: { $arrayElemAt: ["$total_subscribers.count", 0] },
          active_subscribers: { $arrayElemAt: ["$active_subscribers.count", 0] },
          expired_subscribers: { $arrayElemAt: ["$expired_subscribers.count", 0] }
        }
      }
    ];

    const [result] = await companiesCollection
      .aggregate(aggregationPipeline)
      .toArray();

    return {
      done: true,
      data: {
        totalTransaction: result?.total_transaction || 0,
        totalSubscribers: result?.total_subscribers || 0,
        activeSubscribers: result?.active_subscribers || 0,
        expiredSubscribers: result?.expired_subscribers || 0
      }
    };
  } catch (error) {
    console.error("Error fetching subscription stats:", error);
    return { done: false, error: error.message };
  }
};

export const fetchSubscriptions = async () => {
  try {
    const { companiesCollection, packagesCollection } = getsuperadminCollections();

    // Fetch all companies with their package details
    const subscriptions = await companiesCollection.aggregate([
      {
        $addFields: {
          plan_id_obj: { $toObjectId: "$plan_id" }
        }
      },
      {
        $lookup: {
          from: "packages",
          localField: "plan_id_obj",
          foreignField: "_id",
          as: "packageDetails"
        }
      },
      {
        $unwind: {
          path: "$packageDetails",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          address: 1,
          logo: 1,
          status: 1,
          plan_id: 1,
          plan_name: 1,
          plan_type: 1,
          createdAt: 1,
          packageDetails: {
            price: 1,
            planName: 1,
            planType: 1,
            trialDays: 1
          }
        }
      },
      {
        $sort: {
          createdAt: -1 // Sort by creation date, newest first
        }
      }
    ]).toArray();

    // Format subscription data for frontend
    const data = subscriptions.map((sub) => {
      // Created date
      const createdDate = sub.createdAt ? new Date(sub.createdAt) : new Date();
      
      // Expiry date calculation based on plan type
      let expDate = new Date(createdDate);
      if (sub.plan_type === "Yearly") {
        expDate.setFullYear(expDate.getFullYear() + 1);
      } else {
        expDate.setMonth(expDate.getMonth() + 1);
      }

      // Status logic
      const now = new Date();
      let status = sub.status;
      if (now > expDate) status = "Expired";
      else if (sub.status === "Active") status = "Paid";

      return {
        id: sub._id?.toString(),
        companyId: sub._id?.toString(),
        planId: sub.plan_id?.toString(),
        CompanyName: sub.name || "Unknown Company",
        Image: sub.logo || "company-default.svg",
        Plan: `${sub.plan_name} (${sub.plan_type})`,
        BillCycle: sub.plan_type === "Yearly" ? 365 : 30,
        Amount: sub.packageDetails?.price || 0,
        CreatedDate: createdDate.toISOString(),
        ExpiringDate: expDate.toISOString(),
        Status: status,
        CompanyEmail: sub.email || "",
        CompanyAddress: sub.address || ""
      };
    });

    return { done: true, data };
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    return { done: false, error: error.message };
  }
};

export const generateInvoicePDF = async (invoiceData) => {
  try {
    console.log("Starting PDF generation for invoice:", invoiceData);
    
    // Validate required data
    if (!invoiceData.companyId) {
      throw new Error("Company ID is required");
    }
    if (!invoiceData.planId) {
      throw new Error("Plan ID is required");
    }

    const { companiesCollection, packagesCollection } = getsuperadminCollections();
    
    // Fetch complete data from database
    console.log("Fetching company and package data...");
    const [company, packageDetails] = await Promise.all([
      companiesCollection.findOne({ _id: new ObjectId(invoiceData.companyId) }),
      packagesCollection.findOne({ _id: new ObjectId(invoiceData.planId) })
    ]);

    if (!company) {
      throw new Error(`Company not found with ID: ${invoiceData.companyId}`);
    }
    if (!packageDetails) {
      throw new Error(`Package not found with ID: ${invoiceData.planId}`);
    }

    // Create PDF document with proper margins
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      bufferPages: true
    });

    const fileName = `invoice_${invoiceData.companyId}_${Date.now()}.pdf`;
    const tempDir = path.join(process.cwd(), 'temp');
    const filePath = path.join(tempDir, fileName);
    
    // Create write stream
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Set up fonts and colors
    const primaryColor = '#333333';
    const secondaryColor = '#666666';
    const accentColor = '#0d6efd';
    const pageWidth = doc.page.width - 100; // Account for margins

    // Add company header
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .fillColor(primaryColor)
       .text('SmartHR', 50, 50);

    // Add invoice header and details
    doc.fontSize(25)
       .font('Helvetica-Bold')
       .fillColor(primaryColor)
       .text('INVOICE', { align: 'right' })
       .moveDown(0.5);

    // Invoice details with more spacing
    doc.fontSize(12)
       .font('Helvetica')
       .fillColor(secondaryColor)
       .text(`Invoice Number: INV${invoiceData.companyId.slice(-4).toUpperCase()}`, { align: 'right' })
       .text(`Issue Date: ${format(new Date(), 'dd/MM/yyyy')}`, { align: 'right' })
       .text(`Due Date: ${format(new Date(company.createdAt), 'dd/MM/yyyy')}`, { align: 'right' })
       .moveDown(3); // Increased spacing from 2 to 3

    // Company and Client Information - Horizontal Layout
    const infoTop = 180; // Increased from 150 to 180 to add more space
    const fromWidth = pageWidth * 0.45; // 45% of page width
    const toWidth = pageWidth * 0.45; // 45% of page width
    const gap = pageWidth * 0.1; // 10% gap

    // From section
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor(primaryColor)
       .text('From:', 50, infoTop)
       .moveDown(0.5);

    doc.fontSize(12)
       .font('Helvetica')
       .fillColor(secondaryColor)
       .text('SmartHR', { width: fromWidth })
       .text('367 Hillcrest Lane, Irvine, California', { width: fromWidth })
       .text('smarthr@example.com', { width: fromWidth });

    // To section - aligned horizontally
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor(primaryColor)
       .text('To:', 50 + fromWidth + gap, infoTop)
       .moveDown(0.5);

    doc.fontSize(12)
       .font('Helvetica')
       .fillColor(secondaryColor)
       .text(company.name || 'N/A', 50 + fromWidth + gap, infoTop + 20, { width: toWidth })
       .text(company.address || 'N/A', 50 + fromWidth + gap, infoTop + 40, { width: toWidth })
       .text(company.email || 'N/A', 50 + fromWidth + gap, infoTop + 60, { width: toWidth });

    // Table header - adjusted position
    const tableTop = infoTop + 120; // Adjusted to maintain proper spacing
    const columnWidth = pageWidth / 5; // Equal width for 5 columns

    // Draw table header background
    doc.rect(50, tableTop - 10, pageWidth, 30)
       .fillColor('#f8f9fa')
       .fill();

    // Table headers with equal spacing
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor(primaryColor)
       .text('Plan', 50, tableTop, { width: columnWidth })
       .text('Billing Cycle', 50 + columnWidth, tableTop, { width: columnWidth })
       .text('Created Date', 50 + columnWidth * 2, tableTop, { width: columnWidth })
       .text('Expiring On', 50 + columnWidth * 3, tableTop, { width: columnWidth })
       .text('Amount', 50 + columnWidth * 4, tableTop, { width: columnWidth });

    // Table content with equal spacing
    doc.fontSize(12)
       .font('Helvetica')
       .fillColor(secondaryColor)
       .text(packageDetails.planName || 'N/A', 50, tableTop + 20, { width: columnWidth })
       .text(packageDetails.planType === "Yearly" ? "365 Days" : "30 Days", 50 + columnWidth, tableTop + 20, { width: columnWidth })
       .text(format(new Date(company.createdAt), 'dd/MM/yyyy'), 50 + columnWidth * 2, tableTop + 20, { width: columnWidth })
       .text(format(new Date(company.createdAt), 'dd/MM/yyyy'), 50 + columnWidth * 3, tableTop + 20, { width: columnWidth })
       .text(`$${packageDetails.price || 0}`, 50 + columnWidth * 4, tableTop + 20, { width: columnWidth });

    // Total section with proper spacing
    const totalTop = tableTop + 60;
    const totalWidth = pageWidth * 0.3; // 30% of page width
    const totalStart = pageWidth - totalWidth + 50; // Right-aligned

    doc.fontSize(12)
       .font('Helvetica')
       .fillColor(secondaryColor)
       .text('Sub Total:', totalStart, totalTop, { width: totalWidth * 0.6 })
       .text(`$${packageDetails.price || 0}`, totalStart + totalWidth * 0.6, totalTop, { width: totalWidth * 0.4, align: 'right' })
       .moveDown(0.5)
       .text('Tax:', totalStart, totalTop + 20, { width: totalWidth * 0.6 })
       .text('$0.00', totalStart + totalWidth * 0.6, totalTop + 20, { width: totalWidth * 0.4, align: 'right' })
       .moveDown(0.5)
       .font('Helvetica-Bold')
       .fillColor(primaryColor)
       .text('Total:', totalStart, totalTop + 40, { width: totalWidth * 0.6 })
       .text(`$${packageDetails.price || 0}`, totalStart + totalWidth * 0.6, totalTop + 40, { width: totalWidth * 0.4, align: 'right' });

    // Terms and Conditions in a box
    const termsTop = totalTop + 80;
    const termsWidth = pageWidth;
    const termsHeight = 120;

    // Draw box
    doc.rect(50, termsTop, termsWidth, termsHeight)
       .strokeColor('#dee2e6')
       .lineWidth(1)
       .stroke();

    // Add terms content with better spacing
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor(primaryColor)
       .text('Terms & Conditions:', 60, termsTop + 15)
       .moveDown(1);

    doc.fontSize(12)
       .font('Helvetica')
       .fillColor(secondaryColor)
       .text('All payments must be made according to the agreed schedule.', 60, termsTop + 40, { width: termsWidth - 20 })
       .text('Late payments may incur additional fees.', 60, termsTop + 60, { width: termsWidth - 20 })
       .moveDown(0.5)
       .text('We are not liable for any indirect, incidental, or consequential damages,', 60, termsTop + 85, { width: termsWidth - 20 })
       .text('including loss of profits, revenue, or data.', 60, termsTop + 105, { width: termsWidth - 20 });

    // Add page numbers
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      
      // Page numbers
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
    
    // Return the file path
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

// Cleanup function to remove old PDFs
export const cleanupInvoicePDFs = async () => {
  try {
    const tempDir = path.join(process.cwd(), 'temp');
    const files = await fs.promises.readdir(tempDir);
    
    // Remove files older than 1 hour
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stats = await fs.promises.stat(filePath);
      
      if (stats.mtimeMs < oneHourAgo) {
        await fs.promises.unlink(filePath);
      }
    }
  } catch (error) {
    console.error("Error cleaning up PDFs:", error);
  }
};
    

    