import { ObjectId } from "mongodb";
import { DateTime } from "luxon";
import * as hrServices from "../../services/hr/hrm.employee.js";
import * as hrPolicy from "../../services/hr/hrm.policy.js";
import * as hrmDesignation from "../../services/hr/hrm.designation.js"
import * as hrmDepartment from "../../services/hr/hrm.department.js";
import * as hrmEmployee from "../../services/hr/hrm.employee.js"

const hrDashboardController = (socket, io) => {
   const isDevelopment =
        process.env.NODE_ENV === "development" || process.env.NODE_ENV === "production";

    const validateHrAccess = (socket) => {

        if (!socket.companyId) {
            console.error("[HR] Company ID not found in user metadata", { user: socket.user?.sub });
            throw new Error("Company ID not found in user metadata");
        }
        const companyIdRegex = /^[a-zA-Z0-9_-]{3,50}$/;
        if (!companyIdRegex.test(socket.companyId)) {
            console.error(`[HR] Invalid company ID format: ${socket.companyId}`);
            throw new Error("Invalid company ID format");
        }
        if (socket.userMetadata?.companyId !== socket.companyId) {
            console.error(
                `[HR] Company ID mismatch: user metadata has ${socket.userMetadata?.companyId}, socket has ${socket.companyId}`
            );
            throw new Error("Unauthorized: Company ID mismatch");
        }
        if (socket.userMetadata?.role !== "hr") {
            console.error(`[HR] Unauthorized role: ${socket.userMetadata?.role}, HR role required`);
            throw new Error("Unauthorized: HR role required");
        }
        return { companyId: socket.companyId, hrId: socket.user?.sub };
    };

    const withRateLimit = (handler) => {
        return async (...args) => {
            if (isDevelopment) {
                return handler(...args);
            }
            if (typeof socket.checkRateLimit === "function" && !socket.checkRateLimit()) {
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

    const isObject = (val) => val && typeof val === "object" && !Array.isArray(val);

    const validateEmployeeData = (data) => {
        if (typeof data !== "object" || data === null) {
            return "Employee data must be an object";
        }

        const requiredStringFields = [
            "about", "avatarUrl", "companyName", "departmentId",
            "designationId", "employeeId", "firstName", "lastName"
        ];

        for (const field of requiredStringFields) {
            if (!(field in data)) {
                return `Missing required field: ${field}`;
            }
            if (typeof data[field] !== "string" || data[field].trim() === "") {
                return `Field '${field}' must be a non-empty string`;
            }
        }

        // Validate nested account fields
        if (!data.account || typeof data.account !== "object") {
            return "Missing required field: account";
        }
        if (typeof data.account.userName !== "string" || data.account.userName.trim() === "") {
            return "Field 'account.userName' must be a non-empty string";
        }
        if (typeof data.account.password !== "string" || data.account.password.trim() === "") {
            return "Field 'account.password' must be a non-empty string";
        }

        // Validate nested contact fields
        if (!data.contact || typeof data.contact !== "object") {
            return "Missing required field: contact";
        }
        if (typeof data.contact.email !== "string" || data.contact.email.trim() === "") {
            return "Field 'contact.email' must be a non-empty string";
        }
        if (typeof data.contact.phone !== "string" || data.contact.phone.trim() === "") {
            return "Field 'contact.phone' must be a non-empty string";
        }

        if (!("dateOfJoining" in data)) {
            return "Missing required field: dateOfJoining";
        }
        const dateOfJoining = data.dateOfJoining;
        if (typeof dateOfJoining !== "string" && !(dateOfJoining instanceof Date)) {
            if (!dateOfJoining || typeof dateOfJoining.$d !== "object") {
                return "dateOfJoining must be a string, Date object, or valid date wrapper";
            }
        }

        // Validate permissions structure
        if (!isObject(data.enabledModules)) {
            return "enabledModules must be an object";
        }
        for (const [module, enabled] of Object.entries(data.enabledModules)) {
            if (typeof enabled !== "boolean") {
                return `enabledModules.${module} must be boolean`;
            }
        }

        if (!isObject(data.permissions)) {
            return "permissions must be an object";
        }
        const expectedActions = ["read", "write", "create", "delete", "import", "export"];
        for (const [module, perms] of Object.entries(data.permissions)) {
            if (!isObject(perms)) {
                return `permissions.${module} must be an object`;
            }
            for (const action of expectedActions) {
                if (typeof perms[action] !== "boolean") {
                    return `permissions.${module}.${action} must be boolean`;
                }
            }
        }

        return null;
    };

    const validateEmployeeBasicData = (data) => {
        if (typeof data !== "object" || data === null) {
            return "Employee data must be an object";
        }
        const requiredStringFields = [
            "about", "avatarUrl", "companyName", "departmentId",
            "designationId", "employeeId", "firstName", "lastName"
        ];

        for (const field of requiredStringFields) {
            if (!(field in data)) {
                return `Missing required field: ${field}`;
            }
            if (typeof data[field] !== "string" || data[field].trim() === "") {
                return `Field '${field}' must be a non-empty string`;
            }
        }

        if (!data.account || typeof data.account !== "object") {
            return "Missing required field: account";
        }
        if (typeof data.account.userName !== "string" || data.account.userName.trim() === "") {
            return "Field 'account.userName' must be a non-empty string";
        }

        if (!data.contact || typeof data.contact !== "object") {
            return "Missing required field: contact";
        }
        if (typeof data.contact.email !== "string" || data.contact.email.trim() === "") {
            return "Field 'contact.email' must be a non-empty string";
        }
        if (typeof data.contact.phone !== "string" || data.contact.phone.trim() === "") {
            return "Field 'contact.phone' must be a non-empty string";
        }

        if (!("dateOfJoining" in data)) {
            return "Missing required field: dateOfJoining";
        }
        const dateOfJoining = data.dateOfJoining;
        if (typeof dateOfJoining !== "string" && !(dateOfJoining instanceof Date)) {
            if (!dateOfJoining || typeof dateOfJoining.$d !== "object") {
                return "dateOfJoining must be a string, Date object, or valid date wrapper";
            }
        }

        return null;
    };

    const validatePermissionsData = (data) => {
        // Helper function to check if a value is a plain object
        const isObject = (value) => {
            return typeof value === 'object' && value !== null && !Array.isArray(value);
        };

        // Validate enabledModules
        if (!isObject(data.enabledModules)) {
            return "enabledModules must be an object";
        }

        for (const [module, enabled] of Object.entries(data.enabledModules)) {
            if (typeof enabled !== "boolean") {
                return `enabledModules.${module} must be boolean`;
            }
        }

        // Validate permissions
        if (!isObject(data.permissions)) {
            return "permissions must be an object";
        }

        const expectedActions = ["read", "write", "create", "delete", "import", "export"];

        for (const [module, perms] of Object.entries(data.permissions)) {
            if (!isObject(perms)) {
                return `permissions.${module} must be an object`;
            }

            for (const action of expectedActions) {
                if (typeof perms[action] !== "boolean") {
                    return `permissions.${module}.${action} must be boolean`;
                }
            }
        }

        // If all validations pass
        return null;
    };

    socket.on("hr/departments/get", async () => {
        try {
            console.log("[hr/departments/get] Event received with data:", );

            const { companyId, hrId } = validateHrAccess(socket);
            console.log("[hr/departments/get] Access validated - companyId:", companyId, "hrId:", hrId);

            const response = await hrmDepartment.allDepartments(companyId, hrId);
            console.log("[hr/departments/get] Service response:", response);

            socket.emit("hr/departments/get-response", response);
            // console.log("[hr/departments/get] Response emitted");
        } catch (error) {
            console.log("[hr/departments/get] Error:", error);
            socket.emit("hr/departments/get-response", {
                done: false,
                error: "Unexpected error fetching departments",
            });
        }
    });

    socket.on("hrm/employees/get-employee-stats", async (payload) => {
        try {
            const { companyId, hrId } = validateHrAccess(socket);
            const {
                startDate: rawStartDate,
                endDate: rawEndDate,
                departmentId: rawDeparmentId,
                status: rawStatus,
            } = payload || {};

            let startDate = null;
            if (typeof rawStartDate === "string" && rawStartDate.trim() !== "") {
                const sd = new Date(rawStartDate.trim());
                startDate = isNaN(sd.getTime()) ? null : sd;
            }

            let endDate = null;
            if (typeof rawEndDate === "string" && rawEndDate.trim() !== "") {
                const ed = new Date(rawEndDate.trim());
                endDate = isNaN(ed.getTime()) ? null : ed;
            }

            const allowedStatus = ["active", "inactive", "Active", "Inactive"];
            const departmentId =
                typeof rawDeparmentId === "string" ? rawDeparmentId.trim() : "";

            const status =
                typeof rawStatus === "string" && allowedStatus.includes(rawStatus.trim())
                    ? rawStatus.trim()
                    : null;

            const sanitizedFilter = { startDate, endDate, departmentId, status };
            console.log("filters", sanitizedFilter);

            const result = await hrServices.getEmployeesStats(companyId, hrId, sanitizedFilter);

            socket.emit("hrm/employees/get-employee-stats-response", result);
        } catch (error) {
            socket.emit("hrm/employees/get-employee-stats-response", {
                done: false,
                error: error.message || "Unexpected error fetching employee stats",
            });
        }
    });

    socket.on("hrm/employees/get-employee-grid-stats", async (payload) => {
        try {
            const { companyId, hrId } = validateHrAccess(socket);
            const {
                startDate: rawStartDate,
                endDate: rawEndDate,
                designationId: rawdesignationId,
                status: rawStatus,
            } = payload || {};

            let startDate = null;
            if (typeof rawStartDate === "string" && rawStartDate.trim() !== "") {
                const sd = new Date(rawStartDate.trim());
                startDate = isNaN(sd.getTime()) ? null : sd;
            }

            let endDate = null;
            if (typeof rawEndDate === "string" && rawEndDate.trim() !== "") {
                const ed = new Date(rawEndDate.trim());
                endDate = isNaN(ed.getTime()) ? null : ed;
            }

            const allowedStatus = ["Active", "Inactive", "active", "inactive"];

            const designationId =
                typeof rawdesignationId === "string" ? rawdesignationId.trim() : "";

            const status =
                typeof rawStatus === "string" && allowedStatus.includes(rawStatus.trim())
                    ? rawStatus.trim()
                    : null;

            const sanitizedFilter = { startDate, endDate, designationId, status };
            const result = await hrServices.getEmployeeGridsStats(companyId, hrId, sanitizedFilter);

            socket.emit("hrm/employees/get-employee-grid-stats-response", result);
        } catch (error) {
            console.log(error);
            socket.emit("hrm/employees/get-employee-frid-stats-response", {
                done: false,
                error: error.message || "Unexpected error fetching employee stats",
            });
        }
    });

    // crud ops on policy

    socket.on("hr/policy/add", withRateLimit(async (payload) => {
        try {
            const { companyId, hrId } = validateHrAccess(socket);

            if (!payload || typeof payload !== "object") {
                throw new Error("Invalid payload");
            }

            const policyName =
                typeof payload.policyName === "string" ? payload.policyName.trim() : "";

            const department =
                typeof payload.department === "string" ? payload.department.trim() : "";

            const description =
                typeof payload.policyDescription === "string" ? payload.policyDescription.trim() : "";

            const rawDate = payload.effectiveDate;
            const dt = DateTime.fromFormat(rawDate, "yyyy-MM-dd", { zone: "utc" });
            const now = DateTime.utc();

            if (!policyName) {
                throw new Error("Policy name is required");
            }
            if (!department) {
                throw new Error("Department is required");
            }
            if (!description) {
                throw new Error("Description is required");
            }
            if (!dt.isValid) {
                throw new Error("Effective date is invalid or must be in yyyy-MM-dd format");
            }
            if (dt <= now) {
                throw new Error("Effective date must be a date in the future");
            }

            const effectiveDate = dt.toJSDate();

            const policyData = {
                policyName,
                department,
                effectiveDate,
                policyDescription: description,
            };

            const result = await hrPolicy.addPolicy(companyId, hrId, policyData);
            socket.emit("hr/policy/add-response", result);
        } catch (error) {
            socket.emit("hr/policy/add-response", {
                done: false,
                error: error.message || "Unexpected error adding policy",
            });
        }
    })
    );

    socket.on("hr/policy/get", async (payload) => {
        try {
            const { companyId, hrId } = validateHrAccess(socket);

            if (!companyId || !hrId) {
                throw new Error("Missing required parameters");
            }

            const filters = {};
            if (payload && typeof payload === "object") {
                if (typeof payload.department === "string") {
                    filters.department = payload.department.trim();
                }
                if (typeof payload.startDate === "string" && typeof payload.endDate === "string") {
                    filters.startDate = payload.startDate;
                    filters.endDate = payload.endDate;
                }
            }

            const result = await hrPolicy.displayPolicy(companyId, hrId, filters);
            socket.emit("hr/policy/get-response", result);

        } catch (error) {
            socket.emit("hr/policy/get-response", {
                done: false,
                error: error.message || "Unexpected error fetching policies",
            });
        }
    });

    socket.on("hr/policy/update", withRateLimit(async (data) => {
        try {
            const { companyId, hrId } = validateHrAccess(socket);

            if (!data || typeof data !== "object") {
                throw new Error("Invalid payload");
            }

            const policyId = typeof data._id === "string" ? data._id.trim() : "";
            if (!policyId) {
                throw new Error("Policy ID (_id) is required for update");
            }

            const policyName =
                typeof data.policyName === "string" ? data.policyName.trim() : "";

            const department =
                typeof data.department === "string" ? data.department.trim() : "";

            const description =
                typeof data.policyDescription === "string" ? data.policyDescription.trim() : "";

            const rawDate = data.effectiveDate;
            const dt = DateTime.fromISO(rawDate, { zone: "utc" });
            const formattedDate = dt.toFormat("yyyy-MM-dd");
            const now = DateTime.utc();

            if (!policyName) {
                throw new Error("Policy name is required");
            }
            if (!department) {
                throw new Error("Department is required");
            }
            if (!description) {
                throw new Error("Description is required");
            }

            if (dt.isValid) {
                if (dt <= now) {
                    throw new Error("Effective date must be a date in the future");
                }
                const formattedDate = dt.toFormat("yyyy-MM-dd");
            }

            const payload = {
                policyId,
                policyName,
                department,
                effectiveDate: formattedDate,
                policyDescription: description,
            };

            const result = await hrPolicy.updatePolicy(companyId, hrId, payload);
            socket.emit("hr/policy/update-response", result);
        } catch (error) {
            socket.emit("hr/policy/update-response", {
                done: false,
                error: error.message || "Unexpected error updating policy",
            });
        }
    })
    );

    socket.on("hr/policy/delete", withRateLimit(async (data) => {
        try {

            const { companyId, hrId } = validateHrAccess(socket);

            if (!data || typeof data !== "object") {
                throw new Error("Invalid payload");
            }

            const policyId = typeof data._id === "string" ? data._id.trim() : "";
            if (!policyId) {
                throw new Error("Policy ID (_id) is required for deletion");
            }

            const result = await hrPolicy.deletePolicy(companyId, hrId, policyId);
            socket.emit("hr/policy/delete-response", result);
            io.emit('hr/policy/delete', data);
        } catch (error) {
            socket.emit("hr/policy/delete-response", {
                done: false,
                error: error.message || "Unexpected error deleting policy",
            });
        }
    }));

    // crud ops on department

    socket.on("hr/departments/add", withRateLimit(async (data) => {
        try {
            const { companyId, hrId } = validateHrAccess(socket);

            if (!data) {
                throw new Error("Data is required for creation");
            }

            const departmentName = typeof data.departmentName === "string" ? data.departmentName.trim() : "";
            if (!departmentName) {
                throw new Error("Department name and display name are required");
            }

            let status = "";
            if (data.status) {
                status = String(data.status).trim().toLowerCase();
            };
            const isValidStatus = ["active", "inactive"].includes(status);

            const payload = {
                department: departmentName,
                status: isValidStatus ? status : "active",
            };

            const response = await hrmDepartment.addDepartment(companyId, hrId, payload);
            socket.emit("hr/departments/add-response", response);
            // if (socket) {
            //     socket.emit("hr/departmentsStats/get", response);
            // }
        } catch (error) {
            socket.emit("hr/departments/add-response", {
                done: false,
                error: error.message || "Unexpected error adding department",
            });
        }
    }));

    socket.on("hr/departmentsStats/get", async (payload) => {
        try {
            const { companyId, hrId } = validateHrAccess(socket);

            if (!companyId || !hrId) {
                throw new Error("Missing required parameters");
            }

            const filters = {};

            const isValidDate = (dateStr) => {
                const dt = DateTime.fromISO(dateStr, { zone: "utc" });
                return dt.isValid;
            };

            if (payload && typeof payload === "object") {
                // Validate and set status filter
                if (typeof payload.status === "string") {
                    const status = payload.status.trim().toLowerCase();
                    if (status === "active" || status === "inactive" || status === "none") {
                        filters.status = status;
                    } else {
                        throw new Error("Status must be 'active' or 'inactive'");
                    }
                }

                // Validate and set date filters
                if (
                    typeof payload.startDate === "string" &&
                    isValidDate(payload.startDate) &&
                    typeof payload.endDate === "string" &&
                    isValidDate(payload.endDate)
                ) {
                    const startDate = DateTime.fromISO(payload.startDate, { zone: "utc" });
                    const endDate = DateTime.fromISO(payload.endDate, { zone: "utc" });

                    if (startDate > endDate) {
                        throw new Error("Start date cannot be after end date");
                    }

                    filters.startDate = startDate.toISO();
                    filters.endDate = endDate.toISO();
                } else if (
                    (payload.startDate && !payload.endDate) ||
                    (!payload.startDate && payload.endDate)
                ) {
                    throw new Error("Both startDate and endDate must be provided together");
                }

                if (typeof payload.recentlyAdded === "boolean") {
                    filters.recentlyAdded = payload.recentlyAdded;
                }
            }

            const result = await hrmDepartment.displayDepartment(companyId, hrId, filters);
            socket.emit("hr/departmentsStats/get-response", result);
        } catch (error) {
            socket.emit("hr/departmentsStats/get-response", {
                done: false,
                error: error.message || "Unexpected error fetching departments",
            });
        }
    });

    socket.on("hrm/departments/update", withRateLimit(async (data) => {
        try {
            const { companyId, hrId } = validateHrAccess(socket);

            if (!data || typeof data !== "object") {
                throw new Error("Invalid payload");
            }

            const departmentId =
                typeof data._id === "string" && data._id.trim() ? data._id.trim() : "";
            if (!departmentId) throw new Error("Department ID is required for update");

            const department =
                typeof data.department === "string" ? data.department.trim() : "";
            if (!department) throw new Error("Department name is required");

            const status =
                typeof data.status === "string" ? data.status.trim().toLowerCase() : "";
            if (status !== "active" && status !== "inactive") {
                throw new Error("Status must be 'active' or 'inactive'");
            }

            const payload = {
                departmentId,
                department,
                status,
            };

            const result = await hrmDepartment.updateDepartment(companyId, hrId, payload);
            socket.emit("hrm/departments/update-response", result);
        } catch (error) {
            socket.emit("hrm/departments/update-response", {
                done: false,
                error: error.message || "Unexpected error updating department",
            });
        }
    }));

    socket.on("hrm/departments/delete", withRateLimit(async (data) => {
        try {

            const { companyId, hrId } = validateHrAccess(socket);

            if (!data || typeof data !== "object") {
                throw new Error("Invalid payload");
            }

            const departmentId = typeof data._id === "string" ? data._id.trim() : "";
            if (!departmentId) {
                throw new Error("department Id is required for deletion");
            }

            const result = await hrmDepartment.deleteDepartment(companyId, hrId, departmentId);
            socket.emit("hrm/departments/delete-response", result);
            io.emit('hrm/departments/delete', data);
        } catch (error) {
            socket.emit("hrm/departments/delete-response", {
                done: false,
                error: error.message || "Unexpected error deleting policy",
            });
        }
    }));

    // crud ops on designation

    socket.on("hrm/designations/add", withRateLimit(async (data) => {
        try {
            const { companyId, hrId } = validateHrAccess(socket);

            if (!data) {
                throw new Error("Data is required for creation");
            }

            const departmentId = typeof data.departmentId === "string" ? data.departmentId.trim() : "";
            if (!departmentId) {
                throw new Error("Department name and display name are required");
            }
            const designationName = typeof data.designationName === "string" ? data.designationName.trim() : "";
            if (!designationName) {
                throw new Error("Department name and display name are required");
            }

            let status = "";
            if (data.status) {
                status = String(data.status).trim().toLowerCase();
            };
            const isValidStatus = ["active", "inactive"].includes(status);

            const payload = {
                designation: designationName,
                departmentId: departmentId,
                status: isValidStatus ? status : "active",
            };

            const response = await hrmDesignation.addDesignation(companyId, hrId, payload);
            socket.emit("hrm/designations/add-response", response);
        } catch (error) {
            console.log(error);

            socket.emit("hrm/designations/add-response", {
                done: false,
                error: error.message || "Unexpected error adding department",
            });
        }
    }));

    socket.on("hrm/designations/get", async (filters) => {
        try {
            console.log("[hrm/designations/get] Event received with filters:", filters);

            const { companyId, hrId } = validateHrAccess(socket);
            console.log("[hrm/designations/get] Validated access - companyId:", companyId, "hrId:", hrId);

            const sanitizedFilters = {};
            if (filters && typeof filters === "object") {
                if (typeof filters.status === "string" && filters.status.trim() !== "") {
                    const statusTrim = filters.status.trim();
                    if (statusTrim.toLowerCase() !== "none") {
                        sanitizedFilters.status = statusTrim;
                    }
                }
                if (typeof filters.department === "string" && filters.department.trim() !== "") {
                    sanitizedFilters.departmentId = filters.department.trim();
                }
            }
            console.log("[hrm/designations/get] Sanitized filters:", sanitizedFilters);

            const result = await hrmDesignation.displayDesignations(companyId, hrId, sanitizedFilters);
            // console.log("[hrm/designations/get] Service result:", result);

            if (!result.done) {
                console.error("[hrm/designations/get] Service returned failure:", result.error || result.message);
                throw new Error(result.error || result.message || "Failed to display designations");
            }

            socket.emit("hrm/designations/get-response", result);
            console.log("[hrm/designations/get] Response emitted");
        } catch (error) {
            console.error("[hrm/designations/get] Error:", error);
            socket.emit("hrm/designations/get-response", {
                done: false,
                error: error.message || "Unexpected error fetching designations",
            });
        }
    });

    socket.on("hrm/designations/delete", async (data) => {
        try {
            const { companyId, hrId } = validateHrAccess(socket);

            if (!data || typeof data !== "object") {
                throw new Error("Invalid payload");
            }

            const designationId = typeof data._id === "string" ? data._id.trim() : "";
            if (!designationId) {
                throw new Error("Department Id is required for deletion");
            }

            const result = await hrmDesignation.deleteDesignation(companyId, hrId, designationId);

            if (!result.done) {
                throw new Error(result.error || result.message || "Delete failed");
            }

            socket.emit("hrm/designations/delete-response", result);
        } catch (error) {
            console.error("[hrm/designations/delete] Error:", error);
            socket.emit("hrm/designations/delete-response", {
                done: false,
                error: error.message || "Unexpected error deleting department",
            });
        }
    });

    socket.on("hrm/designations/update", async (payload) => {
        try {

            const { companyId, hrId } = validateHrAccess(socket);

            if (!payload || typeof payload !== "object") {
                throw new Error("Invalid payload");
            }

            if (!companyId || !hrId || !payload) {
                throw new Error("Missing required fields: companyId, hrId, and payload are required");
            }

            // Deep clone payload to avoid mutating original object
            payload = { ...payload };

            if (payload.designation && typeof payload.designation === "string") {
                payload.designation = payload.designation.trim();
                if (payload.designation === "") delete payload.designation;
            }

            if (payload.departmentId && typeof payload.departmentId === "string") {
                payload.departmentId = payload.departmentId.trim();
                if (payload.departmentId === "") delete payload.departmentId;
            }

            if (payload.status && typeof payload.status === "string") {
                payload.status = payload.status.trim().toLowerCase();
                if (!["active", "inactive"].includes(payload.status)) delete payload.status;
            }

            if (payload.designationId && typeof payload.designationId === "string") {
                payload.designationId = payload.designationId.trim();
                if (payload.designationId === "") throw new Error("Designation ID is required and cannot be empty");
            } else {
                throw new Error("Designation ID is required");
            }

            const result = await hrmDesignation.updateDesignation(companyId, hrId, payload);
            if (!result.done) {
                throw new Error(result.error || "Failed to update designation");
            }

            socket.emit("hrm/designations/update-response", {
                done: true,
                message: result.message || "Designation updated successfully",
            });
        } catch (error) {
            console.error("[hrm/designations/update] Error:", error);
            socket.emit("hrm/designations/update-response", {
                done: false,
                error: error.message || "Unexpected error updating designation",
            });
        }
    });

    // crud ops on employee

    socket.on("hrm/employees/add", withRateLimit(async (data) => {
        try {
            const { companyId, hrId } = validateHrAccess(socket);
            if (!data) {
                throw new Error("Employee data is required");
            }
            const { employeeData, permissionsData } = data;
            if (!employeeData || typeof employeeData !== "object") {
                throw new Error("Invalid or missing employeeData");
            }
            if (!permissionsData || typeof permissionsData !== "object") {
                throw new Error("Invalid or missing permissionsData");
            }
            // Merge enabledModules & permissions into employeeData for validation convenience
            const mergedData = {
                ...employeeData,
                enabledModules: permissionsData.enabledModules,
                permissions: permissionsData.permissions,
            };

            const validationError = validateEmployeeData(mergedData);

            if (validationError) {
                throw new Error(validationError);
            }

            const response = await hrmEmployee.addEmployee(companyId, hrId, employeeData, permissionsData);

            socket.emit("hrm/employees/add-response", response);
        } catch (error) {
            console.log("Error in hrm/employees/add:", error);
            socket.emit("hrm/employees/add-response", {
                done: false,
                error: error.message || "Unexpected error adding employee",
            });
        }
    }));

    socket.on("hrm/employees/delete", withRateLimit(async (data) => {
        try {

            const { companyId, hrId } = validateHrAccess(socket);

            if (!data || typeof data !== "object") {
                throw new Error("Invalid payload");
            }

            const employeeId = typeof data._id === "string" ? data._id.trim() : "";
            if (!employeeId) {
                throw new Error("Employee Id is required for deletion");
            }

            const result = await hrServices.deleteEmployee(companyId, hrId, employeeId);
            socket.emit("hrm/employees/delete-response", result);
            io.emit('hrm/employees/delete', data);
        } catch (error) {
            socket.emit("hrm/employees/delete-response", {
                done: false,
                error: error.message || "Unexpected error deleting policy",
            });
        }
    }));

    // Update Employee Basic Info
    socket.on("hrm/employees/update", withRateLimit(async (data) => {
        try {
            const { companyId, hrId } = validateHrAccess(socket);

            if (!data || typeof data !== "object") {
                throw new Error("Employee update data is required");
            }

            // You may want to validate here as well
            const employeeId = typeof data.employeeId === "string" ? data.employeeId.trim() : "";
            if (!employeeId) {
                throw new Error("Employee ID is required for update");
            }

            // Optionally validate fields
            const validationError = validateEmployeeBasicData(data);
            if (validationError) throw new Error(validationError);

            const response = await hrmEmployee.updateEmployeeDetails(companyId, hrId, data);

            socket.emit("hrm/employees/update-response", response);
        } catch (error) {
            console.log(error);
            socket.emit("hrm/employees/update-response", {
                done: false,
                error: error.message || "Unexpected error updating employee",
            });
        }
    }));

    // Update Employee Permissions
    socket.on("hrm/employees/update-permissions", withRateLimit(async (data) => {
        try {
            const { companyId, hrId } = validateHrAccess(socket);

            if (!data || typeof data !== "object") {
                throw new Error("Permissions update data is required");
            }

            const employeeId = typeof data.employeeId === "string" ? data.employeeId.trim() : "";
            if (!employeeId) {
                throw new Error("Employee ID is required for permissions update");
            }
            const validationError = validatePermissionsData(data);
            if (validationError) throw new Error(validationError);

            const permissionsPayload = {
                enabledModules: data.enabledModules,
                permissions: data.permissions
            };

            console.log("permissionPayload", permissionsPayload);

            const response = await hrmEmployee.updatePermissions(companyId, hrId, employeeId, permissionsPayload);

            socket.emit("hrm/employees/update-permissions-response", response);
        } catch (error) {
            console.log(error);

            socket.emit("hrm/employees/update-permissions-response", {
                done: false,
                error: error.message || "Unexpected error updating permissions",
            });
        }
    }));

    socket.on("hrm/employees/get-permissions", withRateLimit(async (data) => {
        try {
            const { companyId, hrId } = validateHrAccess(socket);

            if (!data || typeof data !== "object") {
                throw new Error("Permissions get data is required");
            }

            const employeeId = typeof data._id === "string" ? data._id.trim() : "";
            if (!employeeId) {
                throw new Error("Employee ID is required for permissions update");
            }

            const response = await hrmEmployee.getPermissions(companyId, hrId, employeeId);

            socket.emit("hrm/employees/get-permissions-response", response);
        } catch (error) {
            socket.emit("hrm/employees/get-permissions-response", {
                done: false,
                error: error.message || "Unexpected error updating permissions",
            });
        }
    }))

    // cru ops on employee details

    socket.on("hrm/employees/get-details", async (payload) => {
        try {

            const { companyId, hrId } = validateHrAccess(socket);
            
            const employeeId = typeof payload.employeeId === "string" ? payload.employeeId.trim() : "";
            if (!employeeId) {
                throw new Error("Employee ID is required for permissions update");
            }

            const employeeInfoResult = await hrmEmployee.getEmployeeDetails(companyId, hrId, employeeId);

            if (!employeeInfoResult.done) {
                socket.emit("hrm/employees/get-details-response", {
                    done: false,
                    message: employeeInfoResult.message || "Failed to fetch employee info",
                });
                return;
            }

            socket.emit("hrm/employees/get-details-response", {
                done: true,
                data: employeeInfoResult.data,
            });

        } catch (error) {
            console.log(error);
            
            socket.emit("employee/get-full-info-response", {
                done: false,
                message: error.message || "Internal server error",
            });
        }
    });

}
export default hrDashboardController;
