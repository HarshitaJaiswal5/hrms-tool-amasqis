import React, { useState, useEffect } from 'react'
import { all_routes } from '../../router/all_routes'
import { Link } from 'react-router-dom'
import Table from "../../../core/common/dataTable/index";
import CommonSelect from '../../../core/common/commonSelect';
import { department_details } from '../../../core/data/json/department_details';
import CollapseHeader from '../../../core/common/collapse-header/collapse-header';
import { departmentName } from '../../../core/common/selectoption/selectoption';
import { useSocket } from "../../../SocketContext";
import { Socket } from "socket.io-client";
type PasswordField = "password" | "confirmPassword";

interface Departments {
  _id: string;
  department: string;
  employeeCount: number;
  status: string;
}

const statusChoose = [
  { value: "none", label: "None" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const Department = () => {
  const [departments, setDepartments] = useState<Departments[]>([]);
  const [sortedDepartments, setSortedDepartments] = useState<Departments[]>([]);
  const [departmentName, setDepartmentName] = useState("");
  const [selectedStatus, setSelectedStatus] = useState(statusChoose[0].value);
  const [loading, setLoading] = useState(false);
  const [responseData, setResponseData] = useState(null);
  const [error, setError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState("");
  const [filters, setFilters] = useState({ status: "" });
  const [editingDept, setEditingDept] = useState<Departments | null>(null);
  const [departmentToDelete, setDepartmentToDelete] = useState<Departments | null>(null);
  const socket = useSocket() as Socket | null;

  useEffect(() => {
    if (!socket) return;
    let isMounted = true;

    const timeoutId = setTimeout(() => {
      if (loading && isMounted) {
        console.warn("Policies loading timeout - showing fallback");
        setError("Policies loading timed out. Please refresh the page.");
        setLoading(false);
      }
    }, 30000);

    socket.emit("hr/departmentsStats/get");

    const handleAddDepartmentResponse = (response: any) => {
      if (!isMounted) return;
      setLoading(false);
      if (response.done) {
        setResponseData(response.data);
        setError(null);
        if (socket) {
          socket.emit("hr/departmentsStats/get");
        }
      } else {
        setError(response.error || "Failed to add policy");
      }
    };

    const handleDepartmentStatsResponse = (response: any) => {
      clearTimeout(timeoutId);
      if (!isMounted) return;

      if (response.done) {
        setDepartments(response.data);
        setError(null);
        setLoading(false);
      } else {
        setError(response.error || "Failed to fetch policies");
        setLoading(false);
      }
    }

    const handleUpdateDepartmentResponse = (response: any) => {
      clearTimeout(timeoutId);
      if (!isMounted) return;

      if (response.done) {
        setResponseData(response.data);
        setError(null);
        setLoading(false);
        if (socket) {
          socket.emit("hr/departmentsStats/get");
        }
      } else {
        setError(response.error || "Failed to fetch policies");
        setLoading(false);
      }
    }

    const handleDeleteDepartmentResponse = (response: any) => {
       if (!isMounted) return;

      if (response.done) {
        setResponseData(response.data);
        setError(null);
        setLoading(false);
        if (socket) {
          socket.emit("hr/departmentsStats/get");
        }
      } else {
        setError(response.error || "Failed to add policy");
        setLoading(false);
      }
    }

    socket.on("hr/departments/add-response", handleAddDepartmentResponse);
    socket.on("hr/departmentsStats/get-response", handleDepartmentStatsResponse);
    socket.on("hrm/departments/update-response", handleUpdateDepartmentResponse);
    socket.on("hrm/departments/delete-response", handleDeleteDepartmentResponse);
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      socket.off("hr/departments/add-response", handleAddDepartmentResponse);
      socket.off("hr/departmentsStats/get-response", handleDepartmentStatsResponse);
      socket.off("hrm/departments/update-response", handleUpdateDepartmentResponse);
      socket.off("hrm/departments/delete-response", handleDeleteDepartmentResponse);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  //  constants

  const columns = [
    {
      title: "Department",
      dataIndex: "department",
      render: (text: String, record: any) => (
        <h6 className="fw-medium">
          <Link to="#">{text}</Link>
        </h6>

      ),
      sorter: (a: any, b: any) => a.Department.length - b.Department.length,
    },
    {
      title: "No of Employees",
      dataIndex: "employeeCount",
      sorter: (a: any, b: any) => a.NoOfEmployees.length - b.NoOfEmployees.length,
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
      render: (_test: any, department: Departments) => (
        <div className="action-icon d-inline-flex">
          <Link
            to="#"
            className="me-2"
            data-bs-toggle="modal" data-inert={true}
            data-bs-target="#edit_department"
            onClick={() => { setEditingDept(department) }}
          >
            <i className="ti ti-edit" />
          </Link>
          <Link
           to="#"
            className="me-2"
            data-bs-toggle="modal"
            data-inert={true}
            data-bs-target="#delete_modal"
            onClick={() => { setDepartmentToDelete(department); }}
          >
            <i className="ti ti-trash" />
          </Link>
        </div>

      ),
    },
  ]

  const departmentsWithKey = departments.map((dept, index) => ({
    ...dept,
    key: dept._id || index.toString(),
  }));

  // helper functions
  const handleSubmit = () => {
    try {
      setError(null);

      if (!departmentName.trim()) {
        setError("Department Name is required");
        return;
      }

      if (!selectedStatus) {
        setError("Status is required");
        return;
      }

      setLoading(true);
      const payload = {
        departmentName: departmentName,
        status: selectedStatus,
      };

      if (!socket) {
        setError("Socket connection is not available.");
        setLoading(false);
        return;
      }

      socket.emit("hr/departments/add", payload);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("An unexpected error occurred");
      }
      setLoading(false);
    }
  };

  const handleSort = (order: string) => {
    setSortOrder(order);
    if (!order) {
      setSortedDepartments(departments);
      return;
    }
    const sortedData = [...departments].sort((a, b) => {
      const nameA = a.department.toLowerCase();
      const nameB = b.department.toLowerCase();

      if (order === "ascending") {
        return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
      }
      if (order === "descending") {
        return nameA > nameB ? -1 : nameA < nameB ? 1 : 0;
      }
      return 0;
    });
    setSortedDepartments(sortedData); // may not need this later
    setDepartments(sortedData);
  };

  const applyFilters = (updatedFields: {
    status?: string;
  }) => {
    try {
      setFilters(prevFilters => {
        const newFilters = { ...prevFilters, ...updatedFields };
        if (socket) {
          socket.emit("hr/departmentsStats/get", { ...newFilters });
        }
        return newFilters;
      });
    } catch (error) {
      console.error("Error applying filters:", error);
    }
  };

  const onSelectStatus = (st: string) => {
    applyFilters({ status: st });
  };

  const handleUpdateSubmit = (editingDept: Departments) => {
    try {
      setError(null);
      const { _id, department, status } = editingDept;

      if (!_id) {
        setError("Id not found");
        return;
      }

      if (!status) {
        setError("Status is required");
        return;
      }


      if (!department) {
        setError("Department name is required");
        return;
      }

      setLoading(true);

      const payload = {
        _id,
        status,
        department,
      };

      if (socket) {
        socket.emit("hrm/departments/update", payload);
      } else {
        setError("Socket connection is not available.");
        setLoading(false);
      }
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("An unexpected error occurred");
      }
      setLoading(false);
    }
  };

  const deleteDepartment = (departmentId: string) => {
    try {
      setLoading(true);
      setError(null);

      if (!socket) {
        setError("Socket connection is not available");
        setLoading(false);
        return;
      }

      if (!departmentId) {
        setError("Policy ID is required");
        setLoading(false);
        return;
      }
      const data = {
        _id : departmentId,
      }   

      socket.emit("hrm/departments/delete", data);
    } catch (error) {
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
              <h2 className="mb-1">Departments</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={all_routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">Employee</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Departments
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
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
                  data-bs-target="#add_department"
                  className="btn btn-primary d-flex align-items-center"
                >
                  <i className="ti ti-circle-plus me-2" />
                  Add Department
                </Link>
              </div>
              <div className="head-icons ms-2">
                <CollapseHeader />
              </div>
            </div>
          </div>
          {/* /Breadcrumb */}
          {/* Performance Indicator list */}
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
              <h5>Department List</h5>
              <div className="d-flex my-xl-auto right-content align-items-center flex-wrap row-gap-3">
                <div className="dropdown me-3">
                  <Link
                    to="#"
                    className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    Status{filters.status ? `: ${filters.status.charAt(0).toUpperCase() + filters.status.slice(1)}` : ": None"}
                  </Link>
                  <ul className="dropdown-menu dropdown-menu-end p-3">
                    {statusChoose.map((st) => (
                      <li key={st.value}>
                        <button
                          type="button"
                          className="dropdown-item rounded-1"
                          onClick={() => onSelectStatus(st.value)}
                        >
                          {st.label}
                        </button>
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
              <Table dataSource={departmentsWithKey} columns={columns} Selection={true} />
            </div>
          </div>
          {/* /Performance Indicator list */}
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
      {/* Add Department */}
      <div className="modal fade" id="add_department">
        <div className="modal-dialog modal-dialog-centered modal-md">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Add Department</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form>
              <div className="modal-body pb-0">
                <div className="row">
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Department Name</label>
                      <input type="text" className="form-control"
                        value={departmentName} onChange={(e) => setDepartmentName(e.target.value)} />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Status</label>
                      <CommonSelect
                        options={statusChoose}
                        defaultValue={statusChoose.find(opt => opt.value === selectedStatus)}
                        onChange={(selectedOption) =>
                          setSelectedStatus(selectedOption ? selectedOption.value : statusChoose[0].value)
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-light me-2"
                  data-bs-dismiss="modal"
                >
                  Cancel
                </button>
                <button type="button" data-bs-dismiss="modal" className="btn btn-primary"
                  disabled={loading} onClick={handleSubmit}>
                  Add Department
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Add Department */}
      {/* Edit Department */}
      <div className="modal fade" id="edit_department">
        <div className="modal-dialog modal-dialog-centered modal-md">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Edit Department</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form>
              <div className="modal-body pb-0">
                <div className="row">
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Department Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editingDept?.department || ""}
                        onChange={(e) =>
                          setEditingDept(prev =>
                            prev ? { ...prev, department: e.target.value } : prev)}
                      />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Status</label>
                      <CommonSelect
                        className='select'
                        options={statusChoose}
                        defaultValue={statusChoose.find(d => d.value === editingDept?.status) || statusChoose[0].value}
                        onChange={(selectedOption) =>
                          setEditingDept(prev =>
                            prev ? { ...prev, status: selectedOption?.value || "" } : prev
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-light me-2"
                  data-bs-dismiss="modal"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-bs-dismiss="modal"
                  className="btn btn-primary"
                  onClick={() => {
                    if (editingDept) {
                      handleUpdateSubmit(editingDept);
                    }
                  }}
                  disabled={!editingDept}
                >
                  Update Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Edit Department */}
      {/* delete policy*/}
      <div className="modal fade" id="delete_modal">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-body text-center">
              <span className="avatar avatar-xl bg-transparent-danger text-danger mb-3">
                <i className="ti ti-trash-x fs-36" />
              </span>
              <h4 className="mb-1">Confirm Deletion</h4>
              <p className="mb-3">
                {departmentToDelete
                  ? `Are you sure you want to delete policy "${departmentToDelete.department}"? This cannot be undone.`
                  : "You want to delete all the marked items, this can't be undone once you delete."}
              </p>
              <div className="d-flex justify-content-center">
                <button
                  className="btn btn-light me-3"
                  data-bs-dismiss="modal"
                  onClick={() => setDepartmentToDelete(null)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  data-bs-dismiss="modal"
                  onClick={() => {
                    if (departmentToDelete) {
                      deleteDepartment(departmentToDelete._id);
                    }
                    setDepartmentToDelete(null);
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
export default Department
