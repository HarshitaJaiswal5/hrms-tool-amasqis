import { getTenantCollections } from "../../config/db.js";
import { ObjectId } from "mongodb";
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { format } from "date-fns";

// Create new client
export const createClient = async (companyId, clientData) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[ClientService] createClient", { companyId, clientData });

    const newClient = {
      ...clientData,
      companyId,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: clientData.status || 'Active',
      isDeleted: false,
      contractValue: clientData.contractValue || 0,
      projects: clientData.projects || 0
    };

    const result = await collections.clients.insertOne(newClient);
    console.log("[ClientService] insertOne result", { result });

    if (result.insertedId) {
      const inserted = await collections.clients.findOne({ _id: result.insertedId });
      console.log("[ClientService] inserted client", { inserted });
      return { done: true, data: inserted };
    } else {
      console.error("[ClientService] Failed to insert client");
      return { done: false, error: "Failed to insert client" };
    }
  } catch (error) {
    console.error("[ClientService] Error in createClient", { error: error.message });
    return { done: false, error: error.message };
  }
};

// Get all clients with filters
export const getClients = async (companyId, filters = {}) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[ClientService] getClients", { companyId, filters });
    
    const query = { companyId, isDeleted: { $ne: true } };

    // Apply filters
    if (filters.status && filters.status !== 'All') {
      query.status = filters.status;
    }

    // Search filter
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { company: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } }
      ];
    }

    // Sort options
    let sort = { createdAt: -1 };
    if (filters.sortBy) {
      sort = { [filters.sortBy]: filters.sortOrder === 'asc' ? 1 : -1 };
    }

    console.log("[ClientService] Final query", { query, sort });
    const clients = await collections.clients.find(query).sort(sort).toArray();
    console.log("[ClientService] found clients", { count: clients.length });
    
    // Ensure dates are properly converted to Date objects
    const processedClients = clients.map(client => ({
      ...client,
      createdAt: client.createdAt ? new Date(client.createdAt) : null,
      updatedAt: client.updatedAt ? new Date(client.updatedAt) : null
    }));
    
    return { done: true, data: processedClients };
  } catch (error) {
    console.error("[ClientService] Error in getClients", { error: error.message });
    return { done: false, error: error.message };
  }
};

// Get single client by ID
export const getClientById = async (companyId, clientId) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[ClientService] getClientById", { companyId, clientId });

    if (!ObjectId.isValid(clientId)) {
      return { done: false, error: "Invalid client ID format" };
    }

    const client = await collections.clients.findOne({ 
      _id: new ObjectId(clientId), 
      companyId, 
      isDeleted: { $ne: true } 
    });

    if (!client) {
      return { done: false, error: "Client not found" };
    }

    // Ensure dates are properly converted
    const processedClient = {
      ...client,
      createdAt: client.createdAt ? new Date(client.createdAt) : null,
      updatedAt: client.updatedAt ? new Date(client.updatedAt) : null
    };

    return { done: true, data: processedClient };
  } catch (error) {
    console.error("[ClientService] Error in getClientById", { error: error.message });
    return { done: false, error: error.message };
  }
};

// Update client
export const updateClient = async (companyId, clientId, updateData) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[ClientService] updateClient", { companyId, clientId, updateData });

    if (!ObjectId.isValid(clientId)) {
      return { done: false, error: "Invalid client ID format" };
    }

    const updateFields = {
      ...updateData,
      updatedAt: new Date()
    };

    // Remove _id from update data to prevent conflicts
    delete updateFields._id;

    const result = await collections.clients.updateOne(
      { _id: new ObjectId(clientId), companyId, isDeleted: { $ne: true } },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return { done: false, error: "Client not found" };
    }

    if (result.modifiedCount === 0) {
      return { done: false, error: "No changes made to client" };
    }

    // Return updated client
    const updatedClient = await collections.clients.findOne({ 
      _id: new ObjectId(clientId), 
      companyId 
    });

    const processedClient = {
      ...updatedClient,
      createdAt: updatedClient.createdAt ? new Date(updatedClient.createdAt) : null,
      updatedAt: updatedClient.updatedAt ? new Date(updatedClient.updatedAt) : null
    };

    return { done: true, data: processedClient };
  } catch (error) {
    console.error("[ClientService] Error in updateClient", { error: error.message });
    return { done: false, error: error.message };
  }
};

// Delete client (soft delete)
export const deleteClient = async (companyId, clientId) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[ClientService] deleteClient", { companyId, clientId });

    if (!ObjectId.isValid(clientId)) {
      return { done: false, error: "Invalid client ID format" };
    }

    const result = await collections.clients.updateOne(
      { _id: new ObjectId(clientId), companyId, isDeleted: { $ne: true } },
      { 
        $set: { 
          isDeleted: true, 
          deletedAt: new Date(),
          updatedAt: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
      return { done: false, error: "Client not found" };
    }

    return { done: true, data: { _id: clientId, deleted: true } };
  } catch (error) {
    console.error("[ClientService] Error in deleteClient", { error: error.message });
    return { done: false, error: error.message };
  }
};

// Get client statistics
export const getClientStats = async (companyId) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[ClientService] getClientStats", { companyId });

    const totalClients = await collections.clients.countDocuments({ 
      companyId, 
      isDeleted: { $ne: true } 
    });

    const activeClients = await collections.clients.countDocuments({ 
      companyId, 
      isDeleted: { $ne: true },
      status: 'Active'
    });

    const inactiveClients = await collections.clients.countDocuments({ 
      companyId, 
      isDeleted: { $ne: true },
      status: 'Inactive'
    });

    // New clients in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newClients = await collections.clients.countDocuments({ 
      companyId, 
      isDeleted: { $ne: true },
      createdAt: { $gte: thirtyDaysAgo }
    });

    const stats = {
      totalClients,
      activeClients,
      inactiveClients,
      newClients
    };

    console.log("[ClientService] Client stats", stats);
    return { done: true, data: stats };
  } catch (error) {
    console.error("[ClientService] Error in getClientStats", { error: error.message });
    return { done: false, error: error.message };
  }
};

// Export clients as PDF
export const exportClientsPDF = async (companyId) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[ClientService] exportClientsPDF", { companyId });

    const clients = await collections.clients.find({ 
      companyId, 
      isDeleted: { $ne: true } 
    }).sort({ createdAt: -1 }).toArray();

    const doc = new PDFDocument();
    const fileName = `clients_${companyId}_${Date.now()}.pdf`;
    const tempDir = path.join(process.cwd(), 'temp');
    const filePath = path.join(tempDir, fileName);

    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    doc.pipe(fs.createWriteStream(filePath));

    // Header
    doc.fontSize(20).text('Client Report', 50, 50);
    doc.fontSize(12).text(`Generated on: ${format(new Date(), 'PPP')}`, 50, 80);
    doc.text(`Total Clients: ${clients.length}`, 50, 100);

    let yPosition = 130;

    // Table header
    doc.fontSize(10).text('Name', 50, yPosition);
    doc.text('Company', 200, yPosition);
    doc.text('Email', 350, yPosition);
    doc.text('Status', 500, yPosition);
    doc.text('Created', 580, yPosition);

    yPosition += 20;

    // Draw line under header
    doc.moveTo(50, yPosition).lineTo(650, yPosition).stroke();

    yPosition += 10;

    // Client data
    clients.forEach((client, index) => {
      if (yPosition > 750) {
        doc.addPage();
        yPosition = 50;
      }

      doc.text(client.name || 'N/A', 50, yPosition);
      doc.text(client.company || 'N/A', 200, yPosition);
      doc.text(client.email || 'N/A', 350, yPosition);
      doc.text(client.status || 'N/A', 500, yPosition);
      doc.text(format(new Date(client.createdAt), 'MMM dd, yyyy'), 580, yPosition);

      yPosition += 20;
    });

    doc.end();

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

// Export clients as Excel
export const exportClientsExcel = async (companyId) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[ClientService] exportClientsExcel", { companyId });

    const clients = await collections.clients.find({ 
      companyId, 
      isDeleted: { $ne: true } 
    }).sort({ createdAt: -1 }).toArray();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Clients');

    // Define columns
    worksheet.columns = [
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Company', key: 'company', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Address', key: 'address', width: 40 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'Contract Value', key: 'contractValue', width: 15 },
      { header: 'Projects', key: 'projects', width: 10 },
      { header: 'Created At', key: 'createdAt', width: 20 }
    ];

    // Add data
    clients.forEach(client => {
      worksheet.addRow({
        name: client.name || '',
        company: client.company || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        status: client.status || '',
        contractValue: client.contractValue || 0,
        projects: client.projects || 0,
        createdAt: client.createdAt ? format(new Date(client.createdAt), 'MMM dd, yyyy') : ''
      });
    });

    // Style the header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    const fileName = `clients_${companyId}_${Date.now()}.xlsx`;
    const tempDir = path.join(process.cwd(), 'temp');
    const filePath = path.join(tempDir, fileName);

    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

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