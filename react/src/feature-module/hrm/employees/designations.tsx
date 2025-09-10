import React, { useState, useEffect, useMemo } from 'react'
import { all_routes } from '../../router/all_routes'
import { Link } from 'react-router-dom'
import Table from "../../../core/common/dataTable/index";
import CommonSelect from '../../../core/common/commonSelect';
import { designation_details } from '../../../core/data/json/designation_details';
import CollapseHeader from '../../../core/common/collapse-header/collapse-header';
import { usersDetails } from '../../../core/data/json/usersDetails';
import { useSocket } from "../../../SocketContext";
import { Socket } from "socket.io-client";
import { departmentSelect } from '../../../core/common/selectoption/selectoption';

type PasswordField = "password" | "confirmPassword";

interface Designations {
  _id: string;
  designation: string;
  departmentId: string;
  department: string;
  employeeCount: number;
  status: string;
}

interface Departments {
  _id: string;
  department: string;
  status: string
}

const statusChoose = [
  { value: "Select", label: "Select" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const staticOptions = [
  { label: "Select", value: "" }
];

const Designations = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [designationName, setDesignationName] = useState("");
  const [departmentId, setDepartmentId] = useState(staticOptions[0]?.value || "");
  const [status, setStatus] = useState(statusChoose[0]?.value || "");
  const [responseData, setResponseData] = useState<Designations[]>([]);
  const [departments, setDepartments] = useState<Departments[]>([]);
  const [designations, setDesignations] = useState<Designations[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [sortedDesignations, setSortedDesignations] = useState<Designations[]>([]);
  const [sortOrder, setSortOrder] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [filters, setFilters] = useState({ department: "", status: "" });
  const [editingDesignation, setEditingDesignation] = useState<Designations | null>(null);
  const [designationToDelete, setDesignationToDelete] = useState<Designations | null>(null);
  const [updateLoading, setUpdateLoading] = useState(false);

  const socket = useSocket() as Socket | null;

  useEffect(() => {
    if (!socket) return;

    let isMounted = true;
    setLoading(true);

    const timeoutId = setTimeout(() => {
      if (loading && isMounted) {
        console.warn("Designations loading timeout - showing fallback");
        setError("Designations loading timed out. Please refresh the page.");
        setLoading(false);
      }
    }, 30000);

    socket.emit("hr/departments/get");
    socket.emit("hrm/designations/get");

    const handleDepartmentsResponse = (response: any) => {
      if (!isMounted) return;
      if (response.data) {
        setDepartments(response.data);
        setError(null);
        setLoading(false);
      } else {
        setError(response.error || "Failed to fetch Departments");
        setLoading(false);
      }
    };

    const handleAddDesignationsResponse = (response: any) => {
      if (!isMounted) return;
      if (response.done) {
        setResponseData(response.data);
        setError(null);
        setLoading(false);
        socket?.emit("hrm/designations/get");
      } else {
        setError(response.error || "Failed to add Designations");
        setLoading(false);
      }
    };

    const handleDisplayResponse = (response: any) => {
      if (!isMounted) return;
      if (response.done) {
        setResponseData(response.data);
        setDesignations(response.data);
        setError(null);
        setLoading(false);
      } else {
        setError(response.error || "Failed to fetch Designations");
        setLoading(false);
      }
    };

    const handleUpdateResponse = (response: any) => {
      if (!isMounted) return;
      if (response.done) {
        setError(null);
        setUpdateLoading(false);
        socket?.emit("hrm/designations/get");
      } else {
        setError(response.error || "Failed to update designation");
        setUpdateLoading(false);
      }
    };

    const handleDeleteResponse = (response: any) => {
      if (!isMounted) return;
      if (response.done) {
        setError(null);
        setLoading(false);
        socket?.emit("hrm/designations/get");
      } else {
        setError(response.error || "Failed to delete designation");
        setLoading(false);
      }
    };

    // Register all listeners
    socket.on("hrm/designations/add-response", handleAddDesignationsResponse);
    socket.on("hrm/designations/get-response", handleDisplayResponse);
    socket.on("hrm/designations/update-response", handleUpdateResponse);
    socket.on("hrm/designations/delete-response", handleDeleteResponse);
    socket.on("hr/departments/get-response", handleDepartmentsResponse);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      socket.off("hrm/designations/add-response", handleAddDesignationsResponse);
      socket.off("hrm/designations/get-response", handleDisplayResponse);
      socket.off("hrm/designations/update-response", handleUpdateResponse);
      socket.off("hrm/designations/delete-response", handleDeleteResponse);
      socket.off("hr/departments/get-response", handleDepartmentsResponse);
    };
  }, [socket]);

  const columns = [
    {
      title: "Designation",
      dataIndex: "designation",
      render: (text: String, record: any) => (
        <h6 className="fw-medium fs-14 text-dark">{text}</h6>
      ),
      sorter: (a: any, b: any) => a.Designation.length - b.Designation.length,
    },
    {
      title: "Department",
      dataIndex: "department",
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
      render: (_test: any, designation: Designations) => (
        <div className="action-icon d-inline-flex">
          <Link
            to="#"
            className="me-2"
            data-bs-toggle="modal"
            data-inert={true}
            data-bs-target="#edit_designation"
            onClick={() => { setEditingDesignation(designation); }}
          >
            <i className="ti ti-edit" />
          </Link>
          <Link
            to="#"
            className="me-2"
            data-bs-toggle="modal"
            data-inert={true}
            data-bs-target="#delete_modal"
            onClick={() => { setDesignationToDelete(designation); }}
          >
            <i className="ti ti-trash" />
          </Link>
        </div>
      ),
    },
  ]

  const departmentOptions = useMemo(() => {
    return departments.map(dept => ({
      value: dept._id,
      label: dept.department.charAt(0).toUpperCase() + dept.department.slice(1).toLowerCase(),
    }));
  }, [departments]);

  const designationData = designations.map((d, index) => ({
    ...d,
    key: d._id || index.toString(),
  }))

  const selectedDepartmentOption = useMemo(() => {
    return departmentOptions.find(opt => opt.value === selectedDepartmentId);
  }, [departmentOptions, selectedDepartmentId]);

  const handleSubmit = () => {
    try {
      setError(null);

      if (!designationName.trim()) {
        setError("Designation Name is required");
        return;
      }

      if (!selectedDepartmentId) {
        setError("Department is required");
        return;
      }

      if (!status) {
        setError("Status is required");
        return;
      }

      setLoading(true);

      const data = {
        designationName,
        departmentId: selectedDepartmentId,
        status,
      };

      if (socket) {
        socket.emit("hrm/designations/add", data);
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

  const handleSort = (order: string) => {
    setSortOrder(order);
    if (!order) {
      setSortedDesignations(designations);
      return;
    }
    const sortedData = [...designations].sort((a, b) => {
      const nameA = a.designation.toLowerCase();
      const nameB = b.designation.toLowerCase();

      if (order === "ascending") {
        return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
      }
      if (order === "descending") {
        return nameA > nameB ? -1 : nameA < nameB ? 1 : 0;
      }
      return 0;
    });
    setSortedDesignations(sortedData);
    setDesignations(sortedData);
  };

  const applyFilters = (updatedFields: {
    department?: string;
    status?: string;
  }) => {
    try {
      setFilters(prevFilters => {
        const newFilters = { ...prevFilters, ...updatedFields };
        if (socket) {
          socket.emit("hrm/designations/get", { ...newFilters });
        }
        return newFilters;
      });
    } catch (error) {
      console.error("Error applying filters:", error);
    }
  };

  const onSelectDepartment = (id: string) => {
    applyFilters({ department: id });
  };

  const onSelectStatus = (status: string) => {
    if (!status) return;
    setSelectedStatus(status);
    applyFilters({ status });
  };

  const handleUpdateSubmit = () => {
    try {
      if (!editingDesignation) {
        setError("No designation selected for update");
        return;
      }

      setError(null);
      setUpdateLoading(true);

      const { _id, designation, departmentId, status } = editingDesignation;

      if (!_id) {
        setError("Designation ID is required.");
        return;
      }

      if (!designation || designation.trim() === "") {
        setError("Designation name is required.");
        return;
      }

      if (!departmentId) {
        setError("Department ID is required.");
        return;
      }

      if (!status) {
        setError("Status is required.");
        return;
      }

      const payload = {
        designationId: _id,
        designation: designation.trim(),
        departmentId: departmentId.trim(),
        status: status.trim().toLowerCase(),
      };

      if (socket) {
        socket.emit("hrm/designations/update", payload);
      } else {
        setError("Socket connection is not available.");
        setUpdateLoading(false);
      }
    } catch (error) {
      setUpdateLoading(false);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("An unexpected error occurred");
      }
    }
  };

  const handleDelete = () => {
    try {
      if (!designationToDelete) {
        setError("No designation selected for deletion");
        return;
      }

      setLoading(true);
      setError(null);

      if (socket) {
        socket.emit("hrm/designations/delete", { _id: designationToDelete._id });
      } else {
        setError("Socket connection is not available.");
        setLoading(false);
      }
    } catch (error) {
      setLoading(false);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("An unexpected error occurred");
      }
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
              <h2 className="mb-1">Designations</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={all_routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">Employee</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Designations
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
                  data-bs-target="#add_designation"
                  className="btn btn-primary d-flex align-items-center"
                >
                  <i className="ti ti-circle-plus me-2" />
                  Add Designation
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
              <h5>Designation List</h5>
              <div className="d-flex my-xl-auto right-content align-items-center flex-wrap row-gap-3">
                <div className="dropdown me-3">
                  <Link
                    to="#"
                    className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    {loading ? ('Loading...') : selectedDepartmentId ? (
                      `Department: ${departments.find(d => d._id === selectedDepartmentId)?.department || 'None'}`
                    ) : (
                      "Department: None"
                    )}
                  </Link>
                  <ul className="dropdown-menu dropdown-menu-end p-3">
                    {loading ? (
                      <li><span className="dropdown-item">Loading...</span></li>
                    ) : error ? (
                      <li>
                        <div className="dropdown-item text-danger">
                          {error} <button onClick={() => socket?.emit("hr/departments/get")}>Retry</button>
                        </div>
                      </li>
                    ) : (
                      departments.map(dept => (
                        <li key={dept._id}>
                          <Link
                            to="#"
                            className={`dropdown-item rounded-1 ${selectedDepartmentId === dept._id ? 'active' : ''}`}
                            onClick={(e) => {
                              e.preventDefault();
                              setSelectedDepartmentId(dept._id);
                              onSelectDepartment(dept._id);
                            }}
                          >
                            {dept.department}
                          </Link>
                        </li>
                      ))
                    )}
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
                    Sort By {sortOrder ? `: ${sortOrder.charAt(0).toUpperCase() + sortOrder.slice(1)}` : ": None"}
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
                        Desending
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={() => handleSort("")}
                      >
                        None
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="card-body p-0">
              <Table dataSource={designationData} columns={columns} Selection={true} />
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
      {/* Add Designation */}
      <div className="modal fade" id="add_designation">
        <div className="modal-dialog modal-dialog-centered modal-md">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Add Designation</h4>
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
                      <label className="form-label">Designation Name</label>
                      <input 
                        type="text" 
                        className="form-control"
                        value={designationName} 
                        onChange={(e) => setDesignationName(e.target.value)} 
                      />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Department Name</label>
                      {loading ? (
                        <div className="form-control">
                          <small>Loading departments...</small>
                        </div>
                      ) : error ? (
                        <div className="alert alert-danger">
                          {error} <button onClick={() => socket?.emit("hr/departments/get")}>Retry</button>
                        </div>
                      ) : (
                        <CommonSelect
                          options={departmentOptions}
                          defaultValue={selectedDepartmentOption}
                          onChange={(selected) => {
                            setSelectedDepartmentId(selected?.value || "");
                          }}
                          isSearchable={true}
                          disabled={loading || !!error}
                        />
                      )}
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Status</label>
                      <CommonSelect
                        className='select'
                        options={statusChoose}
                        defaultValue={statusChoose[0]}
                        onChange={(selectedValue) => {
                          setStatus(
                            typeof selectedValue === 'string'
                              ? selectedValue
                              : selectedValue?.value || statusChoose[0].value
                          )
                        }}
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
                  disabled={loading} 
                  onClick={handleSubmit}
                >
                  Add Designation
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Add Designation */}
      {/* Edit Designation */}
      <div className="modal fade" id="edit_designation">
        <div className="modal-dialog modal-dialog-centered modal-md">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Edit Designation</h4>
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
                      <label className="form-label">Designation Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editingDesignation?.designation || ""}
                        onChange={(e) =>
                          setEditingDesignation(prev =>
                            prev ? { ...prev, designation: e.target.value } : prev)}
                      />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Department Name</label>
                      <CommonSelect
                        className="select"
                        options={departmentOptions}
                        defaultValue={departmentOptions.find(opt =>
                          opt.value === editingDesignation?.departmentId
                        )}
                        onChange={(selectedOption) =>
                          setEditingDesignation(prev =>
                            prev ? { ...prev, departmentId: selectedOption?.value || "" } : prev
                          )
                        }
                      />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Status</label>
                      <CommonSelect
                        className="select"
                        options={statusChoose.filter(opt => opt.value !== "Select")}
                        defaultValue={statusChoose.find(opt =>
                          opt.value === (editingDesignation?.status || 'active')
                        )}
                        onChange={(selectedOption) =>
                          setEditingDesignation(prev =>
                            prev ? { ...prev, status: selectedOption?.value || "" } : prev
                          )}
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
                  className="btn btn-primary"
                  disabled={!editingDesignation || updateLoading}
                  onClick={handleUpdateSubmit}
                  data-bs-dismiss="modal"
                >
                  {updateLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Edit Department */}
      {/* Delete Designation */}
      <div className="modal fade" id="delete_modal">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-body text-center">
              <span className="avatar avatar-xl bg-transparent-danger text-danger mb-3">
                <i className="ti ti-trash-x fs-36" />
              </span>
              <h4 className="mb-1">Confirm Deletion</h4>
              <p className="mb-3">
                {designationToDelete
                  ? `Are you sure you want to delete designation "${designationToDelete.designation}"? This cannot be undone.`
                  : "You want to delete all the marked items, this can't be undone once you delete."}
              </p>
              <div className="d-flex justify-content-center">
                <button
                  className="btn btn-light me-3"
                  data-bs-dismiss="modal"
                  onClick={() => setDesignationToDelete(null)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  data-bs-dismiss="modal"
                  onClick={() => {
                    handleDelete();
                    setDesignationToDelete(null);
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
      {/* /Delete Designation */}
    </>
  )
}
export default Designations