import * as clientService from "../../services/client/client.services.js";

const clientController = (socket, io) => {
  // Helper to validate company access (pattern from admin.controller.js)
  const validateCompanyAccess = (socket) => {
    if (!socket.companyId) {
      console.error("[Client] Company ID not found in user metadata", { user: socket.user?.sub });
      throw new Error("Company ID not found in user metadata");
    }
    const companyIdRegex = /^[a-zA-Z0-9_-]{3,50}$/;
    if (!companyIdRegex.test(socket.companyId)) {
      console.error(`[Client] Invalid company ID format: ${socket.companyId}`);
      throw new Error("Invalid company ID format");
    }
    if (socket.userMetadata?.companyId !== socket.companyId) {
      console.error(`[Client] Company ID mismatch: user metadata has ${socket.userMetadata?.companyId}, socket has ${socket.companyId}`);
      throw new Error("Unauthorized: Company ID mismatch");
    }
    return socket.companyId;
  };

  // Allow admin and HR roles
  const isAuthorized = socket.userMetadata?.role === "admin" || socket.userMetadata?.role === "hr";

  // CREATE client
  socket.on("client:create", async (data) => {
    try {
      console.log("[Client] client:create event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, data });
      if (!isAuthorized) throw new Error("Unauthorized: Admin or HR role required");
      const companyId = validateCompanyAccess(socket);
      
      // Validate required fields
      if (!data.name || !data.email || !data.company) {
        throw new Error("Name, email, and company are required");
      }
      
      // Always include companyId in the client data
      const result = await clientService.createClient(companyId, { ...data, companyId });
      if (!result.done) {
        console.error("[Client] Failed to create client", { error: result.error });
      }
      socket.emit("client:create-response", result);
      
      // Broadcast to admin and HR rooms to update client lists
      io.to(`admin_room_${companyId}`).emit("client:client-created", result);
      io.to(`hr_room_${companyId}`).emit("client:client-created", result);
    } catch (error) {
      console.error("[Client] Error in client:create", { error: error.message });
      socket.emit("client:create-response", { done: false, error: error.message });
    }
  });

  // GET all clients
  socket.on("client:getAll", async (filters = {}) => {
    try {
      console.log("[Client] client:getAll event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, filters });
      const companyId = validateCompanyAccess(socket);
      const result = await clientService.getClients(companyId, filters);
      if (!result.done) {
        console.error("[Client] Failed to get clients", { error: result.error });
      }
      socket.emit("client:getAll-response", result);
    } catch (error) {
      console.error("[Client] Error in client:getAll", { error: error.message });
      socket.emit("client:getAll-response", { done: false, error: error.message });
    }
  });

  // GET single client by ID
  socket.on("client:getById", async (clientId) => {
    try {
      console.log("[Client] client:getById event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, clientId });
      const companyId = validateCompanyAccess(socket);
      const result = await clientService.getClientById(companyId, clientId);
      if (!result.done) {
        console.error("[Client] Failed to get client", { error: result.error });
      }
      socket.emit("client:getById-response", result);
    } catch (error) {
      console.error("[Client] Error in client:getById", { error: error.message });
      socket.emit("client:getById-response", { done: false, error: error.message });
    }
  });

  // UPDATE client
  socket.on("client:update", async (data) => {
    try {
      console.log("[Client] client:update event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, data });
      if (!isAuthorized) throw new Error("Unauthorized: Admin or HR role required");
      const companyId = validateCompanyAccess(socket);
      
      if (!data._id) {
        throw new Error("Client ID is required for update");
      }
      
      const result = await clientService.updateClient(companyId, data._id, data);
      if (!result.done) {
        console.error("[Client] Failed to update client", { error: result.error });
      }
      socket.emit("client:update-response", result);
      
      // Broadcast to admin and HR rooms to update client lists
      io.to(`admin_room_${companyId}`).emit("client:client-updated", result);
      io.to(`hr_room_${companyId}`).emit("client:client-updated", result);
    } catch (error) {
      console.error("[Client] Error in client:update", { error: error.message });
      socket.emit("client:update-response", { done: false, error: error.message });
    }
  });

  // DELETE client
  socket.on("client:delete", async (clientId) => {
    try {
      console.log("[Client] client:delete event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, clientId });
      if (!isAuthorized) throw new Error("Unauthorized: Admin or HR role required");
      const companyId = validateCompanyAccess(socket);
      
      const result = await clientService.deleteClient(companyId, clientId);
      if (!result.done) {
        console.error("[Client] Failed to delete client", { error: result.error });
      }
      socket.emit("client:delete-response", result);
      
      // Broadcast to admin and HR rooms to update client lists
      io.to(`admin_room_${companyId}`).emit("client:client-deleted", result);
      io.to(`hr_room_${companyId}`).emit("client:client-deleted", result);
    } catch (error) {
      console.error("[Client] Error in client:delete", { error: error.message });
      socket.emit("client:delete-response", { done: false, error: error.message });
    }
  });

  // Get all client data at once (for dashboard)
  socket.on("client:getAllData", async (filters = {}) => {
    try {
      console.log("[Client] client:getAllData event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, filters });
      const companyId = validateCompanyAccess(socket);
      
      const [clients, stats] = await Promise.all([
        clientService.getClients(companyId, filters),
        clientService.getClientStats(companyId)
      ]);
      
      const response = {
        done: true,
        data: {
          clients: clients.data || [],
          stats: stats.data || {}
        }
      };
      
      socket.emit("client:getAllData-response", response);
    } catch (error) {
      console.error("[Client] Error in client:getAllData", { error: error.message });
      socket.emit("client:getAllData-response", { done: false, error: error.message });
    }
  });

  // Export clients as PDF
  socket.on("client:export-pdf", async () => {
    try {
      console.log("[Client] client:export-pdf event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId });
      const companyId = validateCompanyAccess(socket);
      const result = await clientService.exportClientsPDF(companyId);
      socket.emit("client:export-pdf-response", result);
    } catch (error) {
      console.error("[Client] Error in client:export-pdf", { error: error.message });
      socket.emit("client:export-pdf-response", { done: false, error: error.message });
    }
  });

  // Export clients as Excel
  socket.on("client:export-excel", async () => {
    try {
      console.log("[Client] client:export-excel event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId });
      const companyId = validateCompanyAccess(socket);
      const result = await clientService.exportClientsExcel(companyId);
      socket.emit("client:export-excel-response", result);
    } catch (error) {
      console.error("[Client] Error in client:export-excel", { error: error.message });
      socket.emit("client:export-excel-response", { done: false, error: error.message });
    }
  });
};

export default clientController;