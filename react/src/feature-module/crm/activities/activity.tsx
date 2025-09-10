import React, { useCallback, useEffect, useState, Fragment } from 'react';

import { all_routes } from '../../router/all_routes';
import { Link } from 'react-router-dom';
import { useSocket } from '../../../SocketContext';
import { Socket } from 'socket.io-client';
import Table from "../../../core/common/dataTable/index";
import PredefinedDateRanges from '../../../core/common/datePicker';
import CrmsModal from '../../../core/modals/crms_modal';
import CollapseHeader from '../../../core/common/collapse-header/collapse-header';
import { format } from 'date-fns';
import { message, Popconfirm } from "antd";

interface Activity {
  _id: string;
  title: string;
  activityType: string;
  dueDate: string;
  owner: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const Activity = () => {
  const socket = useSocket() as Socket | null;
  
  // State management
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [owners, setOwners] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  
  // Filter states
  const [selectedActivityType, setSelectedActivityType] = useState<string>('');
  const [selectedOwner, setSelectedOwner] = useState<string>('');
  const [selectedSort, setSelectedSort] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  
  // Current activity for modals
  const [currentActivity, setCurrentActivity] = useState<Activity | null>(null);

  // Fixed activity types as strings (not objects)
  const ACTIVITY_TYPES = [
    'Meeting',
    'Calls', 
    'Tasks',
    'Email'
  ];

  // ✅ NEW: Robust modal opening function
  const openModal = useCallback((modalId: string) => {
    const modal = document.getElementById(modalId);
    if (!modal) {
      console.error(`Modal with ID '${modalId}' not found`);
      return;
    }

    try {
      // Method 1: Try Bootstrap Modal API
      if ((window as any).bootstrap && (window as any).bootstrap.Modal) {
        const bootstrapModal = new (window as any).bootstrap.Modal(modal);
        bootstrapModal.show();
        return;
      }

      // Method 2: Try jQuery Bootstrap Modal (if available)
      if ((window as any).$ && (window as any).$.fn && (window as any).$.fn.modal) {
        (window as any).$(`#${modalId}`).modal('show');
        return;
      }

      // Method 3: Manual modal opening (fallback)
      modal.style.display = 'block';
      modal.classList.add('show');
      modal.setAttribute('aria-hidden', 'false');
      modal.setAttribute('aria-modal', 'true');
      
      // Add backdrop
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop fade show';
      backdrop.setAttribute('data-bs-dismiss', 'modal');
      document.body.appendChild(backdrop);
      
      // Add modal-open class to body
      document.body.classList.add('modal-open');
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = '0px';
      
      // Handle backdrop click
      backdrop.addEventListener('click', () => {
        closeModal(modalId);
      });
      
      // Handle escape key
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          closeModal(modalId);
          document.removeEventListener('keydown', handleEscape);
        }
      };
      document.addEventListener('keydown', handleEscape);
      
      console.log(`Modal '${modalId}' opened using fallback method`);
      
    } catch (error) {
      console.error(`Error opening modal '${modalId}':`, error);
      
      // Final fallback: just show the modal
      modal.style.display = 'block';
      modal.classList.add('show');
    }
  }, []);

  // ✅ NEW: Robust modal closing function
  const closeModal = useCallback((modalId: string) => {
    const modal = document.getElementById(modalId);
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
        (window as any).$(`#${modalId}`).modal('hide');
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
      console.error(`Error closing modal '${modalId}':`, error);
      
      // Final fallback: just hide the modal
      modal.style.display = 'none';
      modal.classList.remove('show');
    }
  }, []);

  // Fetch activities
  const fetchActivities = () => {
    if (!socket) return;
    setLoading(true);
    setError(null);
    console.log("[Activity] Fetching all activities from backend");
    socket.emit('activity:getAllData', {});
  };

  // Load all data on component mount
  useEffect(() => {
    if (!socket) return;
    
    fetchActivities();
    
    const activityHandler = (res: any) => {
      console.log('Activity getAllData response:', res);
      if (res.done) {
        console.log('Raw activities from backend:', res.data.activities);
        
        // Log unique activity types to see what's actually in the database
        if (res.data.activities?.length > 0) {
          const uniqueTypes = Array.from(new Set(res.data.activities.map((a: Activity) => a.activityType)));
          console.log('Unique activity types in database:', uniqueTypes);
        }
        
        setActivities(res.data.activities || []);
        setOwners(res.data.owners || []);
        setError(null);
        console.log(`Loaded ${res.data.activities?.length || 0} activities`);
      } else {
        setError(res.error || "Failed to fetch activities");
        console.error('Failed to fetch activities:', res.error);
      }
      setLoading(false);
    };

    // Listen for real-time updates
    const handleActivityCreated = (response: any) => {
      if (response.done && response.data) {
        console.log('Activity created:', response.data);
        fetchActivities();
      }
    };

    const handleActivityUpdated = (response: any) => {
      if (response.done && response.data) {
        console.log('Activity updated:', response.data);
        fetchActivities();
      }
    };

    const handleActivityDeleted = (response: any) => {
      if (response.done && response.data) {
        console.log('Activity deleted:', response.data);
        fetchActivities();
      }
    };

    socket.on("activity:getAllData-response", activityHandler);
    socket.on('activity:activity-created', handleActivityCreated);
    socket.on('activity:activity-updated', handleActivityUpdated);
    socket.on('activity:activity-deleted', handleActivityDeleted);

    // Listen for refresh events from modals
    const handleRefreshEvent = () => {
      console.log('Global refresh event received, fetching activities...');
      fetchActivities();
    };
    
    window.addEventListener('refresh-activities', handleRefreshEvent);

    return () => {
      socket.off("activity:getAllData-response", activityHandler);
      socket.off('activity:activity-created', handleActivityCreated);
      socket.off('activity:activity-updated', handleActivityUpdated);
      socket.off('activity:activity-deleted', handleActivityDeleted);
      window.removeEventListener('refresh-activities', handleRefreshEvent);
    };
  }, [socket]);

  // Apply filters whenever activities or filter states change
  useEffect(() => {
    console.log("[Activity] Applying filters...");
    console.log("[Activity] Current filters:", { selectedActivityType, selectedOwner, selectedSort, dateRange });
    console.log("[Activity] Total activities before filtering:", activities.length);
    
    if (!activities || activities.length === 0) {
      setFilteredActivities([]);
      return;
    }

    let result = [...activities];

    // Activity type filter
    if (selectedActivityType && selectedActivityType !== '') {
      console.log("[Activity] Filtering by activity type:", selectedActivityType);
      result = result.filter((activity) => activity.activityType === selectedActivityType);
      console.log("[Activity] After activity type filter:", result.length);
    }

    // Owner filter
    if (selectedOwner && selectedOwner !== '') {
      console.log("[Activity] Filtering by owner:", selectedOwner);
      result = result.filter((activity) => activity.owner === selectedOwner);
      console.log("[Activity] After owner filter:", result.length);
    }

    // Date range filter
    if (dateRange?.start || dateRange?.end) {
      console.log("[Activity] Filtering by date range:", dateRange);
      result = result.filter((activity) => {
        if (!activity.dueDate) return false;
        const activityDate = new Date(activity.dueDate);
        if (isNaN(activityDate.getTime())) return false;

        let start = dateRange?.start ? new Date(dateRange.start) : null;
        let end = dateRange?.end ? new Date(dateRange.end) : null;

        // Check if this is "All Time" (very old start date)
        const allTimeStart = new Date('1970-01-01T00:00:00.000Z');
        if (start && start.getTime() === allTimeStart.getTime()) {
          start = null;
        }

        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);

        return (!start || activityDate >= start) && (!end || activityDate <= end);
      });
      console.log("[Activity] After date filter:", result.length);
    }

    // Sort
    if (selectedSort) {
      result.sort((a, b) => {
        const dateA = new Date(a.dueDate);
        const dateB = new Date(b.dueDate);
        switch (selectedSort) {
          case 'asc':
            return dateA.getTime() - dateB.getTime();
          case 'desc':
            return dateB.getTime() - dateA.getTime();
          case 'recent':
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case 'last7days':
          case 'lastmonth':
            return dateB.getTime() - dateA.getTime();
          default:
            return 0;
        }
      });
    }

    console.log("[Activity] Final filtered activities count:", result.length);
    setFilteredActivities(result);
  }, [activities, selectedActivityType, selectedOwner, selectedSort, dateRange]);

  // Handle filter changes
  const handleActivityTypeChange = (type: string) => {
    console.log("[Activity] Activity type filter changed to:", type);
    setSelectedActivityType(type);
  };

  const handleOwnerChange = (owner: string) => {
    console.log("[Activity] Owner filter changed to:", owner);
    setSelectedOwner(owner);
  };

  const handleSortChange = (sort: string) => {
    console.log("[Activity] Sort filter changed to:", sort);
    setSelectedSort(sort);
  };

  const handleDateRangeChange = (range: { start: string; end: string } | null) => {
    console.log("[Activity] Date range changed:", range);
    setDateRange(range);
  };

  const handleClearFilters = () => {
    console.log("[Activity] Clearing all filters");
    setSelectedActivityType('');
    setSelectedOwner('');
    setSelectedSort('');
    setDateRange(null);
  };

  // Export functions
  const handleExportPDF = async () => {
    if (!socket) {
      message.error("Socket connection not available");
      return;
    }

    setExporting(true);
    try {
      console.log("Starting PDF export...");
      socket.emit("activity/export-pdf");

      const handlePDFResponse = (response: any) => {
        if (response.done) {
          console.log("PDF generated successfully:", response.data.pdfUrl);
          const link = document.createElement('a');
          link.href = response.data.pdfUrl;
          link.download = `activities_${Date.now()}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          message.success("PDF exported successfully!");
        } else {
          console.error("PDF export failed:", response.error);
          message.error(`PDF export failed: ${response.error}`);
        }
        setExporting(false);
        socket.off("activity/export-pdf-response", handlePDFResponse);
      };

      socket.on("activity/export-pdf-response", handlePDFResponse);
    } catch (error) {
      console.error("Error exporting PDF:", error);
      message.error("Failed to export PDF");
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    if (!socket) {
      message.error("Socket connection not available");
      return;
    }

    setExporting(true);
    try {
      console.log("Starting Excel export...");
      socket.emit("activity/export-excel");

      const handleExcelResponse = (response: any) => {
        if (response.done) {
          console.log("Excel generated successfully:", response.data.excelUrl);
          const link = document.createElement('a');
          link.href = response.data.excelUrl;
          link.download = `activities_${Date.now()}.xlsx`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          message.success("Excel exported successfully!");
        } else {
          console.error("Excel export failed:", response.error);
          message.error(`Excel export failed: ${response.error}`);
        }
        setExporting(false);
        socket.off("activity/export-excel-response", handleExcelResponse);
      };

      socket.on("activity/export-excel-response", handleExcelResponse);
    } catch (error) {
      console.error("Error exporting Excel:", error);
      message.error("Failed to export Excel");
      setExporting(false);
    }
  };

  // Format date helper
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy');
    } catch {
      return dateString;
    }
  };

  // ✅ FIXED: Handle edit action with robust modal opening
  const handleEditClick = useCallback((activity: Activity) => {
    console.log('Edit activity clicked:', activity);
    
    // Set the current activity for the edit modal
    setCurrentActivity(activity);
    
    // Store activity data in a global variable for the edit modal to access
    (window as any).currentEditActivity = activity;
    
    // Dispatch custom event that edit_activity.tsx is listening for
    window.dispatchEvent(
      new CustomEvent('edit-activity', { detail: { activity } })
    );

    // Open the Bootstrap modal using robust function
    openModal('edit_activity');
  }, [openModal]);

  // ✅ FIXED: Handle delete action with robust modal opening
  const handleDeleteClick = useCallback((activity: Activity) => {
    console.log('Delete activity clicked:', activity);
    setCurrentActivity(activity);
    
    // Store activity data for the delete modal
    (window as any).currentDeleteActivity = activity;
    
    // Open the delete modal using robust function
    openModal('delete_activity');
  }, [openModal]);

  // ✅ NEW: Handle delete confirmation with Ant Design Popconfirm
  const handleDeleteConfirm = useCallback(async (activity: Activity) => {
    if (!socket) {
      message.error("Socket connection not available");
      return;
    }

    try {
      console.log('Deleting activity:', activity);
      socket.emit('activity:delete', { activityId: activity._id });

      // Listen for response
      socket.once('activity:delete-response', (response: any) => {
        if (response.done) {
          console.log('Activity deleted successfully:', response.data);
          message.success('Activity deleted successfully!');
          fetchActivities(); // Refresh the list
        } else {
          console.error('Failed to delete activity:', response.error);
          message.error(`Failed to delete activity: ${response.error}`);
        }
      });
    } catch (error) {
      console.error('Error deleting activity:', error);
      message.error('An error occurred while deleting the activity');
    }
  }, [socket]);

  // Transform data to match original table structure
  const transformedData = filteredActivities.map(activity => ({
    key: activity._id,
    title: activity.title,
    activity_type: activity.activityType,
    due_date: formatDate(activity.dueDate),
    owner: activity.owner || 'N/A',
    created_date: formatDate(activity.createdAt),
    originalData: activity
  }));

  // ✅ UPDATED: Columns with proper edit and delete handlers
  const columns = [
    {
      title: "Title",
      dataIndex: "title",
      render: (text: string) => (
        <p className="fs-14 text-dark fw-medium">{text}</p>
      ),
      sorter: (a: any, b: any) => a.title.length - b.title.length,
    },
    {
      title: "Activity Type",
      dataIndex: "activity_type",
      render: (text: string, record: any) => (
        <span className={`badge ${text === 'Meeting' ? 'badge-pink-transparent' : text === 'Calls' ? 'badge-purple-transparent' : text === 'Tasks' ? 'badge-info-transparent' : 'badge-warning-transparent'}`}>
          <i className={`ti me-1 ${text === 'Meeting' ? 'ti-device-computer-camera' : text === 'Calls' ? 'ti-phone' : text === 'Tasks' ? 'ti-subtask' : 'ti-mail'}`} />
          {text}
        </span>
      ),
      sorter: (a: any, b: any) => a.activity_type.length - b.activity_type.length,
    },
    {
      title: "Due Date",
      dataIndex: "due_date",
      sorter: (a: any, b: any) => a.due_date.length - b.due_date.length,
    },
    {
      title: "Owner",
      dataIndex: "owner",
      sorter: (a: any, b: any) => a.owner.length - b.owner.length,
    },
    {
      title: "Created Date",
      dataIndex: "created_date",
      sorter: (a: any, b: any) => a.created_date.length - b.created_date.length,
    },
    {
      title: "",
      dataIndex: "actions",
      render: (_: any, record: any) => (
        <div className="action-icon d-inline-flex">
          {/* Edit Button */}
          <Link
            to="#"
            className="me-2"
            data-bs-toggle="modal" 
            data-inert={true}
            data-bs-target="#edit_activity"
            onClick={(e) => {
              e.preventDefault();
              handleEditClick(record.originalData);
            }}
          >
            <i className="ti ti-edit" />
          </Link>
          
          {/* Delete Button with Popconfirm */}
          <Popconfirm
            title="Delete Activity"
            description={`Are you sure you want to delete "${record.originalData.title}"? This action cannot be undone.`}
            onConfirm={() => handleDeleteConfirm(record.originalData)}
            okText="Yes, Delete"
            cancelText="Cancel"
            okType="danger"
          >
            <Link
              to="#"
              onClick={(e) => {
                e.preventDefault();
                // Don't open modal here, let Popconfirm handle it
              }}
            >
              <i className="ti ti-trash" />
            </Link>
          </Popconfirm>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
            <div className="spinner-border" role="status">
              <span className="sr-only">Loading activities...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="alert alert-danger" role="alert">
            <h4 className="alert-heading">Error!</h4>
            <p>{error}</p>
            <hr />
            <button className="btn btn-primary" onClick={fetchActivities}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Page Wrapper */}
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Activity</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={all_routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">CRM</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Activity List
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
                    {exporting ? "Exporting..." : "Export"}
                  </Link>
                  <ul className="dropdown-menu dropdown-menu-end p-3">
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={(e) => {
                          e.preventDefault();
                          handleExportPDF();
                        }}
                      >
                        <i className="ti ti-file-type-pdf me-1" />
                        Export as PDF
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={(e) => {
                          e.preventDefault();
                          handleExportExcel();
                        }}
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
                  data-bs-toggle="modal" 
                  data-inert={true}
                  data-bs-target="#add_activity"
                  className="btn btn-primary d-flex align-items-center"
                >
                  <i className="ti ti-circle-plus me-2" />
                  Add Activity
                </Link>
              </div>
              <div className="ms-2 head-icons">
                <CollapseHeader />
              </div>
            </div>
          </div>
          {/* /Breadcrumb */}

          {/* Activity List */}
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
              <h5>Activity List</h5>
              <div className="d-flex my-xl-auto right-content align-items-center flex-wrap row-gap-3">
                {/* Date Range Filter */}
                <div className="me-3">
                  <div className="input-icon-end position-relative">
                    <PredefinedDateRanges onChange={handleDateRangeChange} />
                    <span className="input-icon-addon">
                      <i className="ti ti-chevron-down" />
                    </span>
                  </div>
                </div>

                {/* Activity Type Filter - FIXED: Using string values only */}
                <div className="dropdown me-3">
                  <Link
                    to="#"
                    className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    Activity Type
                  </Link>
                  <ul className="dropdown-menu dropdown-menu-end p-3">
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={(e) => {
                          e.preventDefault();
                          handleActivityTypeChange('');
                        }}
                      >
                        All Types
                      </Link>
                    </li>
                    {/* FIXED: Using string array and rendering only strings */}
                    {ACTIVITY_TYPES.map(type => (
                      <li key={type}>
                        <Link
                          to="#"
                          className="dropdown-item rounded-1"
                          onClick={(e) => {
                            e.preventDefault();
                            handleActivityTypeChange(type);
                          }}
                        >
                          {type}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Owner Filter - FIXED: Using string values only */}
                {owners.length > 0 && (
                  <div className="dropdown me-3">
                    <Link
                      to="#"
                      className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                      data-bs-toggle="dropdown"
                    >
                      Owner
                    </Link>
                    <ul className="dropdown-menu dropdown-menu-end p-3">
                      <li>
                        <Link
                          to="#"
                          className="dropdown-item rounded-1"
                          onClick={(e) => {
                            e.preventDefault();
                            handleOwnerChange('');
                          }}
                        >
                          All Owners
                        </Link>
                      </li>
                      {/* FIXED: Ensuring we only render string values */}
                      {owners.map(owner => (
                        <li key={owner}>
                          <Link
                            to="#"
                            className="dropdown-item rounded-1"
                            onClick={(e) => {
                              e.preventDefault();
                              handleOwnerChange(owner);
                            }}
                          >
                            {String(owner)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Sort Options - FIXED: Using string values only */}
                <div className="dropdown me-3">
                  <Link
                    to="#"
                    className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    Sort By : Last 7 Days
                  </Link>
                  <ul className="dropdown-menu dropdown-menu-end p-3">
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={(e) => {
                          e.preventDefault();
                          handleSortChange('recent');
                        }}
                      >
                        Recently Added
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={(e) => {
                          e.preventDefault();
                          handleSortChange('asc');
                        }}
                      >
                        Ascending
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={(e) => {
                          e.preventDefault();
                          handleSortChange('desc');
                        }}
                      >
                        Descending
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={(e) => {
                          e.preventDefault();
                          handleSortChange('lastmonth');
                        }}
                      >
                        Last Month
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={(e) => {
                          e.preventDefault();
                          handleSortChange('last7days');
                        }}
                      >
                        Last 7 Days
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* Clear Filters Button */}
                <div>
                  <button
                    className="btn btn-light"
                    onClick={handleClearFilters}
                  >
                    <i className="ti ti-filter-off me-1" />
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center p-4">
                  <div className="spinner-border" role="status">
                    <span className="sr-only">Loading activities...</span>
                  </div>
                </div>
              ) : error ? (
                <div className="alert alert-danger m-3">
                  <h6>Error loading activities</h6>
                  <p className="mb-0">{error}</p>
                </div>
              ) : (
                <>
                  {/* Filter Summary */}
                  <div className="px-3 py-2 border-bottom bg-light">
                    <small className="text-muted">
                      Showing {filteredActivities.length} of {activities.length} activities
                      {(selectedActivityType || selectedOwner || dateRange) && 
                        <span className="ms-2">
                          <i className="ti ti-filter me-1"></i>
                          Filters applied:
                          {selectedActivityType && ` Type: ${selectedActivityType}`}
                          {selectedOwner && ` Owner: ${selectedOwner}`}
                          {dateRange && ` Date Range: Applied`}
                        </span>
                      }
                    </small>
                  </div>
                  <Table dataSource={transformedData} columns={columns} Selection={true} />
                </>
              )}
            </div>
          </div>
          {/* /Activity List */}
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
      
      <CrmsModal />
      
      {/* Store current activity in hidden inputs for modals to access */}
      <div style={{ display: 'none' }}>
        <input type="hidden" id="current-edit-activity" value={JSON.stringify(currentActivity)} />
        <input type="hidden" id="current-delete-activity" value={JSON.stringify(currentActivity)} />
      </div>
    </>
  );
};

export default Activity;
