import React, { useState, useEffect } from "react";
import CommonSelect from "../common/commonSelect";
import { DatePicker } from "antd";
import moment from 'moment';
import { useSocket } from "../../SocketContext";
import { Socket } from "socket.io-client";

interface Employee {
  value: string;
  label: string;
  position: string;
  department: string;
  email: string;
  avatar: string;
  employeeId: string;
  remainingLeaves: number;
  totalLeaves: number;
}

interface LeaveType {
  value: string;
  label: string;
  maxDays: number;
  description: string;
}

interface LeaveBalance {
  totalLeaves: number;
  usedLeaves: number;
  remainingLeaves: number;
  employeeName: string;
}

interface RequestModalsProps {
  onLeaveRequestCreated?: () => void;
}

const RequestModals: React.FC<RequestModalsProps> = ({ onLeaveRequestCreated }) => {
  const socket = useSocket() as Socket | null;
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedLeaveType, setSelectedLeaveType] = useState<LeaveType | null>(null);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    employeeId: '',
    leaveType: '',
    fromDate: '',
    toDate: '',
    reason: '',
    days: 0
  });

  const [calculatedDays, setCalculatedDays] = useState(0);

  useEffect(() => {
    if (!socket) return;

    const handleModalDataResponse = (response: any) => {
      setLoading(false);
      if (response.done) {
        setEmployees(response.data.employees);
        setLeaveTypes(response.data.leaveTypes);
      } else {
        console.error("Error loading modal data:", response.error);
      }
    };

    const handleEmployeeBalanceResponse = (response: any) => {
      setLoadingBalance(false);
      if (response.done) {
        setLeaveBalance(response.data);
      } else {
        console.error("Error loading employee balance:", response.error);
        setLeaveBalance(null);
      }
    };

    const handleCreateRequestResponse = (response: any) => {
      setSubmitting(false);
      if (response.done) {
        // Success - close modal and reset form
        const modal = document.getElementById('add_leaves');
        if (modal) {
          try {
            const bootstrap = (window as any).bootstrap;
            if (bootstrap && bootstrap.Modal) {
              const modalInstance = bootstrap.Modal.getInstance(modal);
              if (modalInstance) {
                modalInstance.hide();
              } else {
                // If no instance exists, create one and hide it
                const newModalInstance = new bootstrap.Modal(modal);
                newModalInstance.hide();
              }
            } else {
              throw new Error('Bootstrap not available');
            }
          } catch (error) {
            console.warn('Bootstrap Modal API not available, using fallback method');
            // Fallback: manually trigger the modal close
            const closeButton = modal.querySelector('[data-bs-dismiss="modal"]') as HTMLElement;
            if (closeButton) {
              closeButton.click();
            } else {
              // Manual modal close
              modal.style.display = 'none';
              modal.classList.remove('show');
              modal.setAttribute('aria-hidden', 'true');
              modal.removeAttribute('aria-modal');

              // Remove backdrop
              const backdrop = document.querySelector('.modal-backdrop');
              if (backdrop) {
                backdrop.remove();
              }

              // Restore body
              document.body.classList.remove('modal-open');
              document.body.style.overflow = '';
              document.body.style.paddingRight = '';
            }
          }
        }
        resetForm();
        if (onLeaveRequestCreated) {
          onLeaveRequestCreated();
        }
        setError(null);
      } else {
        console.error("Error creating leave request:", response.error);
        setError("Error creating leave request: " + response.error);
      }
    };

    // Add event listeners
    socket.on("admin/leave/get-modal-data-response", handleModalDataResponse);
    socket.on("admin/leave/get-employee-balance-response", handleEmployeeBalanceResponse);
    socket.on("admin/leave/create-request-response", handleCreateRequestResponse);

    // Cleanup event listeners
    return () => {
      if (socket) {
        socket.off("admin/leave/get-modal-data-response", handleModalDataResponse);
        socket.off("admin/leave/get-employee-balance-response", handleEmployeeBalanceResponse);
        socket.off("admin/leave/create-request-response", handleCreateRequestResponse);
      }
    };
  }, [socket, onLeaveRequestCreated]);

  const handleEmployeeChange = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormData(prev => ({ ...prev, employeeId: employee.value }));
    setLeaveBalance(null);

    // Fetch employee leave balance
    if (employee.value && socket) {
      setLoadingBalance(true);
      socket.emit("admin/leave/get-employee-balance", { employeeId: employee.value });
    }
  };

  const handleLeaveTypeChange = (leaveType: LeaveType) => {
    setSelectedLeaveType(leaveType);
    setFormData(prev => ({ ...prev, leaveType: leaveType.value }));
  };

  const handleDateChange = (field: 'fromDate' | 'toDate', date: any) => {
    const dateString = date ? date.format('YYYY-MM-DD') : '';
    setFormData(prev => ({ ...prev, [field]: dateString }));

    // Calculate days when both dates are selected
    if (field === 'fromDate' && formData.toDate) {
      calculateDays(dateString, formData.toDate);
    } else if (field === 'toDate' && formData.fromDate) {
      calculateDays(formData.fromDate, dateString);
    }
  };

  const calculateDays = (fromDate: string, toDate: string) => {
    if (fromDate && toDate) {
      const from = moment(fromDate);
      const to = moment(toDate);
      const days = to.diff(from, 'days') + 1;
      setCalculatedDays(days > 0 ? days : 0);
      return days;
    } else {
      setCalculatedDays(0);
      return 0;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!socket) {
      setError("No connection available. Please refresh the page.");
      return;
    }

    if (!formData.employeeId || !formData.leaveType || !formData.fromDate || !formData.toDate || !formData.reason) {
      setError("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    setError(null);

    const requestData = {
      ...formData,
      days: calculateDays(formData.fromDate, formData.toDate)
    };

    socket.emit("admin/leave/create-request", requestData);
  };

  const resetForm = () => {
    setFormData({
      employeeId: '',
      leaveType: '',
      fromDate: '',
      toDate: '',
      reason: '',
      days: 0
    });
    setSelectedEmployee(null);
    setSelectedLeaveType(null);
    setLeaveBalance(null);
    setCalculatedDays(0);
    setError(null);
  };

  const loadModalData = () => {
    if (!socket) return;
    setLoading(true);
    socket.emit("admin/leave/get-modal-data");
  };

  const getModalContainer = () => {
    const modalElement = document.getElementById('add_leaves');
    return modalElement ? modalElement : document.body;
  };

  // Handle modal events
  useEffect(() => {
    const modalElement = document.getElementById('add_leaves');
    if (modalElement) {
      const handleModalShow = () => {
        loadModalData();
      };

      const handleModalHide = () => {
        resetForm();
      };

      modalElement.addEventListener('show.bs.modal', handleModalShow);
      modalElement.addEventListener('hide.bs.modal', handleModalHide);

      return () => {
        modalElement.removeEventListener('show.bs.modal', handleModalShow);
        modalElement.removeEventListener('hide.bs.modal', handleModalHide);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  return (
    <>
      {/* Add Leaves */}
      <div className="modal fade" id="add_leaves">
        <div className="modal-dialog modal-dialog-centered modal-md">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Add Leave Request</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
                onClick={resetForm}
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body pb-0">
                {loading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : (
                  <>
                    {error && (
                      <div className="alert alert-danger" role="alert">
                        {error}
                      </div>
                    )}
                    <div className="row">
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">Employee Name <span className="text-danger">*</span></label>
                        <CommonSelect
                          className="select"
                          options={[
                            { value: '', label: 'Select Employee' },
                            ...employees
                          ]}
                          defaultValue={selectedEmployee ? { value: selectedEmployee.value, label: selectedEmployee.label } : { value: '', label: 'Select Employee' }}
                          onChange={(option: any) => {
                            const employee = employees.find(emp => emp.value === option.value);
                            if (employee) {
                              handleEmployeeChange(employee);
                            }
                          }}
                        />
                      </div>
                    </div>

                    {selectedEmployee && (
                      <div className="col-md-12">
                        <div className="mb-3">
                          <div className="alert alert-info py-2">
                            <small>
                              <strong>Employee:</strong> {selectedEmployee.label}<br />
                              <strong>Position:</strong> {selectedEmployee.position}<br />
                              <strong>Department:</strong> {selectedEmployee.department}
                            </small>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">Leave Type <span className="text-danger">*</span></label>
                        <CommonSelect
                          className="select"
                          options={[
                            { value: '', label: 'Select Leave Type' },
                            ...leaveTypes
                          ]}
                          defaultValue={selectedLeaveType ? { value: selectedLeaveType.value, label: selectedLeaveType.label } : { value: '', label: 'Select Leave Type' }}
                          onChange={(option: any) => {
                            const leaveType = leaveTypes.find(type => type.value === option.value);
                            if (leaveType) {
                              handleLeaveTypeChange(leaveType);
                            }
                          }}
                        />
                      </div>
                    </div>

                    {selectedLeaveType && (
                      <div className="col-md-12">
                        <div className="mb-3">
                          <div className="alert alert-secondary py-2">
                            <small>
                              <strong>Description:</strong> {selectedLeaveType.description}<br />
                              <strong>Max Days:</strong> {selectedLeaveType.maxDays}
                            </small>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">From Date <span className="text-danger">*</span></label>
                        <div className="input-icon-end position-relative">
                          <DatePicker
                            className="form-control datetimepicker"
                            format="DD-MM-YYYY"
                            getPopupContainer={getModalContainer}
                            placeholder="DD-MM-YYYY"
                            value={formData.fromDate ? moment(formData.fromDate) : null}
                            onChange={(date) => handleDateChange('fromDate', date)}
                            disabledDate={(current) => current && current < moment().startOf('day')}
                          />
                          <span className="input-icon-addon">
                            <i className="ti ti-calendar text-gray-7" />
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">To Date <span className="text-danger">*</span></label>
                        <div className="input-icon-end position-relative">
                          <DatePicker
                            className="form-control datetimepicker"
                            format="DD-MM-YYYY"
                            getPopupContainer={getModalContainer}
                            placeholder="DD-MM-YYYY"
                            value={formData.toDate ? moment(formData.toDate) : null}
                            onChange={(date) => handleDateChange('toDate', date)}
                            disabledDate={(current) => {
                              if (!formData.fromDate) return current && current < moment().startOf('day');
                              return current && current < moment(formData.fromDate);
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
                        <label className="form-label">No of Days</label>
                        <input
                          type="text"
                          className="form-control"
                          value={calculatedDays}
                          disabled
                        />
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Remaining Days</label>
                        <div className="input-group">
                          <input
                            type="text"
                            className="form-control"
                            value={loadingBalance ? 'Loading...' : leaveBalance ? leaveBalance.remainingLeaves : 'N/A'}
                            disabled
                          />
                          {loadingBalance && (
                            <div className="input-group-text">
                              <div className="spinner-border spinner-border-sm" role="status">
                                <span className="visually-hidden">Loading...</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {leaveBalance && (
                      <div className="col-md-12">
                        <div className="mb-3">
                          <div className="alert alert-success py-2">
                            <small>
                              <strong>Total Annual Leave:</strong> {leaveBalance.totalLeaves} days<br />
                              <strong>Used:</strong> {leaveBalance.usedLeaves} days<br />
                              <strong>Remaining:</strong> {leaveBalance.remainingLeaves} days
                            </small>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">Reason <span className="text-danger">*</span></label>
                        <textarea
                          className="form-control"
                          rows={3}
                          value={formData.reason}
                          onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                          placeholder="Enter reason for leave request..."
                        />
                      </div>
                    </div>
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-light me-2"
                  data-bs-dismiss="modal"
                  onClick={resetForm}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || loading}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Creating...
                    </>
                  ) : (
                    'Create Leave Request'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Add Leaves */}
    </>
  );
};

export default RequestModals;

