import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../../SocketContext';
import { Socket } from 'socket.io-client';
import { message } from 'antd';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface ClientFormData {
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  logo: string;
  status: 'Active' | 'Inactive';
  contractValue: number;
  projects: number;
}

interface ClientFormErrors {
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
  logo?: string;
  status?: string;
  contractValue?: string;
  projects?: string;
}

const AddClient = () => {
  const socket = useSocket() as Socket | null;
  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    company: '',
    email: '',
    phone: '',
    address: '',
    logo: '',
    status: 'Active',
    contractValue: 0,
    projects: 0
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<ClientFormErrors>({});
  const [logo, setLogo] = useState<string | null>(null);
  const [imageUpload, setImageUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        setFormData(prev => ({ ...prev, logo: uploadedUrl }));
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
    setFormData(prev => ({ ...prev, logo: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'contractValue' || name === 'projects' ? Number(value) || 0 : value
    }));
    
    // Clear error when user starts typing
    if (errors[name as keyof ClientFormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ClientFormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.company.trim()) {
      newErrors.company = 'Company is required';
    }

    if (formData.contractValue < 0) {
      newErrors.contractValue = 'Contract value cannot be negative';
    }

    if (formData.projects < 0) {
      newErrors.projects = 'Projects count cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!socket) {
      message.error("Socket connection not available");
      return;
    }

    setLoading(true);
    try {
      console.log('Creating client:', formData);
      socket.emit('client:create', formData);

      // Listen for response
      socket.once('client:create-response', (response: any) => {
        if (response.done) {
          console.log('Client created successfully:', response.data);
          message.success('Client created successfully!');
          setFormData({
            name: '',
            company: '',
            email: '',
            phone: '',
            address: '',
            logo: '',
            status: 'Active',
            contractValue: 0,
            projects: 0
          });
          setErrors({});
          
          // Show success message briefly, then close modal
          setTimeout(() => {
            closeModal();
            resetForm();
            
            // Reset states after modal closes
            setTimeout(() => {
              setLoading(false);
            }, 300);
          }, 1500);
        } else {
          console.error('Failed to create client:', response.error);
          message.error(`Failed to create client: ${response.error}`);
        }
        setLoading(false);
      });
    } catch (error) {
      console.error('Error creating client:', error);
      message.error('An error occurred while creating the client');
      setLoading(false);
    }
  };

  const closeModal = () => {
    const modal = document.getElementById('add_client');
    if (!modal) return;

    try {
      // Method 1: Try Bootstrap Modal API
      if ((window as any).bootstrap && (window as any).bootstrap.Modal) {
        const bootstrapModal = (window as any).bootstrap.Modal.getInstance(modal);
        if (bootstrapModal) {
          bootstrapModal.hide();
          return;
        }
      }

      // Method 2: Try jQuery Bootstrap Modal
      if ((window as any).$ && (window as any).$.fn && (window as any).$.fn.modal) {
        (window as any).$('#add_client').modal('hide');
        return;
      }

      // Method 3: Manual modal closing (fallback)
      modal.style.display = 'none';
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden', 'true');
      modal.removeAttribute('aria-modal');
      
      // Remove backdrop
      const backdrops = document.querySelectorAll('.modal-backdrop');
      backdrops.forEach(backdrop => backdrop.remove());
      
      // Remove modal-open class from body
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      
    } catch (error) {
      console.error('Error closing add client modal:', error);
      
      // Final fallback: just hide the modal
      modal.style.display = 'none';
      modal.classList.remove('show');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      company: '',
      email: '',
      phone: '',
      address: '',
      logo: '',
      status: 'Active',
      contractValue: 0,
      projects: 0
    });
    setErrors({});
    setLogo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <div className="modal fade" id="add_client">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
          <div className="modal-header">
            <h4 className="modal-title">Add New Client</h4>
            <button
              type="button"
              className="btn-close custom-btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            >
              <i className="ti ti-x" />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="contact-grids-tab">
              <ul className="nav nav-underline" id="myTab" role="tablist">
                <li className="nav-item" role="presentation">
                  <button
                    className="nav-link active"
                    id="info-tab"
                    data-bs-toggle="tab"
                    data-bs-target="#basic-info"
                    type="button"
                    role="tab"
                    aria-selected="true"
                  >
                    Basic Information
                  </button>
                </li>
              </ul>
            </div>
            <div className="tab-content" id="myTabContent">
              <div
                className="tab-pane fade show active"
                id="basic-info"
                role="tabpanel"
                aria-labelledby="info-tab"
                tabIndex={0}
              >
                <div className="modal-body pb-0">
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
                            <h6 className="mb-1">Upload Client Logo</h6>
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
                              <button
                                type="button"
                                onClick={removeLogo}
                                className="btn btn-light btn-sm"
                              >
                                Remove
                              </button>
                            ) : (
                              <button
                                type="button" 
                                className="btn btn-light btn-sm"
                                onClick={() => {
                                  if (fileInputRef.current) {
                                    fileInputRef.current.value = "";
                                  }
                                }}
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Client Name <span className="text-danger"> *</span>
                        </label>
                        <input
                          type="text"
                          className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="Enter client name"
                        />
                        {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Company Name <span className="text-danger"> *</span>
                        </label>
                        <input
                          type="text"
                          className={`form-control ${errors.company ? 'is-invalid' : ''}`}
                          name="company"
                          value={formData.company}
                          onChange={handleInputChange}
                          placeholder="Enter company name"
                        />
                        {errors.company && <div className="invalid-feedback">{errors.company}</div>}
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Email <span className="text-danger"> *</span>
                        </label>
                        <input
                          type="email"
                          className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="Enter email address"
                        />
                        {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Phone Number</label>
                        <input
                          type="tel"
                          className="form-control"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder="Enter phone number"
                        />
                      </div>
                    </div>
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">Address</label>
                        <textarea
                          className="form-control"
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          rows={3}
                          placeholder="Enter address"
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">Status</label>
                        <select
                          className="form-control"
                          name="status"
                          value={formData.status}
                          onChange={handleInputChange}
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">Contract Value ($)</label>
                        <input
                          type="number"
                          className={`form-control ${errors.contractValue ? 'is-invalid' : ''}`}
                          name="contractValue"
                          value={formData.contractValue}
                          onChange={handleInputChange}
                          min="0"
                          step="0.01"
                        />
                        {errors.contractValue && <div className="invalid-feedback">{errors.contractValue}</div>}
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">Projects Count</label>
                        <input
                          type="number"
                          className={`form-control ${errors.projects ? 'is-invalid' : ''}`}
                          name="projects"
                          value={formData.projects}
                          onChange={handleInputChange}
                          min="0"
                        />
                        {errors.projects && <div className="invalid-feedback">{errors.projects}</div>}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-light border me-2"
                    onClick={() => {
                      closeModal();
                      resetForm();
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Creating...' : 'Create Client'}
                  </button>
                </div>
              </div>
            </div>
          </form>
          </div>
        </div>
      </div>
      <ToastContainer />
    </>
  );
};

export default AddClient;