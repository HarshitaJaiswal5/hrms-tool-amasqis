import { ObjectId } from "mongodb";
import * as hrServices from "../../services/hr/hr.services.js";

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

    socket.on("hr/dashboard/get-employee-stats", async (payload) => {
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
            const allowedStatus = ["Active", "Inactive"];

            const designation =
                typeof rawDesignation === "string" && allowedDesignations.includes(rawDesignation.trim())
                    ? rawDesignation.trim()
                    : null;

            const status =
                typeof rawStatus === "string" && allowedStatus.includes(rawStatus.trim())
                    ? rawStatus.trim()
                    : null;

            const sanitizedFilter = { startDate, endDate, designation, status };

            const result = await hrServices.getEmployeeStats(companyId, hrId, sanitizedFilter);

            socket.emit("hr/dashboard/get-employee-stats-response", result);
        } catch (error) {
            socket.emit("hr/dashboard/get-employee-stats-response", {
                done: false,
                error: error.message || "Unexpected error fetching employee stats",
            });
        }
    });

}
export default hrDashboardController;
