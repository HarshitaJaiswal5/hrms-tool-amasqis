import React, { useState, useEffect } from 'react'
import { all_routes } from '../../router/all_routes'
import { Link } from 'react-router-dom'
import Table from "../../../core/common/dataTable/index";
import CommonSelect from '../../../core/common/commonSelect';
import PredefinedDateRanges from '../../../core/common/datePicker';
import CollapseHeader from '../../../core/common/collapse-header/collapse-header';
import { useSocket } from "../../../SocketContext";
import { Socket } from "socket.io-client";
import { DateTime } from 'luxon';

interface Policy {
  _id: string,
  policyName: string;
  department: string;
  policyDescription: string;
  effectiveDate: string;
}

interface Department {
  _id: string;
  department: string;
}

const staticOptions = [
  { value: "Select", label: "Select" },
];

const Policy = () => {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [sortedPolicies, setSortedPolicies] = useState<Policy[]>([]);
  const [sortOrder, setSortOrder] = useState("");
  const [policyName, setPolicyName] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [description, setDescription] = useState("");
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [filters, setFilters] = useState({ department: "", startDate: "", endDate: "" });
  const [policyToDelete, setPolicyToDelete] = useState<Policy | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responseData, setResponseData] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(staticOptions[0].value);

  const socket = useSocket() as Socket | null;

  useEffect(() => {
    if (!socket) return;

    let isMounted = true;

    setLoading(true);

    const timeoutId = setTimeout(() => {
      if (loading && isMounted) {
        console.warn("Policies loading timeout - showing fallback");
        setError("Policies loading timed out. Please refresh the page.");
        setLoading(false);
      }
    }, 30000);
    socket.emit("hr/policy/get");
    socket.emit("hr/departments/get");

    const handleAddPolicyResponse = (response: any) => {
      if (!isMounted) return;

      if (response.done) {
        setResponseData(response.data);
        setError(null);
        setLoading(false);
        if (socket) {
          socket.emit("hr/policy/get");
        }
      } else {
        setError(response.error || "Failed to add policy");
        setLoading(false);
      }
    };

    const handleGetPolicyResponse = (response: any) => {
      clearTimeout(timeoutId);
      if (!isMounted) return;

      if (response.done) {
        setPolicies(response.data);
        setSortedPolicies(response.data);
        setError(null);
        setLoading(false);
      } else {
        setError(response.error || "Failed to fetch policies");
        setLoading(false);
      }
    };

    const handleUpdatePolicyResponse = (response: any) => {
      if (!isMounted) return;

      if (response.done) {
        setResponseData(response.data);
        setError(null);
        setLoading(false);
        if (socket) {
          socket.emit("hr/policy/get");
        }
      } else {
        setError(response.error || "Failed to add policy");
        setLoading(false);
      }
    }

    const handleDeletePolicyResponse = (response: any) => {
      if (!isMounted) return;

      if (response.done) {
        setResponseData(response.data);
        setError(null);
        setLoading(false);
        if (socket) {
          socket.emit("hr/policy/get");
        }
      } else {
        setError(response.error || "Failed to add policy");
        setLoading(false);
      }
    }

    const handleDepartmentsResponse = (response: any) => {
      if (!isMounted) return;

      if (response.done) {
        setDepartments(response.data);
        setError(null);
        setLoading(false);
      } else {
        setError(response.error || "Failed to add policy");
        setLoading(false);
      }
    }

    socket.on("hr/policy/add-response", handleAddPolicyResponse);
    socket.on("hr/policy/get-response", handleGetPolicyResponse);
    socket.on("hr/policy/update-response", handleUpdatePolicyResponse);
    socket.on("hr/policy/delete-response", handleDeletePolicyResponse);
    socket.on("hr/departments/get-response", handleDepartmentsResponse);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      socket.off("hr/policy/add-response", handleAddPolicyResponse);
      socket.off("hr/policy/get-response", handleGetPolicyResponse);
      socket.off("hr/policy/update-response", handleUpdatePolicyResponse);
      socket.off("hr/policy/delete-response", handleDeletePolicyResponse);
      socket.off("hr/departments/get-response", handleDepartmentsResponse);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  // constants

  const dynamicOptions = Array.isArray(departments)
    ? departments.map(dept => ({
      value: dept._id,
      label: dept.department,
    }))
    : [];

  const options = [...staticOptions, ...dynamicOptions];
  
  const columns = [
    {
      title: "Name",
      dataIndex: "policyName",
      render: (text: String, record: any) => (
        <h6 className="fw-medium fs-14 text-dark">{text}</h6>
      ),
      sorter: (a: any, b: any) => a.Name.length - b.Name.length,
    },
    {
      title: "Department",
      dataIndex: "department",
      sorter: (a: any, b: any) => a.Department.length - b.Department.length,
    },
    {
      title: "Description",
      dataIndex: "policyDescription",
      sorter: (a: any, b: any) => a.Description.length - b.Description.length,
      render: (text: String, record: any) => (
        <h6 className="fw-normal fs-14 text-muted">{text}</h6>
      ),
    },
    {
      title: "In-effect Date",
      dataIndex: "effectiveDate",
      sorter: (a: any, b: any) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime(),
      render: (date: string) => DateTime.fromISO(date).toFormat("dd-MM-yyyy"),
    },
    {
      title: "",
      dataIndex: "actions",
      render: (_test: any, policy: Policy) => (
        <div className="action-icon d-inline-flex">
          <Link
            to="#"
            className="me-2"
            data-bs-toggle="modal"
            data-inert={true}
            data-bs-target="#edit_policy"
            onClick={() => { setEditingPolicy(policy); }}
          >
            <i className="ti ti-edit" />
          </Link>
          <Link
            to="#"
            className="me-2"
            data-bs-toggle="modal"
            data-inert={true}
            data-bs-target="#delete_modal"
            onClick={() => { setPolicyToDelete(policy); }}
          >
            <i className="ti ti-trash" />
          </Link>
        </div>
      ),
    }
  ]

  const policiesWithKey = policies.map((policy, index) => ({
    ...policy,
    key: policy._id || index.toString(),
  }));


  // helper functions

  const handleSubmit = () => {
    try {
      setError(null);

      if (!policyName.trim()) {
        setError("Policy Name is required");
        return;
      }

      if (!effectiveDate) {
        setError("Effective Date is required");
        return;
      }

      if (!selectedDepartment) {
        setError("Department is required");
        return;
      }

      if (!description) {
        setError("Description is required");
        return;
      }

      setLoading(true);

      const payload = {
        policyName,
        department: selectedDepartment,
        policyDescription: description,
        effectiveDate,
      };
      if (socket) {
        socket.emit("hr/policy/add", payload);
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

  console.log("selected department", selectedDepartment);
  
  const applyFilters = (updatedFields: {
    department?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    try {
      setFilters(prevFilters => {
        const newFilters = { ...prevFilters, ...updatedFields };
        if (socket) {
          socket.emit("hr/policy/get", { ...newFilters });
        }
        return newFilters;
      });
    } catch (error) {
      console.error("Error applying filters:", error);
    }
  };

  const onSelectDepartment = (dept: string) => {
    applyFilters({ department: dept });
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

  const handleSort = (order: string) => {
    setSortOrder(order);
    if (!order) {
      setSortedPolicies(policies);
      return;
    }
    const sortedData = [...policies].sort((a, b) => {
      const nameA = a.policyName.toLowerCase();
      const nameB = b.policyName.toLowerCase();

      if (order === "ascending") {
        return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
      }
      if (order === "descending") {
        return nameA > nameB ? -1 : nameA < nameB ? 1 : 0;
      }
      return 0;
    });
    setSortedPolicies(sortedData); // may not need this later
    setPolicies(sortedData);
  };

  const handleUpdateSubmit = (editingPolicy: Policy) => {
    try {
      setError(null);
      const { _id, policyName, effectiveDate, department, policyDescription } = editingPolicy;

      if (!_id) {
        setError("Id not found");
        return;
      }

      if (!policyName) {
        setError("Policy Name is required");
        return;
      }

      if (!effectiveDate) {
        setError("Effective Date is required");
        return;
      }

      if (!department) {
        setError("Department is required");
        return;
      }

      if (!policyDescription) {
        setError("Description is required");
        return;
      }

      setLoading(true);

      const payload = {
        _id,
        policyName,
        policyDescription,
        department,
        effectiveDate,
      };

      if (socket) {
        socket.emit("hr/policy/update", payload);
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

  const deletePolicy = (policyId: string) => {
    try {
      setLoading(true);
      setError(null);

      if (!socket) {
        setError("Socket connection is not available");
        setLoading(false);
        return;
      }

      if (!policyId) {
        setError("Policy ID is required");
        setLoading(false);
        return;
      }

      socket.emit("hr/policy/delete", { _id: policyId });
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
              <h2 className="mb-1">Policies</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to="index.html">
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">HR</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Policies
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
                  data-bs-target="#add_policy"
                  className="btn btn-primary d-flex align-items-center"
                >
                  <i className="ti ti-circle-plus me-2" />
                  Add Policy
                </Link>
              </div>
              <div className="head-icons ms-2">
                <CollapseHeader />
              </div>
            </div>
          </div>
          {/* /Breadcrumb */}
          {/* Policy list */}
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
              <h5>Policies List</h5>
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
                  >
                    Department
                  </Link>
                  <ul className="dropdown-menu dropdown-menu-end p-3">
                    {options.map((dept) => (
                      <li key={dept.value}>
                        <button
                          type="button"
                          className="dropdown-item rounded-1"
                          onClick={() => onSelectDepartment(dept.value)}
                        >
                          {dept.label}
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
              <Table dataSource={policiesWithKey} columns={columns} Selection={true} />
            </div>
          </div>
          {/* /Policylist list */}
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
      {/* Add Policy */}
      <div className="modal fade" id="add_policy">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Add Policy</h4>
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
                      <label className="form-label">Policy Name</label>
                      <input type="text" className="form-control"
                        value={policyName} onChange={(e) => setPolicyName(e.target.value)} />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">In-effect Date</label>
                      <input type="date" className="form-control" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Department</label>
                      <CommonSelect
                        className="select"
                        options={options}
                        defaultValue={selectedDepartment}
                        onChange={(option) =>
                          setSelectedDepartment(
                            typeof option === 'string'
                              ? option
                              : option?.value || options[0].value
                          )
                        }
                      />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Policy Description</label>
                      <div className="policy-description-container">
                        <textarea
                          className="form-control"
                          rows={4}
                          placeholder="Enter policy details and description here..."
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          maxLength={5000}
                        />
                        <div className="d-flex justify-content-between mt-2">
                          <small className="text-muted">
                            {description.length}/5000 characters
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-white border me-2"
                  data-bs-dismiss="modal"
                >
                  Cancel
                </button>
                <button type="button" data-bs-dismiss="modal" className="btn btn-primary"
                  disabled={loading} onClick={handleSubmit}>
                  Add Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Add Policy */}
      {/* Edit  Policy */}
      <div className="modal fade" id="edit_policy">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Edit Policy</h4>
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
                      <label className="form-label">Policy Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editingPolicy?.policyName || ""}
                        onChange={(e) =>
                          setEditingPolicy(prev =>
                            prev ? { ...prev, policyName: e.target.value } : prev)}
                      />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">In-effect Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={editingPolicy?.effectiveDate?.slice(0, 10) || ""}
                        onChange={(e) =>
                          setEditingPolicy(prev =>
                            prev ? { ...prev, effectiveDate: e.target.value } : prev)}
                      />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Department</label>
                      <CommonSelect
                        className="select"
                        options={options}
                        defaultValue={options.find(d => d.value === editingPolicy?.department) || options[0]}
                        onChange={(selectedOption) =>
                          setEditingPolicy(prev =>
                            prev ? { ...prev, department: selectedOption?.value || "" } : prev
                          )
                        }
                      />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Policy Description</label>
                      <div className="policy-description-container">
                        <textarea
                          className="form-control"
                          rows={4}
                          placeholder="Enter policy details and description here..."
                          value={editingPolicy?.policyDescription || ""}
                          onChange={(e) =>
                            setEditingPolicy(prev =>
                              prev ? { ...prev, policyDescription: e.target.value } : prev
                            )
                          }
                          maxLength={5000}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-white border me-2"
                  data-bs-dismiss="modal"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-bs-dismiss="modal"
                  className="btn btn-primary"
                  onClick={() => {
                    if (editingPolicy) {
                      handleUpdateSubmit(editingPolicy);
                    }
                  }}
                  disabled={!editingPolicy}
                >
                  Update Policy
                </button>
              </div>
            </form>
          </div>
        </div >
      </div >
      {/* /Edit  Policy */}
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
                {policyToDelete
                  ? `Are you sure you want to delete policy "${policyToDelete.policyName}"? This cannot be undone.`
                  : "You want to delete all the marked items, this can't be undone once you delete."}
              </p>
              <div className="d-flex justify-content-center">
                <button
                  className="btn btn-light me-3"
                  data-bs-dismiss="modal"
                  onClick={() => setPolicyToDelete(null)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  data-bs-dismiss="modal"
                  onClick={() => {
                    if (policyToDelete) {
                      deletePolicy(policyToDelete._id);
                    }
                    setPolicyToDelete(null);
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

export default Policy
