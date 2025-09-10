import React, { useState, useEffect, useRef } from 'react'
import { all_routes } from '../../router/all_routes'
import { Link } from 'react-router-dom'
import ImageWithBasePath from '../../../core/common/imageWithBasePath';
import CommonSelect from '../../../core/common/commonSelect';
import { DatePicker } from 'antd';
import CollapseHeader from '../../../core/common/collapse-header/collapse-header';
import { useSocket } from "../../../SocketContext";
import { Socket } from "socket.io-client";
import { toast, ToastContainer } from "react-toastify";
import dayjs from "dayjs";

type PasswordField = "password" | "confirmPassword";
type PermissionAction = "read" | "write" | "create" | "delete" | "import" | "export";
type PermissionModule = "holidays" | "leaves" | "clients" | "projects" | "tasks" | "chats" | "assets" | "timingSheets";

interface EmployeeStats {
    totalEmployees: number;
    activeCount: number;
    inactiveCount: number;
    newJoinersCount: number;
}

interface Employee {
    _id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    avatarUrl: string;
    account: {
        userName: string;
    },
    contact: {
        email: string;
        phone: string;
    },
    companyName: string;
    departmentId: string;
    designationId: string;
    status: 'Active' | 'Inactive' | 'active' | 'inactive';
    dateOfJoining: string | null;
    about: string;
    role: string;
    enabledModules: Record<PermissionModule, boolean>;
    permissions: Record<PermissionModule, PermissionSet>;
    totalProjects: number;
    completedProjects: number;
    productivity: number;
}

interface Department {
    _id: string;
    department: string;
}

interface Designation {
    _id: string;
    departmentId: string;
    designation: string;
}

interface Option {
    label: string,
    value: string,
}

interface PermissionSet {
    read: boolean;
    write: boolean;
    create: boolean;
    delete: boolean;
    import: boolean;
    export: boolean;
}

const EMPTY_OPTION = { value: '', label: 'Select Designation' };

const department = [
    { value: "Select", label: "Select" },
    { value: "All Department", label: "All Department" },
    { value: "Finance", label: "Finance" },
    { value: "Developer", label: "Developer" },
    { value: "Executive", label: "Executive" },
];
const designation = [
    { value: "Select", label: "Select" },
    { value: "Finance", label: "Finance" },
    { value: "Developer", label: "Developer" },
    { value: "Executive", label: "Executive" },
];

const generateId = (prefix: string): string => {
    const randomNum = Math.floor(1 + Math.random() * 9999);
    const paddedNum = randomNum.toString().padStart(4, '0');
    return `${prefix}-${paddedNum}`;
};

const initialState = {
    enabledModules: {
        holidays: false,
        leaves: false,
        clients: false,
        projects: false,
        tasks: false,
        chats: false,
        assets: false,
        timingSheets: false,
    },
    permissions: {
        holidays: { read: false, write: false, create: false, delete: false, import: false, export: false },
        leaves: { read: false, write: false, create: false, delete: false, import: false, export: false },
        clients: { read: false, write: false, create: false, delete: false, import: false, export: false },
        projects: { read: false, write: false, create: false, delete: false, import: false, export: false },
        tasks: { read: false, write: false, create: false, delete: false, import: false, export: false },
        chats: { read: false, write: false, create: false, delete: false, import: false, export: false },
        assets: { read: false, write: false, create: false, delete: false, import: false, export: false },
        timingSheets: { read: false, write: false, create: false, delete: false, import: false, export: false },
    },
    selectAll: {
        holidays: false,
        leaves: false,
        clients: false,
        projects: false,
        tasks: false,
        chats: false,
        assets: false,
        timingSheets: false,
    }
};

const EmployeesGrid = () => {
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("basic-info");
    const [confirmPassword, setConfirmPassword] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [imageUpload, setImageUpload] = useState(false);
    const [designation, setDesignation] = useState<Option[]>([]);
    const [department, setDepartment] = useState<Option[]>([]);
    const [selectedDepartment, setSelectedDepartment] = useState<string>('');
    const [selectedDesignation, setSelectedDesignation] = useState<string>('');
    const [filters, setFilters] = useState({ designationId: "" });
    const [sortOrder, setSortOrder] = useState("");
    const [sortedEmployee, setSortedEmployee] = useState<Employee[]>([]);
    const [stats, setStats] = useState<EmployeeStats>({
        totalEmployees: 0,
        activeCount: 0,
        inactiveCount: 0,
        newJoinersCount: 0
    });
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
    const socket = useSocket() as Socket | null;
    const [formData, setFormData] = useState({
        employeeId: generateId("EMP"),
        avatarUrl: "",
        firstName: "",
        lastName: "",
        dateOfJoining: "",
        contact: {
            email: "",
            phone: "",
        },
        account: {
            userName: "",
            password: "",
        },
        companyName: "",
        designationId: "",
        departmentId: "",
        about: "",
    })
    const [permissions, setPermissions] = useState(initialState);

    useEffect(() => {
        if (!socket) return;

        let isMounted = true;

        setLoading(true);

        const timeoutId = setTimeout(() => {
            if (loading && isMounted) {
                console.warn("Employees loading timeout - showing fallback");
                setError("Employees loading timed out. Please refresh the page.");
                setLoading(false);
            }
        }, 30000);

        socket.emit("hrm/employees/get-employee-grid-stats");
        socket.emit("hr/departments/get");
        socket.emit("hrm/designations/get");

        const handleEmployeeResponse = (response: any) => {
            if (!isMounted) return;

            if (response.done) {
                console.log(response);
                if (response.data.stats) {
                    setStats(response.data.stats);
                }
                if (Array.isArray(response.data.employees)) {
                    setEmployees(response.data.employees);
                }
                setError(null);
                setLoading(false);
            } else {
                setError(response.error || "Failed to fetch employees");
                setLoading(false);
            }
        };

        const handleAddEmployeeResponse = (response: any) => {
            if (!isMounted) return;

            if (response.done) {
                setError(null);
                setLoading(false);
                if (socket) {
                    socket.emit("hrm/employees/get-employee-grid-stats");
                }
            } else {
                setError(response.error || "Failed to add policy");
                setLoading(false);
            }
        };

        const handleDesignationResponse = (response: any) => {
            if (!isMounted) return;

            if (response.done && Array.isArray(response.data)) {
                console.log("Designations response:", response);

                // Map all designations from the response
                const mappedDesignations = response.data.map((d: Designation) => ({
                    value: d._id,
                    label: d.designation,
                }));

                setDesignation([
                    { value: '', label: 'Select' },
                    ...mappedDesignations,
                ]);

                // If we're editing and the designation exists in the new list, keep it selected
                if (editingEmployee?.designationId) {
                    const designationExists = response.data.some(
                        (d: Designation) => d._id === editingEmployee.designationId
                    );
                    if (!designationExists) {
                        setSelectedDesignation("");
                        setEditingEmployee(prev =>
                            prev ? { ...prev, designationId: "" } : prev
                        );
                    }
                }
                setError(null);
                setLoading(false);
            } else {
                setError(response.error || "Failed to get designations");
                setLoading(false);
            }
        };

        const handleDepartmentResponse = (response: any) => {
            if (!isMounted) return;

            if (response.done && Array.isArray(response.data)) {
                const mappedDepartments = response.data.map((d: Department) => ({
                    value: d._id,
                    label: d.department,
                }));
                setDepartment([
                    { value: '', label: 'Select' },
                    ...mappedDepartments,
                ]);
                setError(null);
                setLoading(false);
            } else {
                setError(response.error || "Failed to get departments");
                setLoading(false);
            }
        }

        const handleEmployeeDelete = (response: any) => {
            if (!isMounted) return;

            if (response.done) {
                // setResponseData(response.data);
                setError(null);
                setLoading(false);
                if (socket) {
                    socket.emit("hrm/employees/get-employee-grid-stats");
                }
            } else {
                setError(response.error || "Failed to add policy");
                setLoading(false);
            }
        }

        const handleUpdateEmployeeResponse = (response: any) => {
            if (response.done) {
                // toast.success("Employee updated successfully!");
                // Optionally refresh employee list
                if (socket) {
                    socket.emit("hrm/employees/get-employee-grid-stats");
                }
                setEditingEmployee(null); // Close modal or reset editing state
                setError(null);
                setLoading(false);
            } else {
                // toast.error(response.error || "Failed to update employee.");
                setError(response.error || "Failed to update employee.");
                setLoading(false);
            }
        };

        const handleUpdatePermissionResponse = (response: any) => {
            if (response.done) {
                // toast.success("Employee permissions updated successfully!");
                // Optionally refresh employee list or permissions
                if (socket) {
                    socket.emit("hrm/employees/get-employee-grid-stats");
                }
                setError(null);
                setLoading(false);
            } else {
                // toast.error(response.error || "Failed to update permissions.");
                setError(response.error || "Failed to update permissions.");
                setLoading(false);
            }
        };

        socket.on("hrm/employees/get-employee-grid-stats-response", handleEmployeeResponse);
        socket.on("hrm/employees/add-response", handleAddEmployeeResponse);
        socket.on("hrm/designations/get-response", handleDesignationResponse);
        socket.on("hr/departments/get-response", handleDepartmentResponse);
        socket.on("hrm/employees/delete-response", handleEmployeeDelete);
        socket.on("hrm/employees/update-response", handleUpdateEmployeeResponse);
        socket.on("hrm/employees/update-permissions-response", handleUpdatePermissionResponse);

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
            socket.off("hrm/employees/get-employee-grid-stats-response", handleEmployeeResponse);
            socket.off("hrm/employees/add-response", handleAddEmployeeResponse);
            socket.off("hrm/designations/get-response", handleDesignationResponse);
            socket.off("hr/departments/get-response", handleDepartmentResponse);
            socket.off("hrm/employees/delete-response", handleEmployeeDelete);
            socket.off("hrm/employees/update-response", handleUpdateEmployeeResponse);
            socket.off("hrm/employees/update-permissions-response", handleUpdatePermissionResponse);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket]);
    console.log("employees", employees);

    useEffect(() => {
        if (editingEmployee && socket) {
            // Fetch designations for the employee's department
            console.log("Emitting for departmentID", editingEmployee.departmentId);

            if (editingEmployee.departmentId) {
                socket.emit("hrm/designations/get", { departmentId: editingEmployee.departmentId });
            }
        }
    }, [editingEmployee, socket]);

    useEffect(() => {
        if (editingEmployee && editingEmployee.permissions) {
            setPermissions({
                enabledModules: { ...initialState.enabledModules, ...editingEmployee.enabledModules },
                permissions: { ...initialState.permissions, ...editingEmployee.permissions },
                selectAll: { ...initialState.selectAll },
            })
        } else {
            setPermissions(initialState);
        }
    }, [editingEmployee]);

    const handleSort = (order: string) => {
        setSortOrder(order);
        if (!order) {
            setSortedEmployee(employees);
            return;
        }
        const sortedData = [...employees].sort((a, b) => {
            console.log("from sorted data", employees);

            const nameA = a.firstName.toLowerCase() || "a";
            const nameB = b.firstName.toLowerCase() || "b";

            if (order === "ascending") {
                return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
            }
            if (order === "descending") {
                return nameA > nameB ? -1 : nameA < nameB ? 1 : 0;
            }
            return 0;
        });
        setSortedEmployee(sortedData); // may not need this later
        setEmployees(sortedData);
    };
    const getModalContainer = () => {
        const modalElement = document.getElementById('modal-datepicker');
        return modalElement ? modalElement : document.body;
    };

    const [passwordVisibility, setPasswordVisibility] = useState({
        password: false,
        confirmPassword: false,
    });

    const togglePasswordVisibility = (field: PasswordField) => {
        setPasswordVisibility((prevState) => ({
            ...prevState,
            [field]: !prevState[field],
        }));
    };

    const uploadImage = async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", "amasqis");

        const res = await fetch(
            "https://api.cloudinary.com/v1_1/dwc3b5zfe/image/upload",
            {
                method: "POST",
                body: formData,
            }
        );

        const data = await res.json();
        console.log(data);
        return data.secure_url;
    };

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        setLoading(true);
        const file = event.target.files?.[0];
        if (!file) return;

        const maxSize = 4 * 1024 * 1024; // 4MB
        if (file.size > maxSize) {
            // toast.error("File size must be less than 4MB.", { position: "top-right", autoClose: 3000 });
            event.target.value = "";
            return;
        }

        if (["image/jpeg", "image/png", "image/jpg", "image/ico"].includes(file.type)) {
            setImageUpload(true);
            try {
                const uploadedUrl = await uploadImage(file);
                setFormData(prev => ({ ...prev, avatarUrl: uploadedUrl }));
                setImageUpload(false);
            } catch (error) {
                setImageUpload(false);
                // toast.error("Failed to upload image. Please try again.", { position: "top-right", autoClose: 3000 });
                event.target.value = "";
            } finally {
                setLoading(false);
            }
        } else {
            // toast.error("Please upload image file only.", { position: "top-right", autoClose: 3000 });
            event.target.value = "";
        }
    };

    const applyFilters = (updatedFields: {
        designationId?: string;

    }) => {
        try {
            setFilters(prevFilters => {
                const newFilters = { ...prevFilters, ...updatedFields };
                if (socket) {
                    socket.emit("hrm/employees/get-employee-grid-stats", { ...newFilters });
                }
                return newFilters;
            });
        } catch (error) {
            console.error("Error applying filters:", error);
        }
    };

    // form functions
    const onSelectDesignation = (id: string) => {
        console.log(id);
        applyFilters({ designationId: id });
    };
    // Validate form before submission
    const validateForm = (): boolean => {
        // Check required fields
        if (!formData.firstName) {
            alert("Please fill in first name");
            return false;
        }
        if (!formData.contact.email) {
            alert("Please fill in email");
            return false;
        }
        if (!formData.account.userName) {
            alert("Please fill in username");
            return false;
        }
        if (!formData.account.password) {
            alert("Please fill in password");
            return false;
        }
        if (!formData.contact.phone) {
            alert("Please fill in phone");
            return false;
        }

        // Check password match
        if (formData.account.password !== confirmPassword) {
            alert("Passwords don't match!");
            return false;
        }

        return true;
    };

    console.log("Editing Employee", editingEmployee);

    const handleSubmit = async (e: React.FormEvent) => {
        try {
            e.preventDefault();

            setError("null");

            if (!validateForm()) {
                return;
            }

            const anyModuleEnabled = Object.values(permissions.enabledModules).some(Boolean);
            if (!anyModuleEnabled) {
                setError("Please enable at least one module before saving permissions.");
                return;
            }
            setLoading(true);
            // Extract basic info fields separately
            const {
                employeeId,
                avatarUrl,
                firstName,
                lastName,
                dateOfJoining,
                contact: {
                    email,
                    phone,
                },
                account: {
                    userName,
                    password,
                },
                companyName,
                departmentId,
                designationId,
                about,
            } = formData;

            const basicInfo = {
                employeeId,
                avatarUrl,
                firstName,
                lastName,
                dateOfJoining,
                account: {
                    userName,
                    password,
                },
                contact: {
                    email,
                    phone,
                },
                companyName,
                departmentId,
                designationId,
                about,
            };

            // Prepare full submission data
            const submissionData = {
                employeeData: basicInfo,
                permissionsData: {
                    permissions: permissions.permissions,
                    enabledModules: permissions.enabledModules,
                }
            };

            console.log("Full Submission Data:", submissionData);

            if (socket) {
                socket.emit("hrm/employees/add", submissionData);
                handleResetFormData();
                setActiveTab('basic-info');
            } else {
                console.log("Socket connection is not available");
                setError("Socket connection is not available.");
                setLoading(false);
            }

        } catch (error) {
            console.error("Error submitting form and permissions:", error);
            setError("An error occurred while submitting data.");
        }
        setLoading(false);
    };
    const handleResetFormData = () => {
        setFormData({
            employeeId: generateId("EMP"),
            avatarUrl: "",
            firstName: "",
            lastName: "",
            dateOfJoining: "",
            contact: {
                email: "",
                phone: "",
            },
            account: {
                userName: "",
                password: "",
            },
            companyName: "",
            departmentId: "",
            designationId: "",
            about: "",
        });

        setPermissions(initialState);
        setError("");
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === "email" || name === "phone") {
            setFormData(prev => ({
                ...prev,
                contact: {
                    ...prev.contact,
                    [name]: value
                }
            }));
        } else if (name === "userName" || name === "password") {
            setFormData(prev => ({
                ...prev,
                account: {
                    ...prev.account,
                    [name]: value
                }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleDateChange = (date: string) => {
        setFormData(prev => ({ ...prev, dateOfJoining: date }));
    };

    const handleSelectChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };
    const handleNext = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) {
            return;
        }
        setActiveTab("address");
    };

    const handlePermissionChange = (
        module: PermissionModule,
        action: PermissionAction,
        checked: boolean
    ) => {
        setPermissions((prev) => {
            const updatedModulePermissions = {
                ...prev.permissions[module],
                [action]: checked,
            };

            // Check if all actions selected for this module
            const allSelected = ACTIONS.every(
                (act) => updatedModulePermissions[act]
            );

            return {
                ...prev,
                permissions: {
                    ...prev.permissions,
                    [module]: updatedModulePermissions,
                },
                selectAll: {
                    ...prev.selectAll,
                    [module]: allSelected,
                },
            };
        });
    };

    // Constant array for actions, matching PermissionSet keys exactly
    const ACTIONS: PermissionAction[] = [
        "read",
        "write",
        "create",
        "delete",
        "import",
        "export",
    ];
    const MODULES: PermissionModule[] = [
        "holidays",
        "leaves",
        "clients",
        "projects",
        "tasks",
        "chats",
        "assets",
        "timingSheets", // Correct spelling, make sure this matches everywhere
    ];

    // Toggle enable/disable a module
    const toggleModule = (module: PermissionModule) => {
        setPermissions((prev) => ({
            ...prev,
            enabledModules: {
                ...prev.enabledModules,
                [module]: !prev.enabledModules[module],
            },
        }));
    };

    // Toggle "Select All" permissions globally (all modules & all actions)
    const toggleGlobalSelectAll = (checked: boolean) => {
        setPermissions((prev) => {
            // Build new permissions for every module & action
            const newPermissions: Record<PermissionModule, PermissionSet> = MODULES.reduce(
                (accModules, module) => {
                    const newModulePermissions: PermissionSet = ACTIONS.reduce(
                        (accActions, action) => {
                            accActions[action] = checked;
                            return accActions;
                        },
                        {} as PermissionSet
                    );
                    accModules[module] = newModulePermissions;
                    return accModules;
                },
                {} as Record<PermissionModule, PermissionSet>
            );

            // Build new selectAll flags for every module
            const newSelectAll: Record<PermissionModule, boolean> = MODULES.reduce(
                (acc, module) => {
                    acc[module] = checked;
                    return acc;
                },
                {} as Record<PermissionModule, boolean>
            );

            return {
                ...prev,
                permissions: newPermissions,
                selectAll: newSelectAll,
            };
        });
    };
    // Toggle "Enable All Modules" master switch
    const toggleAllModules = (enable: boolean) => {
        setPermissions((prev) => {
            const newEnabledModules: Record<PermissionModule, boolean> = MODULES.reduce(
                (acc, module) => {
                    acc[module] = enable;
                    return acc;
                },
                {} as Record<PermissionModule, boolean>
            );

            return {
                ...prev,
                enabledModules: newEnabledModules,
            };
        });
    };

    const allPermissionsSelected = () => {
        return MODULES.every(module =>
            ACTIONS.every(action => permissions.permissions[module][action])
        );
    };

    // 1. Update basic info
    const handleUpdateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingEmployee) {
            toast.error("No employee selected for editing.");
            return;
        }
        const payload = {
            employeeId: editingEmployee.employeeId,
            firstName: editingEmployee.firstName,
            lastName: editingEmployee.lastName,
            account: {
                userName: editingEmployee.account.userName,
            },
            contact: {
                email: editingEmployee.contact.email,
                phone: editingEmployee.contact.phone,
            },
            companyName: editingEmployee.companyName || editingEmployee.companyName,
            departmentId: editingEmployee.departmentId,
            designationId: editingEmployee.designationId,
            dateOfJoining: editingEmployee.dateOfJoining,
            about: editingEmployee.about,
            avatarUrl: editingEmployee.avatarUrl,
            status: editingEmployee.status,
        };
        console.log("update payload", payload);

        if (socket) {
            socket.emit("hrm/employees/update", payload);
            toast.success("Employee update request sent.");
        } else {
            toast.error("Socket connection is not available.");
        }
    };

    const handlePermissionUpdateSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!editingEmployee) {
            // toast.error("No employee selected for editing.");
            return;
        }
        const payload = {
            employeeId: editingEmployee._id,
            permissions: permissions.permissions,
            enabledModules: permissions.enabledModules,
        };
        console.log("edit perm payload", payload);

        if (socket) {
            socket.emit("hrm/employees/update-permissions", payload);
            // toast.success("Employee permissions update request sent.");
            setPermissions(initialState);
        } else {
            console.log(error);
            // toast.error("Socket connection is not available.");
            return;
        }
    };

    const deleteEmployee = (id: string) => {
        try {
            setLoading(true);
            setError(null);

            if (!socket) {
                setError("Socket connection is not available");
                setLoading(false);
                return;
            }

            if (!id) {
                setError("Employee ID is required");
                setLoading(false);
                return;
            }

            socket.emit("hrm/employees/delete", { _id: id });
        } catch (error) {
            console.error("Delete error:", error);
            setError("Failed to initiate policy deletion");
            setLoading(false);
        }
    };

    return (
        <>
            {/* Page Wrapper */}
            <div className="page-wrapper">
                <div className="content">
                    {/* Breadcrumb */}
                    <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
                        <div className="my-auto mb-2">
                            <h2 className="mb-1">Employee</h2>
                            <nav>
                                <ol className="breadcrumb mb-0">
                                    <li className="breadcrumb-item">
                                        <Link to={all_routes.adminDashboard}>
                                            <i className="ti ti-smart-home" />
                                        </Link>
                                    </li>
                                    <li className="breadcrumb-item">Employee</li>
                                    <li className="breadcrumb-item active" aria-current="page">
                                        Employee Grid
                                    </li>
                                </ol>
                            </nav>
                        </div>
                        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
                            <div className="me-2 mb-2">
                                <div className="d-flex align-items-center border bg-white rounded p-1 me-2 icon-list">
                                    <Link to={all_routes.employeeList} className="btn btn-icon btn-sm me-1">
                                        <i className="ti ti-list-tree" />
                                    </Link>
                                    <Link
                                        to={all_routes.employeeGrid}
                                        className="btn btn-icon btn-sm active bg-primary text-white"
                                    >
                                        <i className="ti ti-layout-grid" />
                                    </Link>
                                </div>
                            </div>
                            <div className="me-2 mb-2">
                                <div className="dropdown">
                                    <Link
                                        to="#"
                                        className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                                        data-bs-toggle="dropdown"
                                    >
                                        <i className="ti ti-file-export me-1" />
                                        Export
                                    </Link>
                                    <ul className="dropdown-menu  dropdown-menu-end p-3">
                                        <li>
                                            <Link
                                                to="#"
                                                className="dropdown-item rounded-1"
                                            >
                                                <i className="ti ti-file-type-pdf me-1" />
                                                Export as PDF
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                to="#"
                                                className="dropdown-item rounded-1"
                                            >
                                                <i className="ti ti-file-type-xls me-1" />
                                                Export as Excel{" "}
                                            </Link>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                            <div className="mb-2">
                                <Link
                                    to="#"
                                    data-bs-toggle="modal" data-inert={true}
                                    data-bs-target="#add_employee"
                                    className="btn btn-primary d-flex align-items-center"
                                >
                                    <i className="ti ti-circle-plus me-2" />
                                    Add Employee
                                </Link>
                            </div>
                            <div className="head-icons ms-2">
                                <CollapseHeader />
                            </div>
                        </div>
                    </div>
                    {/* /Breadcrumb */}
                    {/* Total Plans */}
                    <div className="row">
                        {/* Total Plans */}
                        <div className="col-lg-3 col-md-6 d-flex">
                            <div className="card flex-fill">
                                <div className="card-body d-flex align-items-center justify-content-between">
                                    <div className="d-flex align-items-center overflow-hidden">
                                        <div>
                                            <span className="avatar avatar-lg bg-dark rounded-circle">
                                                <i className="ti ti-users" />
                                            </span>
                                        </div>
                                        <div className="ms-2 overflow-hidden">
                                            <p className="fs-12 fw-medium mb-1 text-truncate">
                                                Total Employee
                                            </p>
                                            <h4>{stats?.totalEmployees || 0}</h4>
                                        </div>
                                    </div>
                                    {/* <div>
                    <span className="badge badge-soft-purple badge-sm fw-normal">
                      <i className="ti ti-arrow-wave-right-down" />
                      +19.01%
                    </span>
                  </div> */}
                                </div>
                            </div>
                        </div>
                        {/* /Total Plans */}
                        {/* Total Plans */}
                        <div className="col-lg-3 col-md-6 d-flex">
                            <div className="card flex-fill">
                                <div className="card-body d-flex align-items-center justify-content-between">
                                    <div className="d-flex align-items-center overflow-hidden">
                                        <div>
                                            <span className="avatar avatar-lg bg-success rounded-circle">
                                                <i className="ti ti-user-share" />
                                            </span>
                                        </div>
                                        <div className="ms-2 overflow-hidden">
                                            <p className="fs-12 fw-medium mb-1 text-truncate">Active</p>
                                            <h4>{stats?.activeCount}</h4>
                                        </div>
                                    </div>
                                    {/* <div>
                    <span className="badge badge-soft-primary badge-sm fw-normal">
                      <i className="ti ti-arrow-wave-right-down" />
                      +19.01%
                    </span>
                  </div> */}
                                </div>
                            </div>
                        </div>
                        {/* /Total Plans */}
                        {/* Inactive Plans */}
                        <div className="col-lg-3 col-md-6 d-flex">
                            <div className="card flex-fill">
                                <div className="card-body d-flex align-items-center justify-content-between">
                                    <div className="d-flex align-items-center overflow-hidden">
                                        <div>
                                            <span className="avatar avatar-lg bg-danger rounded-circle">
                                                <i className="ti ti-user-pause" />
                                            </span>
                                        </div>
                                        <div className="ms-2 overflow-hidden">
                                            <p className="fs-12 fw-medium mb-1 text-truncate">InActive</p>
                                            <h4>{stats?.inactiveCount}</h4>
                                        </div>
                                    </div>
                                    {/* <div>
                    <span className="badge badge-soft-dark badge-sm fw-normal">
                      <i className="ti ti-arrow-wave-right-down" />
                      +19.01%
                    </span>
                  </div> */}
                                </div>
                            </div>
                        </div>
                        {/* /Inactive Companies */}
                        {/* No of Plans  */}
                        <div className="col-lg-3 col-md-6 d-flex">
                            <div className="card flex-fill">
                                <div className="card-body d-flex align-items-center justify-content-between">
                                    <div className="d-flex align-items-center overflow-hidden">
                                        <div>
                                            <span className="avatar avatar-lg bg-info rounded-circle">
                                                <i className="ti ti-user-plus" />
                                            </span>
                                        </div>
                                        <div className="ms-2 overflow-hidden">
                                            <p className="fs-12 fw-medium mb-1 text-truncate">
                                                New Joiners
                                            </p>
                                            <h4>{stats?.newJoinersCount}</h4>
                                        </div>
                                    </div>
                                    {/* <div>
                    <span className="badge badge-soft-secondary badge-sm fw-normal">
                      <i className="ti ti-arrow-wave-right-down" />
                      +19.01%
                    </span>
                  </div> */}
                                </div>
                            </div>
                        </div>
                        {/* /No of Plans */}
                    </div>
                    <div className="card">
                        <div className="card-body p-3">
                            <div className="d-flex align-items-center justify-content-between flex-wrap row-gap-3">
                                <h5>Employees Grid</h5>
                                {/* filters */}
                                <div className="d-flex align-items-center flex-wrap row-gap-3">
                                    <div className="dropdown me-3">
                                        <Link
                                            to="#"
                                            className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                                            data-bs-toggle="dropdown"
                                        >
                                            Designation
                                            {selectedDesignation
                                                ? `: ${designation.find(des => des.value === selectedDesignation)?.label || "None"
                                                }`
                                                : ": None"}
                                        </Link>
                                        <ul className="dropdown-menu dropdown-menu-end p-3">
                                            {designation
                                                .filter(des => des.value)
                                                .map(des => (
                                                    <li key={des.value}>
                                                        <Link
                                                            to="#"
                                                            className={`dropdown-item rounded-1${selectedDesignation === des.value ? " active" : ""}`}
                                                            onClick={e => {
                                                                e.preventDefault();
                                                                setSelectedDesignation(des.value);
                                                                onSelectDesignation(des.value);
                                                            }}
                                                        >
                                                            {des.label}
                                                        </Link>
                                                    </li>
                                                ))}
                                        </ul>
                                    </div>
                                    <div className="dropdown">
                                        <Link
                                            to="#"
                                            className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                                            data-bs-toggle="dropdown"
                                        >
                                            Sort By{sortOrder ? `: ${sortOrder.charAt(0).toUpperCase() + sortOrder.slice(1)}` : ": None"}
                                        </Link>
                                        <ul className="dropdown-menu  dropdown-menu-end p-3">
                                            <li>
                                                <Link
                                                    to="#"
                                                    className="dropdown-item rounded-1"
                                                    onClick={() => handleSort("ascending")}
                                                >
                                                    Ascending
                                                </Link>
                                            </li>
                                            <li>
                                                <Link
                                                    to="#"
                                                    className="dropdown-item rounded-1"
                                                    onClick={() => handleSort("descending")}
                                                >
                                                    Descending
                                                </Link>
                                            </li>
                                            <li>
                                                <button
                                                    type="button"
                                                    className="dropdown-item rounded-1"
                                                    onClick={() => handleSort("")}
                                                >
                                                    None
                                                </button>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Clients Grid */}
                    <div className="row">
                        {/* <div className="col-md-12">
                            <div className="text-center mb-4"> */}
                        {employees.map(emp => {
                            const {
                                _id,
                                firstName,
                                lastName,
                                role,
                                totalProjects = 0,
                                completedProjects = 0,
                                productivity = 0,
                                status,
                                avatarUrl,
                            } = emp;

                            const fullName = `${firstName || ""} ${lastName || ""}`.trim() || "Unknown Name";
                            const progressPercent = Math.round(productivity);
                            const progressBarColor =
                                progressPercent >= 65 ? "bg-purple"
                                    : progressPercent >= 40 ? "bg-warning"
                                        : "bg-danger";

                            return (
                                <div key={_id} className="col-xl-3 col-lg-4 col-md-6 mb-4">
                                    <div className="card">
                                        <div className="card-body">
                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                <div className="form-check form-check-md">
                                                    <input className="form-check-input" type="checkbox" />
                                                </div>
                                                <div>
                                                    <Link
                                                        to={`${all_routes.employeedetails}/${_id}`}
                                                        className={`avatar avatar-xl avatar-rounded border p-1 border-primary rounded-circle ${(emp.status === "Active") || (emp.status === "active") ? "online" : "offline"}`}
                                                    >
                                                        <ImageWithBasePath
                                                            src={avatarUrl || "assets/img/users/user-32.jpg"}
                                                            className="img-fluid"
                                                            alt={fullName}
                                                        />
                                                    </Link>
                                                </div>
                                                <div className="dropdown">
                                                    <button
                                                        className="btn btn-icon btn-sm rounded-circle"
                                                        type="button"
                                                        data-bs-toggle="dropdown"
                                                        aria-expanded="false"
                                                    >
                                                        <i className="ti ti-dots-vertical" />
                                                    </button>
                                                    <ul className="dropdown-menu dropdown-menu-end p-3">
                                                        <li>
                                                            <Link
                                                                className="dropdown-item rounded-1"
                                                                to="#"
                                                                data-bs-toggle="modal"
                                                                data-inert={true}
                                                                data-bs-target="#edit_employee"
                                                                onClick={() => setEditingEmployee(emp)}
                                                            >
                                                                <i className="ti ti-edit me-1" /> Edit
                                                            </Link>
                                                        </li>
                                                        <li>
                                                            <Link
                                                                className="dropdown-item rounded-1"
                                                                to="#"
                                                                data-bs-toggle="modal"
                                                                data-inert={true}
                                                                data-bs-target="#delete_modal"
                                                                onClick={() => setEmployeeToDelete(emp)}
                                                            >
                                                                <i className="ti ti-trash me-1" /> Delete
                                                            </Link>
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div>
                                            <div className="text-center mb-3">
                                                <h6 className="mb-1">
                                                    <Link to={`/employees/${emp._id}`}>{fullName}</Link>
                                                </h6>
                                                <span className="badge bg-pink-transparent fs-10 fw-medium">
                                                    {role || "employee"}
                                                </span>
                                            </div>
                                            <div className="row text-center">
                                                <div className="col-4">
                                                    <div className="mb-3">
                                                        <span className="fs-12">Projects</span>
                                                        <h6 className="fw-medium">{totalProjects}</h6>
                                                    </div>
                                                </div>
                                                <div className="col-4">
                                                    <div className="mb-3">
                                                        <span className="fs-12">Done</span>
                                                        <h6 className="fw-medium">{completedProjects}</h6>
                                                    </div>
                                                </div>
                                                <div className="col-4">
                                                    <div className="mb-3">
                                                        <span className="fs-12">Progress</span>
                                                        <h6 className="fw-medium">{totalProjects - completedProjects}</h6>
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="mb-2 text-center">
                                                Productivity : <span className={`text-${progressBarColor === "bg-purple" ? "purple" : progressBarColor === "bg-warning" ? "warning" : "danger"}`}>
                                                    {progressPercent}%
                                                </span>
                                            </p>
                                            <div className="progress progress-xs mb-2">
                                                <div
                                                    className={`progress-bar ${progressBarColor}`}
                                                    role="progressbar"
                                                    style={{ width: `${progressPercent}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {/* <Link to="#" className="btn btn-primary">
                                    <i className="ti ti-loader-3 me-1" />
                                    Load More
                                </Link> */}
                        {/* </div>
                        </div> */}
                    </div>
                    {/* /Clients Grid */}
                </div>
                <div className="footer d-sm-flex align-items-center justify-content-between border-top bg-white p-3">
                    <p className="mb-0">2014 - 2025 © SmartHR.</p>
                    <p>
                        Designed &amp; Developed By{" "}
                        <Link to="#" className="text-primary">
                            Dreams
                        </Link>
                    </p>
                </div>
            </div>
            {/* /Page Wrapper */}
            {/* Add Employee */}
            <div className="modal fade" id="add_employee">
                <div className="modal-dialog modal-dialog-centered modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <div className="d-flex align-items-center">
                                <h4 className="modal-title me-2">Add New Employee</h4>
                                <span>Employee ID : {formData.employeeId}</span>
                            </div>
                            <button
                                type="button"
                                className="btn-close custom-btn-close"
                                data-bs-dismiss="modal"
                                aria-label="Close"
                            >
                                <i className="ti ti-x" />
                            </button>
                        </div>
                        <form action={all_routes.employeeList} onSubmit={handleSubmit}>
                            <div className="contact-grids-tab">
                                <ul className="nav nav-underline" id="myTab" role="tablist">
                                    <li className="nav-item" role="presentation">
                                        <button
                                            id="info-tab"
                                            data-bs-toggle="tab"
                                            data-bs-target="#basic-info"
                                            className={`nav-link ${activeTab === "basic-info" ? "active" : ""}`}
                                            type="button"
                                            role="tab"
                                            aria-selected="true"
                                            onClick={() => setActiveTab("basic-info")}
                                        >
                                            Basic Information
                                        </button>
                                    </li>
                                    <li className="nav-item" role="presentation">
                                        <button
                                            className={`nav-link ${activeTab === "address" ? "active" : ""}`}
                                            onClick={() => setActiveTab("address")}
                                            id="address-tab"
                                            data-bs-toggle="tab"
                                            data-bs-target="#address"
                                            type="button"
                                            role="tab"
                                            aria-selected="false"
                                        >
                                            Permissions
                                        </button>
                                    </li>
                                </ul>
                            </div>
                            <div className="tab-content" id="myTabContent">
                                <div
                                    className={`tab-pane fade ${activeTab === "basic-info" ? "show active" : ""}`}
                                    id="basic-info"
                                    role="tabpanel"
                                    aria-labelledby="info-tab"
                                    tabIndex={0}
                                >
                                    <div className="modal-body pb-0 ">
                                        <div className="row">
                                            <div className="col-md-12">
                                                <div className="d-flex align-items-center flex-wrap row-gap-3 bg-light w-100 rounded p-3 mb-4">
                                                    {formData.avatarUrl ? (
                                                        <img
                                                            src={formData.avatarUrl}
                                                            alt="Profile"
                                                            className="avatar avatar-xxl rounded-circle border border-dashed me-2 flex-shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="d-flex align-items-center justify-content-center avatar avatar-xxl rounded-circle border border-dashed me-2 flex-shrink-0 text-dark frames">
                                                            <i className="ti ti-photo text-gray-2 fs-16" />
                                                        </div>
                                                    )}
                                                    <div className="profile-upload">
                                                        <div className="mb-2">
                                                            <h6 className="mb-1">Upload Profile Image</h6>
                                                            <p className="fs-12">Image should be below 4 mb</p>
                                                        </div>
                                                        <div className="profile-uploader d-flex align-items-center">
                                                            <div className="drag-upload-btn btn btn-sm btn-primary me-2">
                                                                {loading ? "Uploading..." : "Upload"}
                                                                <input
                                                                    type="file"
                                                                    className="form-control image-sign"
                                                                    accept=".png,.jpeg,.jpg,.ico"
                                                                    ref={fileInputRef}
                                                                    onChange={handleImageUpload}
                                                                    disabled={loading}
                                                                    style={{
                                                                        cursor: loading ? "not-allowed" : "pointer",
                                                                        opacity: 0,
                                                                        position: "absolute",
                                                                        top: 0,
                                                                        left: 0,
                                                                        width: "100%",
                                                                        height: "100%",
                                                                    }}
                                                                />
                                                            </div>
                                                            <button
                                                                type="button"
                                                                className="btn btn-light btn-sm"
                                                                onClick={() => setFormData(prev => ({ ...prev, avatarUrl: "" }))}
                                                                disabled={loading} // Disable cancel during loading for safety
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">
                                                        First Name <span className="text-danger"> *</span>
                                                    </label>
                                                    <input type="text" className="form-control"
                                                        name="firstName"
                                                        value={formData.firstName}
                                                        onChange={handleChange} />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Last Name</label>
                                                    <input type="text" className="form-control"
                                                        name="lastName"
                                                        value={formData.lastName}
                                                        onChange={handleChange} />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">
                                                        Employee ID <span className="text-danger"> *</span>
                                                    </label>
                                                    <input type="text" className="form-control"
                                                        value={formData.employeeId}
                                                        readOnly />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">
                                                        Joining Date <span className="text-danger"> *</span>
                                                    </label>
                                                    <div className="input-icon-end position-relative">
                                                        <DatePicker
                                                            className="form-control datetimepicker"
                                                            format={{
                                                                format: "DD-MM-YYYY",
                                                                type: "mask",
                                                            }}
                                                            getPopupContainer={getModalContainer}
                                                            placeholder="DD-MM-YYYY"
                                                            name="dateOfJoining"
                                                            value={formData.dateOfJoining}
                                                            onChange={handleDateChange}
                                                        />
                                                        <span className="input-icon-addon">
                                                            <i className="ti ti-calendar text-gray-7" />
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">
                                                        Username <span className="text-danger"> *</span>
                                                    </label>
                                                    <input type="text" className="form-control"
                                                        name="userName"
                                                        value={formData.account.userName}
                                                        onChange={handleChange} />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">
                                                        Email <span className="text-danger"> *</span>
                                                    </label>
                                                    <input type="email" className="form-control"
                                                        name="email"
                                                        value={formData.contact.email}
                                                        onChange={handleChange} />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3 ">
                                                    <label className="form-label">
                                                        Password <span className="text-danger"> *</span>
                                                    </label>
                                                    <div className="pass-group">
                                                        <input
                                                            type={
                                                                passwordVisibility.password
                                                                    ? "text"
                                                                    : "password"
                                                            }
                                                            className="pass-input form-control"
                                                            name="password"
                                                            value={formData.account.password}
                                                            onChange={handleChange}
                                                        />
                                                        <span
                                                            className={`ti toggle-passwords ${passwordVisibility.password
                                                                ? "ti-eye"
                                                                : "ti-eye-off"
                                                                }`}
                                                            onClick={() =>
                                                                togglePasswordVisibility("password")
                                                            }
                                                        ></span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3 ">
                                                    <label className="form-label">
                                                        Confirm Password <span className="text-danger"> *</span>
                                                    </label>
                                                    <div className="pass-group">
                                                        <input
                                                            type={
                                                                passwordVisibility.confirmPassword
                                                                    ? "text"
                                                                    : "password"
                                                            }
                                                            className="pass-input form-control"
                                                            name="confirmPassword"
                                                            value={confirmPassword}
                                                            onChange={e => setConfirmPassword(e.target.value)}
                                                        />
                                                        <span
                                                            className={`ti toggle-passwords ${passwordVisibility.confirmPassword
                                                                ? "ti-eye"
                                                                : "ti-eye-off"
                                                                }`}
                                                            onClick={() =>
                                                                togglePasswordVisibility("confirmPassword")
                                                            }
                                                        ></span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">
                                                        Phone Number <span className="text-danger"> *</span>
                                                    </label>
                                                    <input type="text" className="form-control"
                                                        name="phone"
                                                        value={formData.contact.phone}
                                                        onChange={handleChange} />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">
                                                        Company<span className="text-danger"> *</span>
                                                    </label>
                                                    <input type="text" className="form-control"
                                                        name="companyName"
                                                        value={formData.companyName}
                                                        onChange={handleChange} />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Department</label>
                                                    <CommonSelect
                                                        className="select"
                                                        options={department}
                                                        defaultValue={EMPTY_OPTION}
                                                        onChange={option => {
                                                            if (option) {
                                                                handleSelectChange('departmentId', option.value);
                                                                setSelectedDepartment(option.value);
                                                                setDesignation([{ value: '', label: 'Select' }]);
                                                                handleSelectChange('designationId', '');
                                                                if (socket) {
                                                                    socket.emit("hrm/designations/get", { departmentId: option.value });
                                                                }
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Designation</label>
                                                    <CommonSelect
                                                        className="select"
                                                        options={designation}
                                                        defaultValue={EMPTY_OPTION}
                                                        onChange={option => {
                                                            if (option) {
                                                                handleSelectChange('designationId', option.value);
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-12">
                                                <div className="mb-3">
                                                    <label className="form-label">
                                                        About <span className="text-danger"> *</span>
                                                    </label>
                                                    <textarea
                                                        className="form-control"
                                                        rows={3}
                                                        defaultValue={""}
                                                        name="about"
                                                        value={formData.about}
                                                        onChange={handleChange}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="modal-footer">
                                        <button
                                            type="button"
                                            className="btn btn-outline-light border me-2"
                                            data-bs-dismiss="modal"
                                        >
                                            Cancel
                                        </button>
                                        <button type="button" className="btn btn-primary" onClick={handleNext}>
                                            Save and Next
                                        </button>
                                    </div>
                                </div>
                                <div
                                    className={`tab-pane fade ${activeTab === "address" ? "show active" : ""}`}
                                    id="address"
                                    role="tabpanel"
                                    aria-labelledby="address-tab"
                                    tabIndex={0}
                                >
                                    <div className="modal-body">
                                        <div className="card bg-light-500 shadow-none">
                                            <div className="card-body d-flex align-items-center justify-content-between flex-wrap row-gap-3">
                                                <h6>Enable Options</h6>
                                                <div className="d-flex align-items-center justify-content-end">
                                                    <div className="form-check form-switch me-2">
                                                        <label className="form-check-label mt-0">
                                                            <input
                                                                className="form-check-input me-2"
                                                                type="checkbox"
                                                                role="switch"
                                                                checked={Object.values(permissions.enabledModules).every(Boolean)}
                                                                onChange={(e) => toggleAllModules(e.target.checked)}
                                                            />
                                                            Enable all Module
                                                        </label>
                                                    </div>
                                                    <div className="form-check d-flex align-items-center">
                                                        <label className="form-check-label mt-0">
                                                            <input
                                                                className="form-check-input"
                                                                type="checkbox"
                                                                checked={Object.values(permissions.selectAll).every(Boolean)}
                                                                onChange={(e) => toggleGlobalSelectAll(e.target.checked)}
                                                            />
                                                            Select All
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="table-responsive border rounded">
                                            <table className="table">
                                                <tbody>
                                                    {MODULES.map((module) => (
                                                        <tr key={module}>
                                                            <td>
                                                                <div className="form-check form-switch me-2">
                                                                    <label className="form-check-label mt-0">
                                                                        <input
                                                                            className="form-check-input me-2"
                                                                            type="checkbox"
                                                                            role="switch"
                                                                            checked={permissions.enabledModules[module]}
                                                                            onChange={() => toggleModule(module)}
                                                                        />
                                                                        {module.charAt(0).toUpperCase() + module.slice(1)}
                                                                    </label>
                                                                </div>
                                                            </td>

                                                            {ACTIONS.map((action) => (
                                                                <td key={action}>
                                                                    <div className="form-check d-flex align-items-center">
                                                                        <label className="form-check-label mt-0">
                                                                            <input
                                                                                className="form-check-input"
                                                                                type="checkbox"
                                                                                checked={permissions.permissions[module][action]}
                                                                                onChange={(e) =>
                                                                                    handlePermissionChange(module, action, e.target.checked)
                                                                                }
                                                                                disabled={!permissions.enabledModules[module]} // disable if module not enabled
                                                                            />
                                                                            {action.charAt(0).toUpperCase() + action.slice(1)}
                                                                        </label>
                                                                    </div>
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    <div className="modal-footer">
                                        <button
                                            type="button"
                                            className="btn btn-outline-light border me-2"
                                            data-bs-dismiss="modal"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="btn btn-primary"
                                            data-bs-toggle="modal" data-inert={true}
                                            data-bs-target="#success_modal"
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            {/* /Add Employee */}
            {/* Edit Employee */}
            <div className="modal fade" id="edit_employee">
                <div className="modal-dialog modal-dialog-centered modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <div className="d-flex align-items-center">
                                <h4 className="modal-title me-2">Edit Employee</h4>
                                <span>Employee ID : {editingEmployee?.employeeId}</span>
                            </div>
                            <button
                                type="button"
                                className="btn-close custom-btn-close"
                                data-bs-dismiss="modal"
                                aria-label="Close"
                            >
                                <i className="ti ti-x" />
                            </button>
                        </div>
                        <form action={all_routes.employeeList}>
                            <div className="contact-grids-tab">
                                <ul className="nav nav-underline" id="myTab2" role="tablist">
                                    <li className="nav-item" role="presentation">
                                        <button
                                            className="nav-link active"
                                            id="info-tab2"
                                            data-bs-toggle="tab"
                                            data-bs-target="#basic-info2"
                                            type="button"
                                            role="tab"
                                            aria-selected="true"
                                        >
                                            Basic Information
                                        </button>
                                    </li>
                                    <li className="nav-item" role="presentation">
                                        <button
                                            className="nav-link"
                                            id="address-tab2"
                                            data-bs-toggle="tab"
                                            data-bs-target="#address2"
                                            type="button"
                                            role="tab"
                                            aria-selected="false"
                                        >
                                            Permissions
                                        </button>
                                    </li>
                                </ul>
                            </div>
                            <div className="tab-content" id="myTabContent2">
                                <div
                                    className="tab-pane fade show active"
                                    id="basic-info2"
                                    role="tabpanel"
                                    aria-labelledby="info-tab2"
                                    tabIndex={0}
                                >
                                    <div className="modal-body pb-0 ">
                                        <div className="row">
                                            <div className="col-md-12">
                                                <div className="d-flex align-items-center flex-wrap row-gap-3 bg-light w-100 rounded p-3 mb-4">
                                                    <div className="d-flex align-items-center justify-content-center avatar avatar-xxl rounded-circle border border-dashed me-2 flex-shrink-0 text-dark frames">
                                                        {editingEmployee?.avatarUrl ? (
                                                            <img
                                                                src={editingEmployee.avatarUrl}
                                                                alt="Profile"
                                                                className="avatar avatar-xxl rounded-circle border border-dashed me-2 flex-shrink-0"
                                                            />
                                                        ) : (
                                                            <ImageWithBasePath
                                                                src="assets/img/users/user-13.jpg"
                                                                alt="img"
                                                                className="rounded-circle"
                                                            />
                                                        )}
                                                    </div>
                                                    <div className="profile-upload">
                                                        <div className="mb-2">
                                                            <h6 className="mb-1">Upload Profile Image</h6>
                                                            <p className="fs-12">Image should be below 4 mb</p>
                                                        </div>
                                                        <div className="profile-uploader d-flex align-items-center">
                                                            <div className="drag-upload-btn btn btn-sm btn-primary me-2">
                                                                Upload
                                                                <input
                                                                    type="file"
                                                                    className="form-control image-sign"
                                                                    accept=".png,.jpeg,.jpg,.ico"
                                                                    onChange={async (event) => {
                                                                        const file = event.target.files?.[0];
                                                                        if (!file) return;
                                                                        const maxSize = 4 * 1024 * 1024;
                                                                        if (file.size > maxSize) {
                                                                            // toast.error("File size must be less than 4MB.");
                                                                            event.target.value = "";
                                                                            return;
                                                                        }
                                                                        if (["image/jpeg", "image/png", "image/jpg", "image/ico"].includes(file.type)) {
                                                                            try {
                                                                                const formData = new FormData();
                                                                                formData.append("file", file);
                                                                                formData.append("upload_preset", "amasqis");
                                                                                const res = await fetch(
                                                                                    "https://api.cloudinary.com/v1_1/dwc3b5zfe/image/upload",
                                                                                    { method: "POST", body: formData }
                                                                                );
                                                                                const data = await res.json();
                                                                                setEditingEmployee(prev =>
                                                                                    prev ? { ...prev, avatarUrl: data.secure_url } : prev
                                                                                );
                                                                            } catch (error) {
                                                                                // toast.error("Failed to upload image. Please try again.");
                                                                                event.target.value = "";
                                                                            }
                                                                        } else {
                                                                            // toast.error("Please upload image file only.");
                                                                            event.target.value = "";
                                                                        }
                                                                    }}
                                                                    style={{
                                                                        cursor: "pointer",
                                                                        opacity: 0,
                                                                        position: "absolute",
                                                                        top: 0,
                                                                        left: 0,
                                                                        width: "100%",
                                                                        height: "100%",
                                                                    }}
                                                                />
                                                            </div>
                                                            <button
                                                                type="button"
                                                                className="btn btn-light btn-sm"
                                                                onClick={() =>
                                                                    setEditingEmployee(prev =>
                                                                        prev ? { ...prev, avatarUrl: "" } : prev
                                                                    )
                                                                }
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">
                                                        First Name <span className="text-danger"> *</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        value={editingEmployee?.firstName || ""}
                                                        onChange={(e) =>
                                                            setEditingEmployee(prev =>
                                                                prev ? { ...prev, firstName: e.target.value } : prev)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Last Name</label>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        value={editingEmployee?.lastName || ""}
                                                        onChange={(e) =>
                                                            setEditingEmployee(prev =>
                                                                prev ? { ...prev, lastName: e.target.value } : prev)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">
                                                        Employee ID <span className="text-danger"> *</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        value={editingEmployee?.employeeId}
                                                        readOnly
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">
                                                        Joining Date <span className="text-danger"> *</span>
                                                    </label>
                                                    <div className="input-icon-end position-relative">
                                                        <DatePicker
                                                            className="form-control datetimepicker"
                                                            format="DD-MM-YYYY"
                                                            getPopupContainer={getModalContainer}
                                                            placeholder="DD-MM-YYYY"
                                                            name="dateOfJoining"
                                                            value={editingEmployee?.dateOfJoining ? dayjs(editingEmployee.dateOfJoining) : null}
                                                            onChange={(date: dayjs.Dayjs | null) => {
                                                                setEditingEmployee(prev =>
                                                                    prev ? {
                                                                        ...prev,
                                                                        dateOfJoining: date ? date.toDate().toISOString() : ""
                                                                    } : prev
                                                                );
                                                            }}
                                                        />
                                                        <span className="input-icon-addon">
                                                            <i className="ti ti-calendar text-gray-7" />
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">
                                                        Username <span className="text-danger"> *</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        value={editingEmployee?.account.userName}
                                                        onChange={(e) =>
                                                            setEditingEmployee(prev =>
                                                                prev ? { ...prev, account: { ...prev.account, userName: e.target.value } } : prev)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">
                                                        Email <span className="text-danger"> *</span>
                                                    </label>
                                                    <input
                                                        type="email"
                                                        className="form-control"
                                                        value={editingEmployee?.contact.email}
                                                        onChange={(e) =>
                                                            setEditingEmployee(prev =>
                                                                prev ? { ...prev, contact: { ...prev.contact, email: e.target.value } } : prev)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">
                                                        Phone Number <span className="text-danger"> *</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        value={editingEmployee?.contact.phone}
                                                        onChange={(e) =>
                                                            setEditingEmployee(prev =>
                                                                prev ? { ...prev, contact: { ...prev.contact, phone: e.target.value } } : prev)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">
                                                        Company<span className="text-danger"> *</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        value={editingEmployee?.companyName}
                                                        onChange={(e) =>
                                                            setEditingEmployee(prev =>
                                                                prev ? { ...prev, companyName: e.target.value } : prev)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Department</label>
                                                    <CommonSelect
                                                        className="select"
                                                        options={department}
                                                        defaultValue={department.find(dep => dep.value === editingEmployee?.departmentId) || { value: '', label: 'Select' }}
                                                        onChange={option => {
                                                            if (option) {
                                                                setSelectedDepartment(option.value);
                                                                setEditingEmployee(prev =>
                                                                    prev ? { ...prev, departmentId: option.value, designationId: "" } : prev
                                                                );
                                                                setSelectedDesignation("");
                                                                if (socket && option.value) {
                                                                    console.log("Fetching designations for department:", option.value);
                                                                    socket.emit("hrm/designations/get", { departmentId: option.value });
                                                                } else {
                                                                    setDesignation([{ value: '', label: 'Select' }]);
                                                                }
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Designation</label>
                                                    <CommonSelect
                                                        className="select"
                                                        options={designation}
                                                        defaultValue={designation.find(dep => dep.value === editingEmployee?.designationId) || { value: '', label: 'Select' }}
                                                        onChange={option => {
                                                            if (option) {
                                                                setSelectedDesignation(option.value);
                                                                setEditingEmployee(prev =>
                                                                    prev ? { ...prev, designationId: option.value } : prev
                                                                );
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-12">
                                                <div className="mb-3">
                                                    <label className="form-label">
                                                        About <span className="text-danger"> *</span>
                                                    </label>
                                                    <textarea
                                                        className="form-control"
                                                        rows={3}
                                                        value={editingEmployee?.about}
                                                        onChange={(e) =>
                                                            setEditingEmployee(prev =>
                                                                prev ? { ...prev, about: e.target.value } : prev)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="modal-footer">
                                        <button
                                            type="button"
                                            className="btn btn-outline-light border me-2"
                                            data-bs-dismiss="modal"
                                        >
                                            Cancel
                                        </button>
                                        <button type="button" data-bs-dismiss="modal" className="btn btn-primary" onClick={handleUpdateSubmit}>
                                            Save
                                        </button>
                                    </div>
                                </div>
                                <div
                                    className="tab-pane fade"
                                    id="address2"
                                    role="tabpanel"
                                    aria-labelledby="address-tab2"
                                    tabIndex={0}
                                >

                                    <div className="modal-body">
                                        <div className="card bg-light-500 shadow-none">
                                            <div className="card-body d-flex align-items-center justify-content-between flex-wrap row-gap-3">
                                                <h6>Enable Options</h6>
                                                <div className="d-flex align-items-center justify-content-end">

                                                    {/* Enable all Modules toggle */}
                                                    <div className="form-check form-switch me-2">
                                                        <input
                                                            id="enableAllModules"
                                                            className="form-check-input me-2"
                                                            type="checkbox"
                                                            role="switch"
                                                            checked={Object.values(permissions.enabledModules).every(Boolean)} // all enabled
                                                            onChange={() => toggleAllModules(true)} // implement this to toggle all modules
                                                        />
                                                        <label className="form-check-label mt-0" htmlFor="enableAllModules">
                                                            Enable all Modules
                                                        </label>
                                                    </div>

                                                    {/* Select All - for all permissions across all modules (optional) */}
                                                    <div className="form-check d-flex align-items-center">
                                                        <input
                                                            id="selectAllPermissions"
                                                            className="form-check-input"
                                                            type="checkbox"
                                                            checked={allPermissionsSelected()} // implement function to check if all permissions are enabled
                                                            onChange={() => toggleGlobalSelectAll(true)} // toggle all permissions on/off
                                                        />
                                                        <label className="form-check-label mt-0" htmlFor="selectAllPermissions">
                                                            Select All
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="table-responsive border rounded">
                                            <table className="table">
                                                <tbody>
                                                    {MODULES.map((module) => (
                                                        <tr key={module}>
                                                            <td>
                                                                <div className="form-check form-switch me-2">
                                                                    <input
                                                                        id={`module-${module}`}
                                                                        className="form-check-input me-2"
                                                                        type="checkbox"
                                                                        role="switch"
                                                                        checked={permissions.enabledModules[module]}
                                                                        onChange={() => toggleModule(module)}
                                                                    />
                                                                    <label className="form-check-label mt-0" htmlFor={`module-${module}`}>
                                                                        {module.charAt(0).toUpperCase() + module.slice(1)}
                                                                    </label>
                                                                </div>
                                                            </td>

                                                            {ACTIONS.map((action) => (
                                                                <td key={action} className="align-middle">
                                                                    <div className="form-check d-flex align-items-center justify-content-center">
                                                                        <input
                                                                            id={`perm-${module}-${action}`}
                                                                            className="form-check-input"
                                                                            type="checkbox"
                                                                            checked={permissions.permissions[module][action]}
                                                                            onChange={(e) =>
                                                                                handlePermissionChange(module, action, e.target.checked)
                                                                            }
                                                                            disabled={!permissions.enabledModules[module]}
                                                                        />
                                                                        <label
                                                                            className="form-check-label mt-0 ms-1"
                                                                            htmlFor={`perm-${module}-${action}`}
                                                                        >
                                                                            {action.charAt(0).toUpperCase() + action.slice(1)}
                                                                        </label>
                                                                    </div>
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    <div className="modal-footer">
                                        <button
                                            type="button"
                                            className="btn btn-outline-light border me-2"
                                            data-bs-dismiss="modal"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            data-bs-toggle="modal" data-inert={true}
                                            data-bs-target="#success_modal"
                                            onClick={handlePermissionUpdateSubmit}
                                        >
                                            Save{" "}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div >
            </div >
            {/* /Edit Employee */}
            {/* Add Employee Success */}
            <div className="modal fade" id="success_modal" role="dialog">
                <div className="modal-dialog modal-dialog-centered modal-sm">
                    <div className="modal-content">
                        <div className="modal-body">
                            <div className="text-center p-3">
                                <span className="avatar avatar-lg avatar-rounded bg-success mb-3">
                                    <i className="ti ti-check fs-24" />
                                </span>
                                <h5 className="mb-2">Employee Added Successfully</h5>
                                <p className="mb-3">
                                    {formData.firstName} has been added with Employee ID :
                                    <span className="text-primary">#{formData.employeeId}</span>
                                </p>
                                <div>
                                    <div className="row g-2">
                                        <div className="col-6">
                                            <button
                                                type="button"
                                                className="btn btn-dark w-100"
                                                data-bs-dismiss="modal"
                                            >
                                                Back to Grid
                                            </button>
                                        </div>
                                        <div className="col-6">
                                            <Link
                                                to={`${all_routes.employeedetails}/${formData.employeeId}`}
                                                className="btn btn-primary w-100"
                                                onClick={handleResetFormData}
                                            >
                                                Detail Page
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* /Add Client Success */}
            {/* /Add Client Success */}
            <div className="modal fade" id="delete_modal">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-body text-center">
                            <span className="avatar avatar-xl bg-transparent-danger text-danger mb-3">
                                <i className="ti ti-trash-x fs-36" />
                            </span>
                            <h4 className="mb-1">Confirm Deletion</h4>
                            <p className="mb-3">
                                {employeeToDelete
                                    ? `Are you sure you want to delete employee "${employeeToDelete?.firstName}"? This cannot be undone.`
                                    : "You want to delete all the marked items, this can't be undone once you delete."}
                            </p>
                            <div className="d-flex justify-content-center">
                                <button
                                    className="btn btn-light me-3"
                                    data-bs-dismiss="modal"
                                    onClick={() => setEmployeeToDelete(null)}
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-danger"
                                    data-bs-dismiss="modal"
                                    onClick={() => {
                                        if (employeeToDelete) {
                                            deleteEmployee(employeeToDelete._id);
                                        }
                                        setEmployeeToDelete(null);
                                    }}
                                    disabled={loading}
                                >
                                    {loading ? 'Deleting...' : 'Yes, Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/*delete policy*/}
        </>

    )
}

export default EmployeesGrid
