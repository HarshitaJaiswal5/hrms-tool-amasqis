import mongoose from "mongoose";
import { ObjectId } from "mongodb";
import { getTenantCollections } from "../../config/db.js";

export const addPolicy = async (companyId, hrId, policyData) => {
    try {
        if (!companyId || !hrId || !policyData) {
            return { done: false, error: "All fields are required including file upload" };
        }

        const collections = getTenantCollections(companyId);
        const hrExists = await collections.hr.countDocuments({ userId: hrId });
        if (!hrExists) return { done: false, error: "HR not found" };

        if (!policyData.policyName || !policyData.department || !policyData.effectiveDate || !policyData.policyDescription) {
            return { done: false, error: "Policy name, department, description and effective date are required" };
        }
        if (new Date(policyData.effectiveDate) < new Date()) {
            return { done: false, error: "Effective date must be in the future" };
        }

        const result = await collections.policy.insertOne({
            policyName: policyData.policyName,
            department: policyData.department,
            policyDescription: policyData.policyDescription,
            effectiveDate: new Date(policyData.effectiveDate),
            createdBy: hrId,
            createdAt: new Date(),
        });

        return {
            done: true,
            data: {
                _id: result.insertedId,
                ...policyData,
            },
            message: "Policy created successfully"
        };

    } catch (error) {
        return {
            done: false,
            error: `Failed to create policy: ${error.message}`
        };
    }
};

export const displayPolicy = async (companyId, hrId, filters = {}) => {
    try {

        if (!companyId || !hrId) {
            return { done: false, error: "Missing required parameters" };
        }

        const collections = getTenantCollections(companyId);
        const hrExists = await collections.hr.countDocuments({
            userId: hrId
        });
        if (hrExists !== 1) {
            return { done: false, error: "HR not found" };
        }

        const query = {};

        if (filters.department) {
            query.department = filters.department;
        }

        if (filters.startDate && filters.endDate) {
            query.createdAt = {
                $gte: new Date(filters.startDate),
                $lte: new Date(filters.endDate),
            };
        }

        const policies = await collections.policy
            .find(query)
            .sort({ effectiveDate: -1 })
            .toArray();

        return {
            done: true,
            filters: filters,
            data: policies,
            message: policies.length
                ? "Policies fetched successfully"
                : "No policies found matching criteria",
        };

    } catch (error) {
        return {
            done: false,
            error: `Failed to fetch policies: ${error.message}`,
        };
    }
};

export const updatePolicy = async (companyId, hrId, payload) => {
    try {
        if (!companyId || !hrId || !payload) {
            return { done: false, error: "Missing required parameters" };
        }

        const collections = getTenantCollections(companyId);
        const hrExists = await collections.hr.countDocuments({ userId: hrId});
        if (!hrExists) return { done: false, error: "HR not found" };

        if (!payload.policyId) {
            return { done: false, error: "Policy ID not found" };
        }
        if (!payload.policyName || !payload.department || !payload.effectiveDate || !payload.policyDescription) {
            return { done: false, error: "Policy name, department, description and effective date are required" };
        }

        const result = await collections.policy.updateOne(
            { _id: new ObjectId(payload.policyId), },
            {
                $set: {
                    policyName: payload.policyName,
                    department: payload.department,
                    effectiveDate: payload.effectiveDate,
                    policyDescription: payload.policyDescription,
                    updatedBy: hrId,
                    updatedAt: new Date()
                }
            }
        );

        if (result.matchedCount === 0) {
            return { done: false, error: "Policy not found" };
        }

        return {
            done: true,
            data: { policyId: payload.policyId, ...payload.updateData },
            message: "Policy updated successfully"
        };

    } catch (error) {
        return {
            done: false,
            error: `Failed to update policy: ${error.message}`
        };
    }
};

export const deletePolicy = async (companyId, hrId, policyId) => {
    try {
        if (!companyId || !hrId || !policyId) {
            return { done: false, error: "Missing required parameters" };
        }

        const collections = getTenantCollections(companyId);
        const hrExists = await collections.hr.countDocuments({ userId: hrId });
        if (!hrExists) return { done: false, error: "HR not found" };

        const result = await collections.policy.deleteOne({
            _id: new ObjectId(policyId),
        });

        if (result.deletedCount === 0) {
            return { done: false, error: "Policy not found" };
        }

        return {
            done: true,
            data: { policyId },
            message: "Policy deleted successfully"
        };

    } catch (error) {
        return {
            done: false,
            error: `Failed to delete policy: ${error.message}`
        };
    }
};
