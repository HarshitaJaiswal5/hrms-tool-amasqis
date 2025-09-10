import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import CommonSelect from "../common/commonSelect";
import Select from "react-select";
import { DatePicker, TimePicker } from "antd";
import CommonTextEditor from "../common/textEditor";
import dayjs from "dayjs";
import CommonTagsInput from "../common/Taginput";
import { useSocket } from "../../SocketContext";
import { Socket } from "socket.io-client";
import { toast, ToastContainer } from "react-toastify";

interface ProjectModalData {
  clients: Array<{
    value: string;
    label: string;
    email: string;
    company: string;
  }>;
  employees: Array<{
    value: string;
    label: string;
    position: string;
    department: string;
    avatar: string;
  }>;
  tags: Array<{ value: string; label: string }>;
  priorities: Array<{ value: string; label: string; color: string }>;
  statuses: Array<{ value: string; label: string; color: string }>;
  projectId: string;
}

interface ProjectFormData {
  name: string;
  clientId: string;
  startDate: string;
  endDate: string;
  priority: string;
  projectValue: string;
  totalWorkingHours: string;
  extraTime: string;
  description: string;
  teamMembers: Array<{ value: string; label: string }>;
  teamLeader: { value: string; label: string } | null;
  projectManager: { value: string; label: string } | null;
  status: string;
  tags: string[];
  logo?: string;
}

interface ProjectModalsProps {
  onProjectCreated?: () => void;
}

const ProjectModals: React.FC<ProjectModalsProps> = ({ onProjectCreated }) => {
  const socket = useSocket() as Socket | null;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [modalData, setModalData] = useState<ProjectModalData>({
    clients: [],
    employees: [],
    tags: [],
    priorities: [],
    statuses: [],
    projectId: "PRO-0001",
  });
  const [logo, setLogo] = useState<string | null>(null);
  const [imageUpload, setImageUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<ProjectFormData>({
    name: "",
    clientId: "",
    startDate: "",
    endDate: "",
    priority: "",
    projectValue: "",
    totalWorkingHours: "",
    extraTime: "",
    description: "",
    teamMembers: [],
    teamLeader: null,
    projectManager: null,
    status: "Active",
    tags: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Cloudinary image upload function
  const uploadImage = async (file: File) => {
    setLogo(null);
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

  // Handle image upload
  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const maxSize = 4 * 1024 * 1024; // 4MB
    if (file.size > maxSize) {
      toast.error("File size must be less than 4MB.", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      event.target.value = "";
      return;
    }

    if (
      file &&
      ["image/jpeg", "image/png", "image/jpg", "image/ico"].includes(file.type)
    ) {
      setImageUpload(true);
      try {
        const uploadedUrl = await uploadImage(file);
        setLogo(uploadedUrl);
        console.log(uploadedUrl);
        setImageUpload(false);
      } catch (error) {
        setImageUpload(false);
        toast.error("Failed to upload image. Please try again.", {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        event.target.value = "";
      }
    } else {
      toast.error("Please upload image file only.", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      event.target.value = "";
    }
  };

  // Remove uploaded logo
  const removeLogo = () => {
    setLogo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handleModalDataResponse = (response: any) => {
      if (response.done) {
        setModalData(response.data);
      } else {
        setError(response.error || "Failed to load project data");
      }
      setLoading(false);
    };

    const handleAddProjectResponse = (response: any) => {
      if (response.done) {
        setFormData({
          name: "",
          clientId: "",
          startDate: "",
          endDate: "",
          priority: "",
          projectValue: "",
          totalWorkingHours: "",
          extraTime: "",
          description: "",
          teamMembers: [],
          teamLeader: null,
          projectManager: null,
          status: "Active",
          tags: [],
        });
        setCurrentStep(1);
        setLogo(null);
        removeLogo();

        // Close modal using multiple approaches for better compatibility
        const modal = document.getElementById('add_project');
        if (modal) {
          try {
            const bootstrap = (window as any).bootstrap;
            if (bootstrap && bootstrap.Modal) {
              const modalInstance = bootstrap.Modal.getInstance(modal);
              if (modalInstance) {
                modalInstance.hide();
              } else {
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
        toast.success("Project created successfully!", {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });

        if (onProjectCreated) {
          onProjectCreated();
        }
      } else {
        setError(response.error || "Failed to create project");
      }
      setIsSubmitting(false);
    };

    socket.on("admin/project/get-modal-data-response", handleModalDataResponse);
    socket.on("admin/project/add-response", handleAddProjectResponse);

    // Cleanup event listeners when component unmounts or socket changes
    return () => {
      if (socket) {
        socket.off("admin/project/get-modal-data-response", handleModalDataResponse);
        socket.off("admin/project/add-response", handleAddProjectResponse);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  // Load modal data when modal opens
  const handleModalOpen = () => {
    if (socket && !loading) {
      setLoading(true);
      setError(null);
      socket.emit("admin/project/get-modal-data");
    }
  };

  // Handle form input changes
  const handleInputChange = (field: keyof ProjectFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle next step
  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.name.trim()) {
        setError("Project name is required");
        return;
      }
      if (!formData.startDate) {
        setError("Start date is required");
        return;
      }
      if (!formData.endDate) {
        setError("End date is required");
        return;
      }

      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      if (endDate <= startDate) {
        setError("End date must be after the start date");
        return;
      }

      setError(null);
      setCurrentStep(2);
    }
  };

  // Handle previous step
  const handlePrevious = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!socket || isSubmitting) return;

    // Validate step 2
    if (!formData.teamMembers.length) {
      setError("At least one team member is required");
      return;
    }
    if (!formData.teamLeader) {
      setError("Team leader is required");
      return;
    }
    if (!formData.projectManager) {
      setError("Project manager is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const projectData = {
      ...formData,
      // Extract just the IDs since we're already working with proper objects
      teamMembers: formData.teamMembers.map(member => member.value),
      teamLeader: [formData.teamLeader.value],
      projectManager: [formData.projectManager.value],
      projectValue: parseFloat(formData.projectValue.replace('$', '')) || 0,
      logo: logo,
    };

    socket.emit("admin/project/add", projectData);
  };

  // Modal container functions for date pickers
  const getModalContainer = () => {
    const modalElement = document.getElementById("add_project");
    return modalElement ? modalElement : document.body;
  };

  // Get select options with default
  const getSelectOptions = (
    options: Array<{ value: string; label: string }>,
    defaultLabel: string = "Select"
  ) => {
    return [{ value: "", label: defaultLabel }, ...options];
  };

  // Handle modal events
  useEffect(() => {
    const modalElement = document.getElementById("add_project");
    if (modalElement) {
      const handleModalShow = () => {
        handleModalOpen();
      };

      const handleModalHide = () => {
        setCurrentStep(1);
        setError(null);
        setLogo(null);
        removeLogo();
        setFormData({
          name: "",
          clientId: "",
          startDate: "",
          endDate: "",
          priority: "",
          projectValue: "",
          totalWorkingHours: "",
          extraTime: "",
          description: "",
          teamMembers: [],
          teamLeader: null,
          projectManager: null,
          status: "Active",
          tags: [],
        });
      };

      modalElement.addEventListener("show.bs.modal", handleModalShow);
      modalElement.addEventListener("hide.bs.modal", handleModalHide);

      return () => {
        modalElement.removeEventListener("show.bs.modal", handleModalShow);
        modalElement.removeEventListener("hide.bs.modal", handleModalHide);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  return (
    <>
      {/* Add Project */}
      <div className="modal fade" id="add_project" role="dialog" ref={modalRef}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header header-border align-items-center justify-content-between">
              <h5 className="modal-title">Add Project</h5>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i className="ti ti-x" />
              </button>
            </div>

            {loading && (
              <div className="modal-body text-center">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2">Loading project data...</p>
              </div>
            )}

            {!loading && (
              <div className="add-info-fieldset">
                <div className="add-details-wizard p-3 pb-0">
                  <ul className="progress-bar-wizard d-flex align-items-center border-bottom">
                    <li
                      className={`p-2 pt-0 ${
                        currentStep === 1 ? "active" : ""
                      }`}
                    >
                      <h6 className="fw-medium">Basic Information</h6>
                    </li>
                    <li
                      className={`p-2 pt-0 ${
                        currentStep === 2 ? "active" : ""
                      }`}
                    >
                      <h6 className="fw-medium">Members</h6>
                    </li>
                  </ul>
                </div>

                {currentStep === 1 && (
                  <fieldset id="first-field-file">
                    <div className="modal-body">
                      {error && (
                        <div className="alert alert-danger mb-3" role="alert">
                          {error}
                        </div>
                      )}
                      <div className="row">
                        <div className="col-md-12">
                          <div className="d-flex align-items-center flex-wrap row-gap-3 bg-light w-100 rounded p-3 mb-4">
                            <div className="d-flex align-items-center justify-content-center avatar avatar-xxl rounded-circle border border-dashed me-2 flex-shrink-0 text-dark frames">
                              {logo ? (
                                <img
                                  src={logo}
                                  alt="Uploaded Logo"
                                  className="rounded-circle"
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                />
                              ) : imageUpload ? (
                                <div
                                  className="spinner-border text-primary"
                                  role="status"
                                >
                                  <span className="visually-hidden">
                                    Uploading...
                                  </span>
                                </div>
                              ) : (
                                <i className="ti ti-photo text-gray-2 fs-16" />
                              )}
                            </div>
                            <div className="profile-upload">
                              <div className="mb-2">
                                <h6 className="mb-1">Upload Project Logo</h6>
                                <p className="fs-12">
                                  Image should be below 4 mb
                                </p>
                              </div>
                              <div className="profile-uploader d-flex align-items-center">
                                <div className="drag-upload-btn btn btn-sm btn-primary me-2">
                                  {logo ? "Change" : "Upload"}
                                  <input
                                    type="file"
                                    className="form-control image-sign"
                                    accept=".png,.jpeg,.jpg,.ico"
                                    ref={fileInputRef}
                                    onChange={handleImageUpload}
                                  />
                                </div>
                                {logo ? (
                                  <Link
                                    to="#"
                                    onClick={removeLogo}
                                    className="btn btn-light btn-sm"
                                  >
                                    Remove
                                  </Link>
                                ) : (
                                  <Link to="#" className="btn btn-light btn-sm">
                                    Cancel
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-12">
                          <div className="mb-3">
                            <label className="form-label">
                              Project Name{" "}
                              <span className="text-danger">*</span>
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              value={formData.name}
                              onChange={(e) =>
                                handleInputChange("name", e.target.value)
                              }
                              placeholder="Enter project name"
                            />
                          </div>
                        </div>
                        <div className="col-md-12">
                          <div className="mb-3">
                            <label className="form-label">Client</label>
                            <CommonSelect
                              className="select"
                              options={getSelectOptions(modalData.clients)}
                              defaultValue={getSelectOptions(
                                modalData.clients
                              ).find((c) => c.value === formData.clientId)}
                              onChange={(option: any) =>
                                handleInputChange(
                                  "clientId",
                                  option?.value || ""
                                )
                              }
                            />
                          </div>
                        </div>
                        <div className="col-md-12">
                          <div className="row">
                            <div className="col-md-6">
                              <div className="mb-3">
                                <label className="form-label">
                                  Start Date{" "}
                                  <span className="text-danger">*</span>
                                </label>
                                <div className="input-icon-end position-relative">
                                  <DatePicker
                                    className="form-control datetimepicker"
                                    format="DD-MM-YYYY"
                                    getPopupContainer={getModalContainer}
                                    placeholder="DD-MM-YYYY"
                                    onChange={(date, dateString) =>
                                      handleInputChange("startDate", dateString)
                                    }
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
                                  End Date{" "}
                                  <span className="text-danger">*</span>
                                </label>
                                <div className="input-icon-end position-relative">
                                  <DatePicker
                                    className="form-control datetimepicker"
                                    format="DD-MM-YYYY"
                                    getPopupContainer={getModalContainer}
                                    placeholder="DD-MM-YYYY"
                                    onChange={(date, dateString) =>
                                      handleInputChange("endDate", dateString)
                                    }
                                    disabledDate={(current) => {
                                      if (!formData.startDate) return false;
                                      const startDate = dayjs(formData.startDate, 'DD-MM-YYYY');
                                      return current && (current.isSame(startDate, 'day') || current.isBefore(startDate, 'day'));
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
                                <label className="form-label">Priority</label>
                                <CommonSelect
                                  className="select"
                                  options={getSelectOptions(
                                    modalData.priorities
                                  )}
                                  defaultValue={getSelectOptions(
                                    modalData.priorities
                                  ).find((p) => p.value === formData.priority)}
                                  onChange={(option: any) =>
                                    handleInputChange(
                                      "priority",
                                      option?.value || ""
                                    )
                                  }
                                />
                              </div>
                            </div>
                            <div className="col-md-6">
                              <div className="mb-3">
                                <label className="form-label">
                                  Project Value
                                </label>
                                <div className="input-group">
                                  <span className="input-group-text">$</span>
                                  <input
                                    type="number"
                                    className="form-control"
                                    value={formData.projectValue}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                        handleInputChange("projectValue", value);
                                      }
                                    }}
                                    placeholder="0"
                                    min="0"
                                    step="0.01"
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="col-md-6">
                              <div className="mb-3">
                                <label className="form-label">
                                  Total Working Hours
                                </label>
                                <div className="input-icon-end position-relative">
                                  <TimePicker
                                    getPopupContainer={getModalContainer}
                                    use12Hours
                                    placeholder="Choose"
                                    format="h:mm A"
                                    className="form-control timepicker"
                                    onChange={(time, timeString) =>
                                      handleInputChange(
                                        "totalWorkingHours",
                                        timeString || ""
                                      )
                                    }
                                  />
                                  <span className="input-icon-addon">
                                    <i className="ti ti-clock-hour-3 text-gray-7" />
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="col-md-6">
                              <div className="mb-3">
                                <label className="form-label">Extra Time (Hours)</label>
                                <div className="input-group">
                                  <input
                                    type="number"
                                    className="form-control"
                                    value={formData.extraTime}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      if (value === '' || /^\d+$/.test(value)) {
                                        handleInputChange("extraTime", value);
                                      }
                                    }}
                                    placeholder="0"
                                    min="0"
                                    step="1"
                                  />
                                  <span className="input-group-text">hours</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-12">
                          <div className="mb-0">
                            <label className="form-label">Description</label>
                            <CommonTextEditor
                              defaultValue={formData.description}
                              onChange={(content) =>
                                handleInputChange("description", content)
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="modal-footer">
                      <div className="d-flex align-items-center justify-content-end">
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
                          onClick={handleNext}
                        >
                          Add Team Member
                        </button>
                      </div>
                    </div>
                  </fieldset>
                )}

                {currentStep === 2 && (
                  <fieldset className="d-block">
                    <div className="modal-body">
                      {error && (
                        <div className="alert alert-danger mb-3" role="alert">
                          {error}
                        </div>
                      )}
                      <div className="row">
                        <div className="col-md-12">
                          <div className="mb-3">
                            <label className="form-label me-2">Team Members <span className="text-danger">*</span></label>
                            <Select
                              isMulti
                              options={modalData.employees}
                              value={formData.teamMembers}
                              onChange={(selectedOptions: any) => handleInputChange("teamMembers", selectedOptions || [])}
                              placeholder="Select team members"
                              className="basic-multi-select"
                              classNamePrefix="select"
                              getOptionLabel={(option: any) => `${option.label} - ${option.position}`}
                              getOptionValue={(option: any) => option.value}
                            />
                            <small className="form-text text-muted">
                              Select multiple employees for the project team
                            </small>
                          </div>
                        </div>
                        <div className="col-md-12">
                          <div className="mb-3">
                            <label className="form-label me-2">Team Leader <span className="text-danger">*</span></label>
                            <CommonSelect
                              className="select"
                              options={modalData.employees.map(emp => ({
                                value: emp.value,
                                label: `${emp.label} - ${emp.position}`
                              }))}
                              defaultValue={formData.teamLeader ? {
                                value: formData.teamLeader.value,
                                label: formData.teamLeader.label
                              } : undefined}
                              onChange={(selectedOption) => handleInputChange("teamLeader", selectedOption)}
                            />
                          </div>
                        </div>
                        <div className="col-md-12">
                          <div className="mb-3">
                            <label className="form-label me-2">Project Manager <span className="text-danger">*</span></label>
                            <CommonSelect
                              className="select"
                              options={modalData.employees.map(emp => ({
                                value: emp.value,
                                label: `${emp.label} - ${emp.position}`
                              }))}
                              defaultValue={formData.projectManager ? {
                                value: formData.projectManager.value,
                                label: formData.projectManager.label
                              } : undefined}
                              onChange={(selectedOption) => handleInputChange("projectManager", selectedOption)}
                            />
                          </div>
                        </div>
                        <div className="col-md-12">
                          <div className="mb-3">
                            <label className="form-label">Status</label>
                            <CommonSelect
                              className="select"
                              options={getSelectOptions(modalData.statuses)}
                              defaultValue={getSelectOptions(
                                modalData.statuses
                              ).find((s) => s.value === formData.status)}
                              onChange={(option: any) =>
                                handleInputChange(
                                  "status",
                                  option?.value || "Active"
                                )
                              }
                            />
                          </div>
                        </div>
                        <div className="col-md-12">
                          <div>
                            <label className="form-label">Tags</label>
                            <CommonTagsInput
                              value={formData.tags}
                              onChange={(tags) =>
                                handleInputChange("tags", tags)
                              }
                              placeholder="Add project tags"
                              className="custom-input-class"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="modal-footer">
                      <div className="d-flex align-items-center justify-content-between w-100">
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={handlePrevious}
                        >
                          Previous
                        </button>
                        <div className="d-flex align-items-center">
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
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? (
                              <>
                                <span
                                  className="spinner-border spinner-border-sm me-2"
                                  role="status"
                                  aria-hidden="true"
                                ></span>
                                Creating...
                              </>
                            ) : (
                              "Create Project"
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </fieldset>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <ToastContainer />
    </>
  );
};

export default ProjectModals;
