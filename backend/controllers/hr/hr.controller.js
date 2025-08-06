import { ObjectId } from "mongodb";
import { DateTime } from "luxon";
import * as hrServices from "../../services/hr/hrm.employee.js";
import * as hrPolicy from "../../services/hr/hrm.policy.js"
import * as hrmDepartment from "../../services/hr/hrm.department.js"

const hrDashboardController = (socket, io) => {
    const isDevelopment = process.env.NODE_ENV === "development";

    const validateHrAccess = (socket) => {
        if (!socket || !socket.companyId || !socket.hrId) {
            throw new Error("Company ID or HR ID not found in user metadata");
        }
        const companyIdRegex = /^[a-zA-Z0-9_-]{3,50}$/;
        if (!companyIdRegex.test(socket.companyId)) {
            throw new Error("Invalid company ID format");
        }
        if (socket.userMetadata?.companyId !== socket.companyId) {
            throw new Error("Unauthorized: Company ID mismatch");
        }
        if (socket.userMetadata?.hrId !== socket.hrId) {
            throw new Error("Unauthorized: HR ID mismatch");
        }
        return {
            companyId: socket.companyId,
            hrId: socket.hrId,
        };
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

    socket.on("hr/departments/get", async (data) => {
        try {
            const { companyId, hrId } = validateHrAccess(socket);
            const response = await hrPolicy.allDepartments(companyId, hrId);
            socket.emit("hr/departments/get-response", response);
        } catch (error) {
            socket.emit("hr/departments/get-response", {
                done: false,
                error: "Unexpected error fetching departments",
            });
        }
    });

    socket.on("hr/employee/get-employee-stats", async (payload) => {
        try {
            const { companyId, hrId } = validateHrAccess(socket);
            const {
                startDate: rawStartDate,
                endDate: rawEndDate,
                designation: rawDesignation,
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

            const allowedDesignations = ["Developer", "Executive", "Manager"];
            const allowedStatus = ["active", "inactive"];

            const designation =
                typeof rawDesignation === "string" && allowedDesignations.includes(rawDesignation.trim())
                    ? rawDesignation.trim()
                    : null;

            const status =
                typeof rawStatus === "string" && allowedStatus.includes(rawStatus.trim())
                    ? rawStatus.trim()
                    : null;

            const sanitizedFilter = { startDate, endDate, designation, status };

            const result = await hrServices.getEmployeesStats(companyId, hrId, sanitizedFilter);

            socket.emit("hr/dashboard/get-employee-stats-response", result);
        } catch (error) {
            socket.emit("hr/dashboard/get-employee-stats-response", {
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
            if (socket) {
                socket.emit("hr/departmentsStats/get", response);
            }
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


}
export default hrDashboardController;
