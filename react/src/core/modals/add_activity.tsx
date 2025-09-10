import { DatePicker } from 'antd';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import CommonSelect from '../common/commonSelect';
import { beforeuse, company, contacts, deals } from '../common/selectoption/selectoption';
import { label } from 'yet-another-react-lightbox/*';
import { useSocket } from '../../SocketContext';
import { Socket } from 'socket.io-client';
import dayjs from 'dayjs';

const AddActivity = () => {
    const socket = useSocket() as Socket | null;

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        activityType: 'Calls', // Default to first active type
        dueDate: null as any,
        dueTime: '',
        reminder: '',
        reminderType: 'Select',
        owner: '', // Changed to string for input field
        guests: '', // Changed to string for input field
        description: '',
        
    });

    // UI state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    

    const getModalContainer = () => {
        const modalElement = document.getElementById('modal-datepicker');
        return modalElement ? modalElement : document.body;
    };

    const getModalContainer2 = () => {
        const modalElement = document.getElementById('modal_datepicker');
        return modalElement ? modalElement : document.body;
    };

    // Handle input changes
    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError(null);
    };

    // Handle select changes
    const handleSelectChange = (field: string) => (selectedOption: any) => {
        const value = selectedOption ? selectedOption.value : 'Select';
        setFormData(prev => ({ ...prev, [field]: value }));
        setError(null);
    };

    // Handle activity type selection
    const handleActivityTypeClick = (activityType: string) => {
        setFormData(prev => ({ ...prev, activityType }));
        setError(null);
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!socket) {
            setError('No socket connection available');
            return;
        }

        // Validate required fields
        if (!formData.title.trim() || !formData.activityType || !formData.dueDate || !formData.owner.trim()) {
            setError('Please fill in all required fields');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            // Combine date and time if available
            let combinedDateTime = dayjs(formData.dueDate);
            if (formData.dueTime) {
                // Parse time and combine with date
                const [hours, minutes] = formData.dueTime.split(':');
                combinedDateTime = combinedDateTime.hour(parseInt(hours)).minute(parseInt(minutes)).second(0);
            }

            // Prepare data for backend
            const activityData = {
                title: formData.title.trim(),
                activityType: formData.activityType,
                dueDate: combinedDateTime.toISOString(),
                owner: formData.owner.trim(), // Use the input value directly
                description: formData.description.trim(),
                reminder: formData.reminder || null,
                reminderType: formData.reminderType !== 'Select' ? formData.reminderType : null,
                guests: formData.guests.trim() || null, // Use the input value directly
               
            };

            console.log('[AddActivity] Creating activity:', activityData);

            // Send to backend
            socket.emit('activity:create', activityData);

            // Listen for response
            socket.once('activity:create-response', (response: any) => {
                setLoading(false);
                
                if (response.done) {
                    console.log('[AddActivity] Activity created successfully:', response.data);
                    setSuccess(true);
                    
                    // Reset form
                    resetForm();

                    // Show success message briefly, then close modal
                    setTimeout(() => {
                        closeModal();
                        
                        // Dispatch refresh event to update activity list
                        window.dispatchEvent(new CustomEvent('refresh-activities'));
                        
                        // Reset states
                        setTimeout(() => {
                            setSuccess(false);
                            setError(null);
                        }, 300);
                    }, 1500);
                    
                } else {
                    console.error('[AddActivity] Failed to create activity:', response.error);
                    setError(response.error || 'Failed to create activity');
                }
            });

        } catch (error) {
            console.error('[AddActivity] Error creating activity:', error);
            setError('An error occurred while creating the activity');
            setLoading(false);
        }
    };

    // Reset form
    const resetForm = () => {
        setFormData({
            title: '',
            activityType: 'Calls',
            dueDate: null,
            dueTime: '',
            reminder: '',
            reminderType: 'Select',
            owner: '', // Reset to empty string
            guests: '', // Reset to empty string
            description: '',
            
        });
    };

    // Close modal
    const closeModal = () => {
        const modal = document.getElementById('add_activity');
        if (modal) {
            const bootstrapModal = (window as any).bootstrap?.Modal?.getInstance(modal);
            if (bootstrapModal) {
                bootstrapModal.hide();
            } else {
                modal.style.display = 'none';
                modal.setAttribute('aria-hidden', 'true');
                modal.classList.remove('show');
                const backdrops = document.querySelectorAll('.modal-backdrop');
                backdrops.forEach(backdrop => backdrop.remove());
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
            }
        }
    };

    // Reset form when modal opens
    useEffect(() => {
        const handleModalShow = () => {
            resetForm();
            setError(null);
            setSuccess(false);
            setLoading(false);
        };

        const modal = document.getElementById('add_activity');
        if (modal) {
            modal.addEventListener('show.bs.modal', handleModalShow);
            return () => {
                modal.removeEventListener('show.bs.modal', handleModalShow);
            };
        }
    }, []);

    return (
        <>
            {/* Add Activity */}
            <div className="modal fade" id="add_activity">
                <div className="modal-dialog modal-dialog-centered modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h4 className="modal-title">Add New Activity</h4>
                            <button
                                type="button"
                                className="btn-close custom-btn-close"
                                data-bs-dismiss="modal"
                                aria-label="Close"
                                onClick={() => setError(null)}
                            >
                                <i className="ti ti-x" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body pb-0">
                                {/* Error Alert */}
                                {error && (
                                    <div className="alert alert-danger alert-dismissible fade show mb-3" role="alert">
                                        <strong>Error!</strong> {error}
                                        <button type="button" className="btn-close" onClick={() => setError(null)}></button>
                                    </div>
                                )}

                                {/* Success Alert */}
                                {success && (
                                    <div className="alert alert-success mb-3" role="alert">
                                        <i className="ti ti-check-circle me-2" />
                                        Activity created successfully!
                                    </div>
                                )}

                                <div className="row">
                                    <div className="col-md-12">
                                        <div className="mb-3">
                                            <label className="form-label">
                                                Title <span className="text-danger"> *</span>
                                            </label>
                                            <input 
                                                type="text" 
                                                className="form-control" 
                                                value={formData.title}
                                                onChange={(e) => handleInputChange('title', e.target.value)}
                                                disabled={loading}
                                                placeholder="Enter activity title"
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-12">
                                        <label className="form-label">
                                            Activity Type <span className="text-danger"> *</span>
                                        </label>
                                        <div className="activity-items d-flex align-items-center mb-3">
                                            <Link
                                                to="#"
                                                className={`br-5 d-flex align-items-center justify-content-center me-2 ${
                                                    formData.activityType === 'Calls' ? 'active' : ''
                                                }`}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleActivityTypeClick('Calls');
                                                }}
                                            >
                                                {" "}
                                                <i className="ti ti-phone me-1" />
                                                Calls
                                            </Link>
                                            <Link
                                                to="#"
                                                className={`br-5 d-flex align-items-center justify-content-center me-2 ${
                                                    formData.activityType === 'Email' ? 'active' : ''
                                                }`}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleActivityTypeClick('Email');
                                                }}
                                            >
                                                {" "}
                                                <i className="ti ti-mail me-1" />
                                                Email
                                            </Link>
                                            <Link
                                                to="#"
                                                className={`br-5 d-flex align-items-center justify-content-center me-2 ${
                                                    formData.activityType === 'Meeting' ? 'active' : ''
                                                }`}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleActivityTypeClick('Meeting');
                                                }}
                                            >
                                                {" "}
                                                <i className="ti ti-user-circle me-1" />
                                                Meeting
                                            </Link>
                                            <Link
                                                to="#"
                                                className={`br-5 d-flex align-items-center justify-content-center me-2 ${
                                                    formData.activityType === 'Task' ? 'active' : ''
                                                }`}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleActivityTypeClick('Task');
                                                }}
                                            >
                                                {" "}
                                                <i className="ti ti-list-check me-1" />
                                                Task
                                            </Link>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label className="form-label">
                                                Due Date <span className="text-danger"> *</span>
                                            </label>
                                            <div className="input-icon-end position-relative">
                                                <DatePicker
                                                    className="form-control datetimepicker"
                                                    format="DD-MM-YYYY"
                                                    getPopupContainer={getModalContainer}
                                                    placeholder="DD-MM-YYYY"
                                                    value={formData.dueDate}
                                                    onChange={(date) => handleInputChange('dueDate', date)}
                                                    disabled={loading}
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
                                                Time <span className="text-danger"> *</span>
                                            </label>
                                            <div className="input-icon-end position-relative">
                                                <input 
                                                    type="time" 
                                                    className="form-control timepicker" 
                                                    value={formData.dueTime}
                                                    onChange={(e) => handleInputChange('dueTime', e.target.value)}
                                                    disabled={loading}
                                                />
                                                <span className="input-icon-addon">
                                                    <i className="ti ti-clock-hour-10 text-gray-7" />
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-12 lead-phno-col del-phno-col">
                                        <div className="row">
                                            <div className="col-lg-8">
                                                <div className="input-block mb-3">
                                                    <label className="form-label">
                                                        Remainder <span className="text-danger"> *</span>
                                                    </label>
                                                    <div className="input-icon-start position-relative">
                                                        <input 
                                                            type="text" 
                                                            className="form-control" 
                                                            value={formData.reminder}
                                                            onChange={(e) => handleInputChange('reminder', e.target.value)}
                                                            disabled={loading}
                                                            placeholder="Enter reminder"
                                                        />
                                                        <span className="input-icon-addon">
                                                            <i className="ti ti-bell text-gray-7" />
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-lg-4 d-flex align-items-end">
                                                <div className="input-block w-100 mb-3 d-flex align-items-center">
                                                    <div className="w-100">
                                                        <CommonSelect
                                                            className='select'
                                                            options={beforeuse}
                                                            defaultValue={formData.reminderType}
                                                            onChange={handleSelectChange('reminderType')}
                                                            disabled={loading}
                                                        />
                                                    </div>
                                                    <h6 className="fs-14 fw-normal ms-3">Before Use</h6>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Owner Input Field */}
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label className="form-label">
                                                Owner <span className="text-danger"> *</span>
                                            </label>
                                            <input 
                                                type="text" 
                                                className="form-control" 
                                                value={formData.owner}
                                                onChange={(e) => handleInputChange('owner', e.target.value)}
                                                disabled={loading}
                                                placeholder="Enter owner name"
                                            />
                                        </div>
                                    </div>
                                    {/* Guests Input Field */}
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label className="form-label">
                                                Guests <span className="text-danger"> *</span>
                                            </label>
                                            <input 
                                                type="text" 
                                                className="form-control" 
                                                value={formData.guests}
                                                onChange={(e) => handleInputChange('guests', e.target.value)}
                                                disabled={loading}
                                                placeholder="Enter guest names (comma separated)"
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-12">
                                        <div className="mb-3">
                                            <label className="form-label">
                                                Description <span className="text-danger"> *</span>
                                            </label>
                                            <textarea
                                                className="form-control"
                                                rows={4}
                                                value={formData.description}
                                                onChange={(e) => handleInputChange('description', e.target.value)}
                                                disabled={loading}
                                                placeholder="Enter description"
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
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn btn-primary"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                            Adding Activity...
                                        </>
                                    ) : (
                                        'Add Activity'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            {/* /Add Activity */}
        </>
    )
}

export default AddActivity;
