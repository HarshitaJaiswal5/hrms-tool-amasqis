
import { addUser } from '../../services/user/user.services.js';
import { getAllEmployees } from '../../services/employee/employee.services.js';
import { getClients } from '../../services/client/client.services.js';

const authorize = (socket, allowedRoles = []) => {
  const userRole = socket.role;
  if (!userRole || !allowedRoles.includes(userRole.toLowerCase())) {
    throw new Error("Forbidden: You do not have permission for this action.");
  }
};

const userSocketController = (socket, io) => {
  console.log(`✅ user.socket.controller.js is now active for socket: ${socket.id}`);

  socket.on("users/get-all", async () => {
    try {
      authorize(socket, ['admin', 'hr']);
      const companyId = socket.companyId;
      if (!companyId) throw new Error("Company ID not found on socket.");

      const employees = await getAllEmployees(companyId);
      const clientsResult = await getClients(companyId);
      
      if (!clientsResult.done) {
        throw new Error(clientsResult.error || "Failed to fetch clients");
      }

      const allUsers = [
        ...employees.map(e => ({ ...e, _id: e._id.toString(), role: 'Employee', name: `${e.firstName} ${e.lastName}` })),
        ...clientsResult.data.map(c => ({ ...c, _id: c._id.toString(), role: 'Client' }))
      ];

      socket.emit("users/get-all-response", {
        done: true,
        data: allUsers,
      });

    } catch (error) {
      console.error("Error in users/get-all:", error.message);
      socket.emit("users/get-all-response", {
        done: false,
        error: error.message,
      });
    }
  });

  socket.on("users/add", async (formData) => {
    try {
      authorize(socket, ['admin']);
      const companyId = socket.companyId;
      if (!companyId) throw new Error("Company ID not found on socket.");

      const result = await addUser({ ...formData, companyId });

      socket.emit("users/add-response", {
        done: true,
        message: "User added successfully!",
        data: result,
      });

    } catch (error) {
      console.error("Error in users/add:", error.message);
      socket.emit("users/add-response", {
        done: false,
        error: error.message,
      });
    }
  });
};

export default userSocketController;