import React, { useState, useEffect, useRef } from 'react'
import { all_routes } from '../../router/all_routes'
import { Link } from 'react-router-dom'
import Table from "../../../core/common/dataTable/index";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";
import PredefinedDateRanges from '../../../core/common/datePicker';
import { employee_list_details } from '../../../core/data/json/employees_list_details';
import { DatePicker } from 'antd';
import CommonSelect from '../../../core/common/commonSelect';
import CollapseHeader from '../../../core/common/collapse-header/collapse-header';
import Password from 'antd/es/input/Password';
import { useSocket } from "../../../SocketContext";
import { Socket } from "socket.io-client";
import { toast, ToastContainer } from "react-toastify";
import Designations from './designations';

interface Department {
  _id: string;
  department: string;
}

interface Designation {
  _id: string;
  designation: string;
}

interface Option {
  label: string,
  value: string,
}

interface Employee {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  company: string;
  phone: string;
  designation: string;
  department: string;
  status: 'active' | 'inactive';
  joiningDate: string;
  about: string;
}

interface EmployeeStats {
  totalEmployees: number;
  activeCount: number;
  inactiveCount: number;
  newJoinersCount: number;
}

interface GetEmployeesStatsSuccess {
  stats: EmployeeStats;
  employees: Employee[];
}

// Helper Functions
const generateId = (prefix: string): string => {
  const randomNum = Math.floor(1 + Math.random() * 9999);
  const paddedNum = randomNum.toString().padStart(4, '0');
  return `${prefix}-${paddedNum}`;
};

// Type definitions
type PasswordField = "password" | "confirmPassword";
type PermissionAction = "read" | "write" | "create" | "delete" | "import" | "export";
type PermissionModule = "holidays" | "leaves" | "clients" | "projects" | "tasks" | "chats" | "assets" | "timingSheets";

interface PermissionSet {
  read: boolean;
  write: boolean;
  create: boolean;
  delete: boolean;
  import: boolean;
  export: boolean;
}

interface PermissionsState {
  enabledModules: Record<PermissionModule, boolean>;
  permissions: Record<PermissionModule, PermissionSet>;
  selectAll: Record<PermissionModule, boolean>;
}

const MODULES: PermissionModule[] = [
  "holidays", "leaves", "clients", "projects", "tasks", "chats", "assets", "timingSheets"
];

const EMPTY_OPTION = { value: '', label: 'Select Designation' };

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

const EmployeeList = () => {

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("basic-info");
  const [responseData, setResponseData] = useState(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUpload, setImageUpload] = useState(false);
  const [department, setDepartment] = useState<Option[]>([]);
  const [designation, setDesignation] = useState<Option[]>([]);
  const [allDesignations, setAllDesignations] = useState<Option[]>([]);
  const [filteredDesignations, setFilteredDesignations] = useState<Option[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedDesignation, setSelectedDesignation] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [filters, setFilters] = useState({ startDate: "", endDate: "", status: "", departmentId: "" });
  const [sortedEmployee, setSortedEmployee] = useState<Employee[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<EmployeeStats>({
    totalEmployees: 0,
    activeCount: 0,
    inactiveCount: 0,
    newJoinersCount: 0
  });

  const [formData, setFormData] = useState({
    employeeId: generateId("EMP"),
    avatarUrl: "",
    firstName: "",
    lastName: "",
    joiningDate: "",
    email: "",
    userName: "",
    password: "",
    phone: "",
    company: "",
    designationId: "",
    departmentId: "",
    about: "",
  })
  const [permissions, setPermissions] = useState(initialState);

  const socket = useSocket() as Socket | null;

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

    socket.emit("hrm/employees/get-employee-stats")
    socket.emit("hr/departments/get");

    const handleAddEmployeeResponse = (response: any) => {
      if (!isMounted) return;

      if (response.done) {
        setResponseData(response.data);
        setError(null);
        setLoading(false);
        if (socket) {
          socket.emit("hrm/employees/get-employee-stats");
        }
      } else {
        setError(response.error || "Failed to add policy");
        setLoading(false);
      }
    };

    const handleDesignationResponse = (response: any) => {
      if (!isMounted) return;

      if (response.done && Array.isArray(response.data)) {
        const mappedDesignations = response.data.map((d: Designation) => ({
          value: d._id,
          label: d.designation,
        }));
        setDesignation([
          { value: '', label: 'Select' },
          ...mappedDesignations,
        ]);
        setError(null);
        setLoading(false);
      } else {
        setError(response.error || "Failed to get designations");
        setLoading(false);
      }
    }

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

    const handleEmployeeResponse = (response: any) => {
      if (!isMounted) return;

      if (response.done) {
        if (response.data) {
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

    const handleEmployeeDelete = (response: any) => {
      if (!isMounted) return;

      if (response.done) {
        setResponseData(response.data);
        setError(null);
        setLoading(false);
        if (socket) {
          socket.emit("hrm/employees/get-employee-stats");
        }
      } else {
        setError(response.error || "Failed to add policy");
        setLoading(false);
      }
    }

    socket.on("hrm/employees/add-response", handleAddEmployeeResponse);
    socket.on("hrm/designations/get-response", handleDesignationResponse);
    socket.on("hr/departments/get-response", handleDepartmentResponse);
    socket.on("hrm/employees/get-employee-stats-response", handleEmployeeResponse);
    socket.on("hrm/employees/delete-response", handleEmployeeDelete);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      socket.off("hrm/employees/add-response", handleAddEmployeeResponse);
      socket.off("hrm/designations/get-response", handleDesignationResponse);
      socket.off("hr/departments/get-response", handleDepartmentResponse);
      socket.off("hrm/employees/get-employee-stats-response", handleEmployeeResponse);
      socket.off("hrm/employees/delete-response", handleEmployeeDelete);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  console.log("Stats", stats);

  const data = employee_list_details;
  const columns = [
    {
      title: "Emp ID",
      dataIndex: "employeeId",
      render: (text: String, record: any) => (
        <Link to={all_routes.employeedetails}>{text}</Link>
      ),
      sorter: (a: any, b: any) => a.EmpId.length - b.EmpId.length,
    },
    {
      title: "Name",
      dataIndex: "name",
      render: (text: string, record: any) => {
        return (
          <div className="d-flex align-items-center">
            <Link
              to={all_routes.employeedetails}
              className="avatar avatar-md"
              data-bs-toggle="modal"
              data-inert={true}
              data-bs-target="#view_details"
            >
              <img
                src={record.avatarUrl || "assets/img/favicon.png"}
                className="img-fluid rounded-circle"
                alt="img"
              />
            </Link>
            <div className="ms-2">
              <p className="text-dark mb-0">
                <Link
                  to={all_routes.employeedetails}
                  data-bs-toggle="modal"
                  data-inert={true}
                  data-bs-target="#view_details"
                >
                  {record.firstName} {record.lastName}
                </Link>
              </p>
              <span className="fs-12">{record.role}</span>
            </div>
          </div>
        );
      },
      sorter: (a: any, b: any) => a.Name.length - b.Name.length,
    },
    {
      title: "Email",
      dataIndex: "email",
      sorter: (a: any, b: any) => a.Email.length - b.Email.length,
    },
    {
      title: "Phone",
      dataIndex: "phone",
      sorter: (a: any, b: any) => a.Phone.length - b.Phone.length,
    },
    {
      title: "Department",
      dataIndex: "departmentId",
      render: (text: string, record: any) => (
        department.find(dep => dep.value === record.departmentId)?.label
      ),
      sorter: (a: any, b: any) => a.Designation.length - b.Designation.length,
    },
    {
      title: "Joining Date",
      dataIndex: "joiningDate",
      sorter: (a: any, b: any) =>
        new Date(a.joiningDate).getTime() - new Date(b.joiningDate).getTime(),
      render: (date: string | Date) => {
        if (!date) return "-";
        const d = new Date(date);
        return d.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric"
        });
      }
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (text: string, record: any) => (
        <span className={`badge ${text === 'active' ? 'badge-success' : 'badge-danger'} d-inline-flex align-items-center badge-xs`}>
          <i className="ti ti-point-filled me-1" />
          {text}
        </span>

      ),
      sorter: (a: any, b: any) => a.Status.length - b.Status.length,
    },
    {
      title: "",
      dataIndex: "actions",
      render: (_test: any, employee: Employee) => (
        <div className="action-icon d-inline-flex">
          <Link
            to="#"
            className="me-2"
            data-bs-toggle="modal" data-inert={true}
            data-bs-target="#edit_employee"
            onClick={() => { setEditingEmployee(employee) }}
          >
            <i className="ti ti-edit" />
          </Link>
          <Link to="#" data-bs-toggle="modal" data-inert={true} data-bs-target="#delete_modal"
            onClick={() => { setEmployeeToDelete(employee) }}>
            <i className="ti ti-trash" />
          </Link>
        </div>
      ),
    },
  ]

  console.log("Employees", employees);


  const [passwordVisibility, setPasswordVisibility] = useState({
    password: false,
    confirmPassword: false,
  });

  // Helper functions
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const onSelectStatus = (status: string) => {
    if (!status) return;
    setSelectedStatus(status);
    applyFilters({ status });
  };

  const onSelectDepartment = (id: string) => {
    console.log(id);

    applyFilters({ departmentId: id });
  };

  const applyFilters = (updatedFields: {
    departmentId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    try {
      setFilters(prevFilters => {
        const newFilters = { ...prevFilters, ...updatedFields };
        if (socket) {
          socket.emit("hrm/employees/get-employee-stats", { ...newFilters });
        }
        return newFilters;
      });
    } catch (error) {
      console.error("Error applying filters:", error);
    }
  };


  // Handle file upload
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
      toast.error("File size must be less than 4MB.", { position: "top-right", autoClose: 3000 });
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
        toast.error("Failed to upload image. Please try again.", { position: "top-right", autoClose: 3000 });
        event.target.value = "";
      } finally {
        setLoading(false);
      }
    } else {
      toast.error("Please upload image file only.", { position: "top-right", autoClose: 3000 });
      event.target.value = "";
    }
  };

  const removeLogo = () => {
    setFormData(prev => ({ ...prev, avatarUrl: "" }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDateRangeFilter = (ranges: { start?: string; end?: string } = { start: "", end: "" }) => {
    try {
      if (ranges.start && ranges.end) {
        ;
        applyFilters({ startDate: ranges.start, endDate: ranges.end });
      } else {
        applyFilters({ startDate: "", endDate: "" });
      }
    } catch (error) {
      console.error("Error handling time range selection:", error);
    }
  };


  // Handle date change
  const handleDateChange = (date: string) => {
    setFormData(prev => ({ ...prev, joiningDate: date }));
  };

  // Handle select dropdown changes
  const handleSelectChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Toggle password visibility
  const togglePasswordVisibility = (field: PasswordField) => {
    setPasswordVisibility(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

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

  // ======================
  // PERMISSIONS HANDLERS
  // ======================

  // Constant array matching PermissionModule union type exactly
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

  // Constant array for actions, matching PermissionSet keys exactly
  const ACTIONS: PermissionAction[] = [
    "read",
    "write",
    "create",
    "delete",
    "import",
    "export",
  ];

  // Toggle individual permission (single action in a module)
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

  // Toggle "Select All" for a specific module (all permissions checked or unchecked)
  const toggleSelectAllForModule = (module: PermissionModule) => {
    setPermissions((prev) => {
      const newSelectAllState = !prev.selectAll[module];

      // Build a new permission set with all actions set to newSelectAllState
      const newPermissionsForModule: PermissionSet = ACTIONS.reduce(
        (acc, action) => {
          acc[action] = newSelectAllState;
          return acc;
        },
        {} as PermissionSet
      );

      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [module]: newPermissionsForModule,
        },
        selectAll: {
          ...prev.selectAll,
          [module]: newSelectAllState,
        },
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

  // ======================
  // FORM SUBMISSION
  // ======================

  // Validate form before submission
  const validateForm = (): boolean => {
    // Check required fields
    const requiredFields = ['firstName', 'email', 'userName', 'password', 'phone'];
    for (const field of requiredFields) {
      if (!formData[field as keyof typeof formData]) {
        alert(`Please fill in ${field}`);
        return false;
      }
    }

    // Check password match
    if (formData.password !== confirmPassword) {
      alert("Passwords don't match!");
      return false;
    }

    return true;
  };

  // Handle form submission
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
        joiningDate,
        email,
        userName,
        password,
        phone,
        company,
        departmentId,
        designationId,
        about,
      } = formData;

      const basicInfo = {
        employeeId,
        avatarUrl,
        firstName,
        lastName,
        joiningDate,
        email,
        userName,
        password,
        phone,
        company,
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
      joiningDate: "",
      email: "",
      userName: "",
      password: "",
      phone: "",
      company: "",
      departmentId: "",
      designationId: "",
      about: "",
    });

    setPermissions(initialState);
    setError("");
  }

  // Modal container helper (for DatePicker positioning)
  const getModalContainer = (): HTMLElement => {
    const modalElement = document.getElementById('modal-datepicker');
    return modalElement ? modalElement : document.body;
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Save logic here...

    // After successful save:
    setActiveTab("address");
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
                    Employee List
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
              <div className="me-2 mb-2">
                <div className="d-flex align-items-center border bg-white rounded p-1 me-2 icon-list">
                  <Link
                    to={all_routes.employeeList}
                    className="btn btn-icon btn-sm active bg-primary text-white me-1"
                  >
                    <i className="ti ti-list-tree" />
                  </Link>
                  <Link to={all_routes.employeeGrid} className="btn btn-icon btn-sm">
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
                  onClick={() => generateId("EMP")}
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
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
              <h5>Employee List</h5>
              <div className="d-flex my-xl-auto right-content align-items-center flex-wrap row-gap-3">
                <div className="me-3">
                  <div className="input-icon-end position-relative">
                    <PredefinedDateRanges onChange={handleDateRangeFilter} />
                    <span className="input-icon-addon">
                      <i className="ti ti-chevron-down" />
                    </span>
                  </div>
                </div>
                <div className="dropdown me-3">
                  <Link
                    to="#"
                    className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                    role="button"
                    aria-expanded="false"
                  >
                    Department
                    {selectedDepartment
                      ? `: ${department.find(dep => dep.value === selectedDepartment)?.label || "None"
                      }`
                      : ": None"}
                  </Link>
                  <ul className="dropdown-menu dropdown-menu-end p-3">
                    {department
                      .filter(dep => dep.value)
                      .map(dep => (
                        <li key={dep.value}>
                          <Link
                            to="#"
                            className={`dropdown-item rounded-1${selectedDepartment === dep.value ? " active" : ""}`}
                            onClick={e => {
                              e.preventDefault();
                              setSelectedDepartment(dep.value);
                              onSelectDepartment(dep.value);
                            }}
                          >
                            {dep.label}
                          </Link>
                        </li>
                      ))}
                  </ul>
                </div>
                <div className="dropdown me-3">
                  <Link
                    to="#"
                    className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    Select status {selectedStatus ? `: ${selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)}` : ": None"}
                  </Link>
                  <ul className="dropdown-menu  dropdown-menu-end p-3">
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={() => onSelectStatus("all")}
                      >
                        All
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={() => onSelectStatus("active")}
                      >
                        Active
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={() => onSelectStatus("inactive")}
                      >
                        Inactive
                      </Link>
                    </li>
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
                  <ul className="dropdown-menu dropdown-menu-end p-3">
                    <li>
                      <button
                        type="button"
                        className="dropdown-item rounded-1"
                        onClick={() => handleSort("ascending")}
                      >
                        Ascending
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className="dropdown-item rounded-1"
                        onClick={() => handleSort("descending")}
                      >
                        Descending
                      </button>
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
            <div className="card-body p-0">
              <Table dataSource={employees} columns={columns} Selection={true} />
            </div>
          </div>
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
      <ToastContainer />
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
                              name="joiningDate"
                              value={formData.joiningDate}
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
                            value={formData.userName}
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
                            value={formData.email}
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
                              value={formData.password}
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
                            value={formData.phone}
                            onChange={handleChange} />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">
                            Company<span className="text-danger"> *</span>
                          </label>
                          <input type="text" className="form-control"
                            name="company"
                            value={formData.company}
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
                                  socket.emit("hrm/designations/get", { department: option.value });
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
                            <ImageWithBasePath
                              src="assets/img/users/user-13.jpg"
                              alt="img"
                              className="rounded-circle"
                            />
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
                                  multiple
                                />
                              </div>
                              <Link
                                to="#"
                                className="btn btn-light btn-sm"
                              >
                                Cancel
                              </Link>
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
                              format={{
                                format: "DD-MM-YYYY",
                                type: "mask",
                              }}
                              getPopupContainer={getModalContainer}
                              placeholder="DD-MM-YYYY"
                              onChange={(date) =>
                                setEditingEmployee(prev =>
                                  prev ? { ...prev, joiningDate: date ? date.format("YYYY-MM-DD") : "" } : prev)}
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
                            value={editingEmployee?.userName}
                            onChange={(e) =>
                              setEditingEmployee(prev =>
                                prev ? { ...prev, userName: e.target.value } : prev)}
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
                            value={editingEmployee?.email}
                            onChange={(e) =>
                              setEditingEmployee(prev =>
                                prev ? { ...prev, email: e.target.value } : prev)}
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
                            value={editingEmployee?.phone}
                            onChange={(e) =>
                              setEditingEmployee(prev =>
                                prev ? { ...prev, phone: e.target.value } : prev)}
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
                            value={editingEmployee?.company}
                            onChange={(e) =>
                              setEditingEmployee(prev =>
                                prev ? { ...prev, company: e.target.value } : prev)}
                          />
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
                    <button type="button" data-bs-dismiss="modal" className="btn btn-primary">
                      Save{" "}
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
                          <div className="form-check form-switch me-2">
                            <label className="form-check-label mt-0">
                              <input
                                className="form-check-input me-2"
                                type="checkbox"
                                role="switch"
                              />
                              Enable all Module
                            </label>
                          </div>
                          <div className="form-check d-flex align-items-center">
                            <label className="form-check-label mt-0">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                defaultChecked
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
                          <tr>
                            <td>
                              <div className="form-check form-switch me-2">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input me-2"
                                    type="checkbox"
                                    role="switch"
                                    defaultChecked
                                  />
                                  Holidays
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    defaultChecked
                                  />
                                  Read
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                  Write
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                  Create
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    defaultChecked
                                  />
                                  Delete
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                  Import
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                  Export
                                </label>
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <div className="form-check form-switch me-2">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input me-2"
                                    type="checkbox"
                                    role="switch"
                                  />
                                  Leaves
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                  Read
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                  Write
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                  Create
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                  Delete
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                  Import
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                  Export
                                </label>
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <div className="form-check form-switch me-2">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input me-2"
                                    type="checkbox"
                                    role="switch"
                                  />
                                  Clients
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                  Read
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                  Write
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                  Create
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                  Delete
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                  Import
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                  Export
                                </label>
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <div className="form-check form-switch me-2">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input me-2"
                                    type="checkbox"
                                    role="switch"
                                  />
                                  Projects
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                  Read
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                  Write
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                  Create
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                  Delete
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                  Import
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                  Export
                                </label>
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <div className="form-check form-switch me-2">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input me-2"
                                    type="checkbox"
                                    role="switch"
                                  />
                                  Tasks
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                  Read
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                  Write
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                  Create
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                  Delete
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                  Import
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                  Export
                                </label>
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <div className="form-check form-switch me-2">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input me-2"
                                    type="checkbox"
                                    role="switch"
                                  />
                                  Chats
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                  Read
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                  Write
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                  Create
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                  Delete
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                  Import
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                  Export
                                </label>
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <div className="form-check form-switch me-2">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input me-2"
                                    type="checkbox"
                                    role="switch"
                                    defaultChecked
                                  />
                                  Assets
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                  Read
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                  Write
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    defaultChecked
                                  />
                                  Create
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                  Delete
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    defaultChecked
                                  />
                                  Import
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                  Export
                                </label>
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <div className="form-check form-switch me-2">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input me-2"
                                    type="checkbox"
                                    role="switch"
                                  />
                                  Timing Sheets
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                  Read
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                  Write
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                  Create
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                  Delete
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                  Import
                                </label>
                              </div>
                            </td>
                            <td>
                              <div className="form-check d-flex align-items-center">
                                <label className="form-check-label mt-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                  Export
                                </label>
                              </div>
                            </td>
                          </tr>
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
                    >
                      Save{" "}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
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
                      <Link to={all_routes.employeeList} className="btn btn-dark w-100" data-bs-dismiss="modal" onClick={handleResetFormData}>
                        Back to List
                      </Link>
                    </div>
                    <div className="col-6">
                      <Link
                        to={all_routes.employeedetails}
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

export default EmployeeList
