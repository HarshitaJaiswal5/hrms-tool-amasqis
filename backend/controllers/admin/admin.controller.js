import * as adminService from "../../services/admin/admin.services.js";
import { ObjectId } from "mongodb";

const adminController = (socket, io) => {
  // Check if we're in development mode
  const isDevelopment =
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV !== "production";

  const validateCompanyAccess = (socket) => {
    if (!socket.companyId) {
      throw new Error("Company ID not found in user metadata");
    }

    // SECURITY: Validate companyId format (should be alphanumeric, reasonable length)
    const companyIdRegex = /^[a-zA-Z0-9_-]{3,50}$/;
    if (!companyIdRegex.test(socket.companyId)) {
      console.error(
        `Invalid company ID format: ${socket.companyId} for user ${socket.user.sub}`
      );
      throw new Error("Invalid company ID format");
    }

    // SECURITY: Check if user actually belongs to this company
    if (socket.userMetadata?.companyId !== socket.companyId) {
      console.error(
        `Company ID mismatch: user metadata has ${socket.userMetadata?.companyId}, socket has ${socket.companyId}`
      );
      throw new Error("Unauthorized: Company ID mismatch");
    }

    return socket.companyId;
  };

  // SECURITY: Rate limiting wrapper (disabled in development)
  const withRateLimit = (handler) => {
    return async (...args) => {
      // Skip rate limiting in development
      if (isDevelopment) {
        return handler(...args);
      }

      if (!socket.checkRateLimit()) {
        console.warn(`Rate limit exceeded for user ${socket.user.sub}`);
        const eventName = args[0] || "unknown";
        socket.emit(`${eventName}-response`, {
          done: false,
          error: "Rate limit exceeded. Please try again later.",
        });
        return;
      }
      return handler(...args);
    };
  };

  // Get dashboard statistics
  socket.on("admin/dashboard/get-stats", async () => {
    try {
      const companyId = validateCompanyAccess(socket);
      const result = await adminService.getDashboardStats(companyId);
      socket.emit("admin/dashboard/get-stats-response", result);
    } catch (error) {
      socket.emit("admin/dashboard/get-stats-response", {
        done: false,
        error: error.message,
      });
    }
  });

  // Get employees by department
  socket.on(
    "admin/dashboard/get-employees-by-department",
    async (data = {}) => {
      try {
        const companyId = validateCompanyAccess(socket);
        const filter = data?.filter || "all";
        const year = data?.year || new Date().getFullYear();
        const result = await adminService.getEmployeesByDepartment(
          companyId,
          filter,
          year
        );
        socket.emit(
          "admin/dashboard/get-employees-by-department-response",
          result
        );
      } catch (error) {
        socket.emit("admin/dashboard/get-employees-by-department-response", {
          done: false,
          error: error.message,
        });
      }
    }
  );

  // Get employee status distribution
  socket.on("admin/dashboard/get-employee-status", async (data) => {
    try {
      const companyId = validateCompanyAccess(socket);
      const filter = data?.filter || "all";
      const year = data?.year || new Date().getFullYear();
      const result = await adminService.getEmployeeStatus(
        companyId,
        filter,
        year
      );
      socket.emit("admin/dashboard/get-employee-status-response", result);
    } catch (error) {
      socket.emit("admin/dashboard/get-employee-status-response", {
        done: false,
        error: error.message,
      });
    }
  });

  // Get attendance overview
  socket.on("admin/dashboard/get-attendance-overview", async (data) => {
    try {
      const companyId = validateCompanyAccess(socket);
      const filter = data?.filter || "all";
      const year = data?.year || new Date().getFullYear();
      const result = await adminService.getAttendanceOverview(
        companyId,
        filter,
        year
      );
      socket.emit("admin/dashboard/get-attendance-overview-response", result);
    } catch (error) {
      socket.emit("admin/dashboard/get-attendance-overview-response", {
        done: false,
        error: error.message,
      });
    }
  });

  // Get clock in/out data
  socket.on("admin/dashboard/get-clock-inout-data", async (data) => {
    try {
      const companyId = validateCompanyAccess(socket);
      const filter = data?.filter || "all";
      const year = data?.year || new Date().getFullYear();
      const department = data?.department || null;
      const result = await adminService.getClockInOutData(
        companyId,
        filter,
        year,
        department
      );
      socket.emit("admin/dashboard/get-clock-inout-data-response", result);
    } catch (error) {
      socket.emit("admin/dashboard/get-clock-inout-data-response", {
        done: false,
        error: error.message,
      });
    }
  });

  // Get sales overview
  socket.on("admin/dashboard/get-sales-overview", async (data) => {
    try {
      const companyId = validateCompanyAccess(socket);
      const filter = data?.filter || "all";
      const year = data?.year || new Date().getFullYear();
      const department = data?.department || null;
      const result = await adminService.getSalesOverview(
        companyId,
        filter,
        year,
        department
      );
      socket.emit("admin/dashboard/get-sales-overview-response", result);
    } catch (error) {
      socket.emit("admin/dashboard/get-sales-overview-response", {
        done: false,
        error: error.message,
      });
    }
  });

  // Get recent invoices
  socket.on("admin/dashboard/get-recent-invoices", async (data) => {
    try {
      const companyId = validateCompanyAccess(socket);
      const filter = data?.filter || "all";
      const year = data?.year || new Date().getFullYear();
      const invoiceType = data?.invoiceType || "all";
      const result = await adminService.getRecentInvoices(
        companyId,
        filter,
        year,
        invoiceType
      );
      socket.emit("admin/dashboard/get-recent-invoices-response", result);
    } catch (error) {
      socket.emit("admin/dashboard/get-recent-invoices-response", {
        done: false,
        error: error.message,
      });
    }
  });

  // Get employees list
  socket.on("admin/dashboard/get-employees-list", async () => {
    try {
      const companyId = validateCompanyAccess(socket);
      const result = await adminService.getEmployeesList(companyId);
      socket.emit("admin/dashboard/get-employees-list-response", result);
    } catch (error) {
      socket.emit("admin/dashboard/get-employees-list-response", {
        done: false,
        error: error.message,
      });
    }
  });

  // Get job applicants
  socket.on("admin/dashboard/get-job-applicants", async () => {
    try {
      const companyId = validateCompanyAccess(socket);
      const result = await adminService.getJobApplicants(companyId);
      socket.emit("admin/dashboard/get-job-applicants-response", result);
    } catch (error) {
      socket.emit("admin/dashboard/get-job-applicants-response", {
        done: false,
        error: error.message,
      });
    }
  });

  // Get recent activities
  socket.on("admin/dashboard/get-recent-activities", async () => {
    try {
      const companyId = validateCompanyAccess(socket);
      const result = await adminService.getRecentActivities(companyId);
      socket.emit("admin/dashboard/get-recent-activities-response", result);
    } catch (error) {
      socket.emit("admin/dashboard/get-recent-activities-response", {
        done: false,
        error: error.message,
      });
    }
  });

  // Get birthdays
  socket.on("admin/dashboard/get-birthdays", async () => {
    try {
      const companyId = validateCompanyAccess(socket);
      const result = await adminService.getBirthdays(companyId);
      socket.emit("admin/dashboard/get-birthdays-response", result);
    } catch (error) {
      socket.emit("admin/dashboard/get-birthdays-response", {
        done: false,
        error: error.message,
      });
    }
  });

  // Get todos
  socket.on("admin/dashboard/get-todos", async (data) => {
    try {
      const companyId = validateCompanyAccess(socket);
      const userId = socket.user.sub;
      const filter = data?.filter || "all";
      
      const result = await adminService.getTodos(companyId, userId, filter);
      
      socket.emit("admin/dashboard/get-todos-response", result);
    } catch (error) {
      console.error(`[GET TODOS] Error:`, error);
      socket.emit("admin/dashboard/get-todos-response", {
        done: false,
        error: error.message,
      });
    }
  });

  // Get todo statistics
  socket.on("admin/dashboard/get-todo-statistics", async (data) => {
    try {
      const companyId = validateCompanyAccess(socket);
      const filter = data?.filter || "all";
      
      const result = await adminService.getTodoStatistics(companyId, filter);
      
      socket.emit("admin/dashboard/get-todo-statistics-response", result);
    } catch (error) {
      console.error(`[GET TODO STATISTICS] Error:`, error);
      socket.emit("admin/dashboard/get-todo-statistics-response", {
        done: false,
        error: error.message,
      });
    }
  });

  // Get projects data
  socket.on("admin/dashboard/get-projects-data", async (data) => {
    try {
      const companyId = validateCompanyAccess(socket);
      const filter = data?.filter || "all";
      const year = data?.year || new Date().getFullYear();
      const result = await adminService.getProjectsData(
        companyId,
        filter,
        year
      );
      socket.emit("admin/dashboard/get-projects-data-response", result);
    } catch (error) {
      socket.emit("admin/dashboard/get-projects-data-response", {
        done: false,
        error: error.message,
      });
    }
  });

  // Get task statistics
  socket.on("admin/dashboard/get-task-statistics", async (data) => {
    try {
      const companyId = validateCompanyAccess(socket);
      const filter = data?.filter || "all";
      const year = data?.year || new Date().getFullYear();
      const result = await adminService.getTaskStatistics(
        companyId,
        filter,
        year
      );
      socket.emit("admin/dashboard/get-task-statistics-response", result);
    } catch (error) {
      socket.emit("admin/dashboard/get-task-statistics-response", {
        done: false,
        error: error.message,
      });
    }
  });

  // Get schedules
  socket.on("admin/dashboard/get-schedules", async () => {
    try {
      const companyId = validateCompanyAccess(socket);
      const result = await adminService.getSchedules(companyId);
      socket.emit("admin/dashboard/get-schedules-response", result);
    } catch (error) {
      socket.emit("admin/dashboard/get-schedules-response", {
        done: false,
        error: error.message,
      });
    }
  });
  // Get all users (employees and clients combined)
socket.on("admin/users/get", async (filters) => { // Accept filters here
  try {
    const companyId = validateCompanyAccess(socket);
    const result = await adminService.getAllUsers(companyId, filters); // Pass filters to the service
    socket.emit("admin/users/get-response", result);
  } catch (error) {
    socket.emit("admin/users/get-response", {
      done: false,
      error: error.message,
    });
  }
});

// Create a new user
socket.on("admin/users/create", async (userData) => {
  try {
    // const companyId = validateCompanyAccess(socket); // Temporarily disabled for testing
    const companyId = validateCompanyAccess(socket);
    const result = await adminService.createUser(companyId, userData);

    // Respond directly to the sender for immediate feedback
    socket.emit("admin/users/create-response", result);

    // If successful, fetch the updated list and broadcast it to all admins
    if (result.done) {
      const updatedUserList = await adminService.getAllUsers(companyId);
      io.to(`admin_room_${companyId}`).emit(
        "admin/users/list-update",
        updatedUserList
      );
    }
  } catch (error) {
    socket.emit("admin/users/create-response", {
      done: false,
      error: error.message,
    });
  }
});

// Update an existing user
socket.on("admin/users/update", async (data) => {
  try {
    const { userId, updatedData } = data;
    // const companyId = validateCompanyAccess(socket); // Temporarily disabled for testing
    const companyId = validateCompanyAccess(socket);
    const result = await adminService.updateUser(companyId, userId, updatedData);

    socket.emit("admin/users/update-response", result);

    if (result.done) {
      const updatedUserList = await adminService.getAllUsers(companyId);
      io.to(`admin_room_${companyId}`).emit(
        "admin/users/list-update",
        updatedUserList
      );
    }
  } catch (error) {
    socket.emit("admin/users/update-response", {
      done: false,
      error: error.message,
    });
  }
});

// Delete a user
socket.on("admin/users/delete", async (data) => {
  try {
    const { userId } = data;
    // const companyId = validateCompanyAccess(socket); // Temporarily disabled for testing
    const companyId = validateCompanyAccess(socket);
    const result = await adminService.deleteUser(companyId, userId);

    socket.emit("admin/users/delete-response", result);

    if (result.done) {
      const updatedUserList = await adminService.getAllUsers(companyId);
      io.to(`admin_room_${companyId}`).emit(
        "admin/users/list-update",
        updatedUserList
      );
    }
  } catch (error) {
    socket.emit("admin/users/delete-response", {
      done: false,
      error: error.message,
    });
  }
});
  // Get all dashboard data at once
  socket.on("admin/dashboard/get-all-data", async (data = {}) => {
    try {
      const companyId = validateCompanyAccess(socket);
      const userId = socket.user.sub;

      // Extract year from data, default to current year if not provided
      const year = data.year || new Date().getFullYear();
      console.log(`[ADMIN DASHBOARD] Getting all data for year: ${year}`);

      const [
        pendingItems,
        employeeGrowth,
        stats,
        employeesByDepartment,
        employeeStatus,
        attendanceOverview,
        clockInOutData,
        salesOverview,
        recentInvoices,
        employeesList,
        jobApplicants,
        recentActivities,
        birthdays,
        todos,
        projectsData,
        taskStatistics,
        schedules,
      ] = await Promise.all([
        adminService.getPendingItems(companyId, userId, year),
        adminService.getEmployeeGrowth(companyId, year),
        adminService.getDashboardStats(companyId, year),
        adminService.getEmployeesByDepartment(companyId, "all", year),
        adminService.getEmployeeStatus(companyId, "all", year),
        adminService.getAttendanceOverview(companyId, "all", year),
        adminService.getClockInOutData(companyId, "all", year, null),
        adminService.getSalesOverview(companyId, "all", year, null),
        adminService.getRecentInvoices(companyId, "all", year, "all"),
        adminService.getEmployeesList(companyId, year),
        adminService.getJobApplicants(companyId, year),
        adminService.getRecentActivities(companyId, year),
        adminService.getBirthdays(companyId, year),
        adminService.getTodos(companyId, userId, "all", year),
        adminService.getProjectsData(companyId, "all", year),
        adminService.getTaskStatistics(companyId, "all", year),
        adminService.getSchedules(companyId, year),
      ]);

      socket.emit("admin/dashboard/get-all-data-response", {
        done: true,
        data: {
          pendingItems: pendingItems.data,
          employeeGrowth: employeeGrowth.data,
          stats: stats.data,
          employeesByDepartment: employeesByDepartment.data,
          employeeStatus: employeeStatus.data,
          attendanceOverview: attendanceOverview.data,
          clockInOutData: clockInOutData.data,
          salesOverview: salesOverview.data,
          recentInvoices: recentInvoices.data,
          employeesList: employeesList.data,
          jobApplicants: jobApplicants.data,
          recentActivities: recentActivities.data,
          birthdays: birthdays.data,
          todos: todos.data,
          projectsData: projectsData.data,
          taskStatistics: taskStatistics.data,
          schedules: schedules.data,
        },
      });
    } catch (error) {
      socket.emit("admin/dashboard/get-all-data-response", {
        done: false,
        error: error.message,
      });
    }
  });

  // Add todo
  socket.on(
    "admin/dashboard/add-todo",
    withRateLimit(async (todoData) => {
      try {
        console.log("Add todo request received:", { todoData, socketId: socket.id });
        const companyId = validateCompanyAccess(socket);
        const userId = socket.user.sub;

        // SECURITY: Input validation
        if (!todoData || typeof todoData !== "object") {
          console.error("Invalid todo data:", todoData);
          throw new Error("Invalid todo data");
        }

        // Validate required fields
        if (!todoData.title || typeof todoData.title !== "string") {
          throw new Error("Todo title is required and must be a string");
        }

        // Sanitize and validate input
        const sanitizedTodoData = {
          title: todoData.title.trim().substring(0, 200), // Limit title length
          description: todoData.description
            ? todoData.description.trim().substring(0, 1000)
            : "",
          tag: todoData.tag ? todoData.tag.trim().substring(0, 50) : "",
          priority: (() => {
            const priority = todoData.priority?.toLowerCase();
            console.log("Priority validation:", { original: todoData.priority, lowercase: priority });
            const isValid = ["low", "medium", "high"].includes(priority);
            const result = isValid 
              ? todoData.priority.charAt(0).toUpperCase() + todoData.priority.slice(1).toLowerCase()
              : "Medium";
            console.log("Priority result:", result);
            return result;
          })(),
          dueDate:
            todoData.dueDate && !isNaN(new Date(todoData.dueDate))
              ? new Date(todoData.dueDate)
              : null,
          assignedTo: todoData.assignedTo
            ? todoData.assignedTo.trim().substring(0, 100)
            : null,
        };

        console.log("Calling adminService.addTodo with:", { companyId, userId, sanitizedTodoData });
        const result = await adminService.addTodo(companyId, userId, sanitizedTodoData);
        console.log("Add todo service result:", result);

        socket.emit("admin/dashboard/add-todo-response", result);

        // Broadcast updated todos to admin room (get all todos for real-time sync)
        const updatedTodos = await adminService.getTodos(
          companyId,
          userId,
          "all"
        );
        io.to(`admin_room_${companyId}`).emit(
          "admin/dashboard/get-todos-response",
          updatedTodos
        );
      } catch (error) {
        console.error("Error adding todo:", error);
        socket.emit("admin/dashboard/add-todo-response", {
          done: false,
          error: "Failed to add todo. Please try again.",
        });
      }
    })
  );

  // Update todo
  socket.on(
    "admin/dashboard/update-todo",
    withRateLimit(async (todoData) => {
      try {
        const companyId = validateCompanyAccess(socket);
        const userId = socket.user.sub;

        // SECURITY: Input validation
        if (!todoData || !todoData.id || typeof todoData.id !== "string") {
          throw new Error("Invalid todo ID");
        }

        // Validate ObjectId format
        if (!ObjectId.isValid(todoData.id)) {
          throw new Error("Invalid todo ID format");
        }

        // Sanitize update data
        const allowedFields = [
          "title",
          "description",
          "completed",
          "tag",
          "priority",
          "dueDate",
          "assignedTo",
        ];
        const sanitizedUpdates = {};

        Object.keys(todoData).forEach((key) => {
          if (allowedFields.includes(key)) {
            if (key === "title" && typeof todoData[key] === "string") {
              sanitizedUpdates[key] = todoData[key].trim().substring(0, 200);
            } else if (
              key === "description" &&
              typeof todoData[key] === "string"
            ) {
              sanitizedUpdates[key] = todoData[key].trim().substring(0, 1000);
            } else if (
              key === "completed" &&
              typeof todoData[key] === "boolean"
            ) {
              sanitizedUpdates[key] = todoData[key];
            } else if (key === "tag" && typeof todoData[key] === "string") {
              sanitizedUpdates[key] = todoData[key].trim().substring(0, 50);
            } else if (
              key === "priority" &&
              ["low", "medium", "high"].includes(todoData[key]?.toLowerCase())
            ) {
              sanitizedUpdates[key] = todoData[key].charAt(0).toUpperCase() + todoData[key].slice(1).toLowerCase();
            } else if (key === "dueDate" && !isNaN(new Date(todoData[key]))) {
              sanitizedUpdates[key] = new Date(todoData[key]);
            } else if (
              key === "assignedTo" &&
              typeof todoData[key] === "string"
            ) {
              sanitizedUpdates[key] = todoData[key].trim().substring(0, 100);
            }
          }
        });

        const result = await adminService.updateTodo(companyId, todoData.id, sanitizedUpdates);

        socket.emit("admin/dashboard/update-todo-response", result);

        // Broadcast updated todos to admin room (get all todos for real-time sync)
        const updatedTodos = await adminService.getTodos(
          companyId,
          userId,
          "all"
        );
        io.to(`admin_room_${companyId}`).emit(
          "admin/dashboard/get-todos-response",
          updatedTodos
        );
      } catch (error) {
        console.error("Error updating todo:", error);
        socket.emit("admin/dashboard/update-todo-response", {
          done: false,
          error: "Failed to update todo. Please try again.",
        });
      }
    })
  );

  // Delete todo (soft delete)
  socket.on("admin/dashboard/delete-todo", async (todoId) => {
    try {
      const companyId = validateCompanyAccess(socket);
      const userId = socket.user.sub;

      // SECURITY: Input validation
      if (!todoId || typeof todoId !== "string") {
        throw new Error("Invalid todo ID");
      }

      // Validate ObjectId format
      if (!ObjectId.isValid(todoId)) {
        throw new Error("Invalid todo ID format");
      }

      const result = await adminService.deleteTodo(companyId, todoId);

      socket.emit("admin/dashboard/delete-todo-response", result);

      // Broadcast updated todos to admin room (get all todos for real-time sync)
      const updatedTodos = await adminService.getTodos(
        companyId,
        userId,
        "all"
      );
      io.to(`admin_room_${companyId}`).emit(
        "admin/dashboard/get-todos-response",
        updatedTodos
      );
    } catch (error) {
      console.error("Error deleting todo:", error);
      socket.emit("admin/dashboard/delete-todo-response", {
        done: false,
        error: "Failed to delete todo. Please try again.",
      });
    }
  });

  // Delete todo permanently
  socket.on(
    "admin/dashboard/delete-todo-permanently",
    withRateLimit(async (todoId) => {
      try {
        console.log(`[DELETE TODO] Attempting to delete todo: ${todoId}`);
        const companyId = validateCompanyAccess(socket);
        const userId = socket.user.sub;
        console.log(`[DELETE TODO] CompanyId: ${companyId}, UserId: ${userId}`);

        // SECURITY: Input validation
        if (!todoId || typeof todoId !== "string") {
          throw new Error("Invalid todo ID");
        }

        // Validate ObjectId format
        if (!ObjectId.isValid(todoId)) {
          throw new Error("Invalid todo ID format");
        }

        const result = await adminService.deleteTodoPermanently(companyId, todoId);

        socket.emit("admin/dashboard/delete-todo-permanently-response", result);

        // Broadcast updated todos to admin room (get all todos for real-time sync)
        const updatedTodos = await adminService.getTodos(
          companyId,
          userId,
          "all"
        );
        console.log(
          `[DELETE TODO] Broadcasting ${
            updatedTodos.data?.length || 0
          } todos to admin room`
        );
        io.to(`admin_room_${companyId}`).emit(
          "admin/dashboard/get-todos-response",
          updatedTodos
        );
      } catch (error) {
        console.error(`[DELETE TODO] Error deleting todo:`, error);
        socket.emit("admin/dashboard/delete-todo-permanently-response", {
          done: false,
          error: "Failed to delete todo. Please try again.",
        });
      }
    })
  );

  // Get todo tags
  socket.on("admin/dashboard/get-todo-tags", async () => {
    try {
      const companyId = validateCompanyAccess(socket);
      const result = await adminService.getTodoTags(companyId);
      socket.emit("admin/dashboard/get-todo-tags-response", result);
    } catch (error) {
      socket.emit("admin/dashboard/get-todo-tags-response", {
        done: false,
        error: error.message,
      });
    }
  });

  // Get todo assignees
  socket.on("admin/dashboard/get-todo-assignees", async () => {
    try {
      const companyId = validateCompanyAccess(socket);
      const result = await adminService.getTodoAssignees(companyId);
      socket.emit("admin/dashboard/get-todo-assignees-response", result);
    } catch (error) {
      socket.emit("admin/dashboard/get-todo-assignees-response", {
        done: false,
        error: error.message,
      });
    }
  });

  // Get project clients
  socket.on("admin/project/get-clients", async () => {
    try {
      const companyId = validateCompanyAccess(socket);
      const result = await adminService.getProjectClients(companyId);
      socket.emit("admin/project/get-clients-response", result);
    } catch (error) {
      socket.emit("admin/project/get-clients-response", {
        done: false,
        error: error.message,
      });
    }
  });

  // Get project employees
  socket.on("admin/project/get-employees", async () => {
    try {
      const companyId = validateCompanyAccess(socket);
      const result = await adminService.getProjectEmployees(companyId);
      socket.emit("admin/project/get-employees-response", result);
    } catch (error) {
      socket.emit("admin/project/get-employees-response", {
        done: false,
        error: error.message,
      });
    }
  });

  // Get project tags
  socket.on("admin/project/get-tags", async () => {
    try {
      const companyId = validateCompanyAccess(socket);
      const result = await adminService.getProjectTags(companyId);
      socket.emit("admin/project/get-tags-response", result);
    } catch (error) {
      socket.emit("admin/project/get-tags-response", {
        done: false,
        error: error.message,
      });
    }
  });

  // Get project priorities
  socket.on("admin/project/get-priorities", async () => {
    try {
      const result = await adminService.getProjectPriorities();
      socket.emit("admin/project/get-priorities-response", result);
    } catch (error) {
      socket.emit("admin/project/get-priorities-response", {
        done: false,
        error: error.message,
      });
    }
  });

  // Get project statuses
  socket.on("admin/project/get-statuses", async () => {
    try {
      const result = await adminService.getProjectStatuses();
      socket.emit("admin/project/get-statuses-response", result);
    } catch (error) {
      socket.emit("admin/project/get-statuses-response", {
        done: false,
        error: error.message,
      });
    }
  });

  // Generate next project ID
  socket.on("admin/project/generate-id", async () => {
    try {
      const companyId = validateCompanyAccess(socket);
      const result = await adminService.generateNextProjectId(companyId);
      socket.emit("admin/project/generate-id-response", result);
    } catch (error) {
      socket.emit("admin/project/generate-id-response", {
        done: false,
        error: error.message,
      });
    }
  });

  // Add new project
  socket.on("admin/project/add", async (projectData) => {
    try {
      const companyId = validateCompanyAccess(socket);
      const userId = socket.user.sub;
      const result = await adminService.addProject(
        companyId,
        userId,
        projectData
      );
      socket.emit("admin/project/add-response", result);

      // Broadcast to admin room to update project lists
      io.to(`admin_room_${companyId}`).emit(
        "admin/project/project-added",
        result
      );
    } catch (error) {
      socket.emit("admin/project/add-response", {
        done: false,
        error: error.message,
      });
    }
  });

  // Get project modal data (all data in one call)
  socket.on("admin/project/get-modal-data", async () => {
    try {
      const companyId = validateCompanyAccess(socket);

      const [clients, employees, tags, priorities, statuses, projectId] =
        await Promise.all([
          adminService.getProjectClients(companyId),
          adminService.getProjectEmployees(companyId),
          adminService.getProjectTags(companyId),
          adminService.getProjectPriorities(),
          adminService.getProjectStatuses(),
          adminService.generateNextProjectId(companyId),
        ]);

      socket.emit("admin/project/get-modal-data-response", {
        done: true,
        data: {
          clients: clients.data,
          employees: employees.data,
          tags: tags.data,
          priorities: priorities.data,
          statuses: statuses.data,
          projectId: projectId.data.projectId,
        },
      });
    } catch (error) {
      socket.emit("admin/project/get-modal-data-response", {
        done: false,
        error: error.message,
      });
    }
  });

  // Get leave request employees
  socket.on("admin/leave/get-employees", async () => {
    try {
      const companyId = validateCompanyAccess(socket);
      const result = await adminService.getLeaveRequestEmployees(companyId);
      socket.emit("admin/leave/get-employees-response", result);
    } catch (error) {
      socket.emit("admin/leave/get-employees-response", {
        done: false,
        error: error.message,
      });
    }
  });

  // Get leave types
  socket.on("admin/leave/get-types", async () => {
    try {
      const companyId = validateCompanyAccess(socket);
      const result = await adminService.getLeaveTypes(companyId);
      socket.emit("admin/leave/get-types-response", result);
    } catch (error) {
      socket.emit("admin/leave/get-types-response", {
        done: false,
        error: error.message,
      });
    }
  });

  // Get employee leave balance
  socket.on("admin/leave/get-employee-balance", async (data) => {
    try {
      const companyId = validateCompanyAccess(socket);
      const { employeeId } = data;
      const result = await adminService.getEmployeeLeaveBalance(
        companyId,
        employeeId
      );
      socket.emit("admin/leave/get-employee-balance-response", result);
    } catch (error) {
      socket.emit("admin/leave/get-employee-balance-response", {
        done: false,
        error: error.message,
      });
    }
  });

  // Create leave request
  socket.on("admin/leave/create-request", async (leaveData) => {
    try {
      const companyId = validateCompanyAccess(socket);
      const userId = socket.user.sub;
      const result = await adminService.createLeaveRequest(
        companyId,
        userId,
        leaveData
      );
      socket.emit("admin/leave/create-request-response", result);

      // Broadcast to admin room to update leave requests
      io.to(`admin_room_${companyId}`).emit(
        "admin/leave/request-created",
        result
      );
    } catch (error) {
      socket.emit("admin/leave/create-request-response", {
        done: false,
        error: error.message,
      });
    }
  });

  // Get leave request modal data (all data in one call)
  socket.on("admin/leave/get-modal-data", async () => {
    try {
      const companyId = validateCompanyAccess(socket);
      const result = await adminService.getLeaveRequestModalData(companyId);
      socket.emit("admin/leave/get-modal-data-response", result);
    } catch (error) {
      socket.emit("admin/leave/get-modal-data-response", {
        done: false,
        error: error.message,
      });
    }
  });
};

export default adminController;
