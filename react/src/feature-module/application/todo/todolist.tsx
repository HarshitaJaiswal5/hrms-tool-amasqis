import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import TodoModal from "../../../core/modals/todoModal";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";
import { all_routes } from "../../router/all_routes";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import CollapseHeader from "../../../core/common/collapse-header/collapse-header";
import { useSocket } from "../../../SocketContext";
import { Socket } from "socket.io-client";

const { RangePicker } = DatePicker;

interface Todo {
  _id: string;
  title: string;
  description?: string;
  priority: string;
  tag?: string;
  dueDate?: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
  assignedTo?: string;
}



const TodoList = () => {
  const socket = useSocket() as Socket | null;
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedTag, setSelectedTag] = useState("all");
  const [selectedAssignee, setSelectedAssignee] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [sortBy, setSortBy] = useState("last7days");
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [availableAssignees, setAvailableAssignees] = useState<string[]>([]);
  const [dateRangeFilter, setDateRangeFilter] = useState("all");
  const [dueDateFilter, setDueDateFilter] = useState<string | null>(null);
  const [customDateRange, setCustomDateRange] = useState<{start: string, end: string} | null>(null);
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [selectedTodoToDelete, setSelectedTodoToDelete] = useState<string | null>(null);
  const [selectedTodoToEdit, setSelectedTodoToEdit] = useState<Todo | null>(null);
  const [selectedTodoToView, setSelectedTodoToView] = useState<Todo | null>(null);

  const toggleTodo = async (todoId: string, currentCompleted: boolean) => {
    if (!socket) {
      console.error('Socket not available');
      return;
    }

    try {
      const updateData = {
        id: todoId,
        completed: !currentCompleted
      };

      console.log('Updating todo completion status:', updateData);

      const handleResponse = (response: any) => {
        console.log('Update todo response received:', response);
        if (response.done) {
          console.log('Todo completion status updated successfully');
          // The todos will be updated via the broadcast from the backend
        } else {
          console.error('Failed to update todo:', response.error);
          // Revert the change in UI if update failed
          setTodos(prevTodos => 
            prevTodos.map(todo => 
              todo._id === todoId 
                ? { ...todo, completed: currentCompleted } // Revert to original state
                : todo
            )
          );
        }
        // Remove the specific listener after handling the response
        if (socket) {
          socket.off("admin/dashboard/update-todo-response", handleResponse);
        }
      };

      // Optimistically update the UI
      setTodos(prevTodos => 
        prevTodos.map(todo => 
          todo._id === todoId 
            ? { ...todo, completed: !currentCompleted }
            : todo
        )
      );

      if (socket) {
        socket.on("admin/dashboard/update-todo-response", handleResponse);
        socket.emit("admin/dashboard/update-todo", updateData);
      }

      // Add timeout to prevent infinite loading
      setTimeout(() => {
        console.error("Update todo request timed out");
        if (socket) {
          socket.off("admin/dashboard/update-todo-response", handleResponse);
        }
        // Revert the change if timeout
        setTodos(prevTodos => 
          prevTodos.map(todo => 
            todo._id === todoId 
              ? { ...todo, completed: currentCompleted }
              : todo
          )
        );
      }, 10000); // 10 second timeout

    } catch (error) {
      console.error('Error updating todo completion status:', error);
      // Revert the change in UI if error occurred
      setTodos(prevTodos => 
        prevTodos.map(todo => 
          todo._id === todoId 
            ? { ...todo, completed: currentCompleted }
            : todo
        )
      );
    }
  };

  // Handle tag filter change
  const handleTagChange = (tag: string) => {
    setSelectedTag(tag);
  };

  // Handle assignee filter change
  const handleAssigneeChange = (assignee: string) => {
    setSelectedAssignee(assignee);
  };

  // Handle status filter change
  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
  };

  // Handle sort change
  const handleSortChange = (sort: string) => {
    setSortBy(sort);
  };

  // Handle date range filter change
  const handleDateRangeChange = (range: string) => {
    setDateRangeFilter(range);
  };

  // Handle due date filter change
  const handleDueDateChange = (date: string | null) => {
    setDueDateFilter(date);
  };

  // Handle custom date range change
  const handleCustomDateRangeChange = (dates: any) => {
    if (dates && dates.length === 2) {
      const startDate = dates[0].format('YYYY-MM-DD');
      const endDate = dates[1].format('YYYY-MM-DD');
      console.log("Custom range changed:", { startDate, endDate });
      setCustomDateRange({ start: startDate, end: endDate });
      setDateRangeFilter("custom");
      setShowCustomRange(false); // Close the picker after selection
    } else {
      setCustomDateRange(null);
      setDateRangeFilter("all");
    }
  };

  // Handle custom range click
  const handleCustomRangeClick = () => {
    setShowCustomRange(!showCustomRange);
  };

  // Handle new todo creation
  const handleNewTodo = () => {
    // This function can be called when a new todo is successfully created
    // to refresh the todo list
    if (socket) {
      (socket as any).emit("admin/dashboard/get-todos", { filter: activeFilter });
    }
  };

  // Handle todo deletion
  const handleDeleteTodo = (todoId: string) => {
    if (socket && todoId) {
      console.log("Deleting todo:", todoId);
      (socket as any).emit("admin/dashboard/delete-todo", todoId);
      setSelectedTodoToDelete(null); // Reset the selected todo
    } else {
      console.error("Cannot delete todo - socket or todoId missing");
    }
  };

  // Handle delete button click
  const handleDeleteClick = (todoId: string) => {
    console.log("Delete button clicked for todo:", todoId);
    const confirmed = window.confirm("Are you sure you want to delete this todo? This action cannot be undone.");
    if (confirmed) {
      handleDeleteTodo(todoId);
    }
  };

  // Handle edit button click
  const handleEditClick = (todo: Todo) => {
    setSelectedTodoToEdit(todo);
    console.log('Edit todo clicked:', todo);
  };

  // Handle view button click
  const handleViewClick = (todo: Todo) => {
    setSelectedTodoToView(todo);
    console.log('View todo clicked:', todo);
  };

  // Handle todo refresh
  const handleTodoRefresh = () => {
    if (socket) {
      socket.emit("admin/dashboard/get-todos", { filter: activeFilter });
    }
  };

  // Helper function to get date range based on filter
  const getDateRange = (range: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (range) {
      case "today":
        return {
          start: today,
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        };
      case "yesterday":
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        return {
          start: yesterday,
          end: today
        };
      case "last7days":
        return {
          start: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        };
      case "last30days":
        // Last 30 days from today (rolling 30 days)
        return {
          start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        };
      case "thismonth":
        // Current calendar month (1st to last day of current month)
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(now.getFullYear(), now.getMonth() + 1, 1)
        };
      case "lastmonth":
        // Previous calendar month
        return {
          start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          end: new Date(now.getFullYear(), now.getMonth(), 1)
        };
      case "thisyear":
        // Current year
        return {
          start: new Date(now.getFullYear(), 0, 1),
          end: new Date(now.getFullYear() + 1, 0, 1)
        };
      case "custom":
        // Custom date range
        if (customDateRange && customDateRange.start && customDateRange.end) {
          const startDate = new Date(customDateRange.start);
          const endDate = new Date(customDateRange.end);
          // Add 1 day to end date to include the full end day
          endDate.setDate(endDate.getDate() + 1);
          console.log("Custom range applied:", { start: startDate, end: endDate });
          return {
            start: startDate,
            end: endDate
          };
        }
        return null;
      default:
        return null; // All time
    }
  };

  // Get filtered and sorted todos
  const getFilteredTodos = () => {
    let filteredTodos = todos.filter(todo => {
      const tagMatch = selectedTag === "all" || todo.tag?.toLowerCase() === selectedTag.toLowerCase();
      const assigneeMatch = selectedAssignee === "all" || (todo.assignedTo || todo.userId) === selectedAssignee;
      
      let statusMatch = true;
      if (selectedStatus !== "all") {
        switch (selectedStatus.toLowerCase()) {
          case "completed":
            statusMatch = todo.completed === true;
            break;
          case "pending":
            statusMatch = todo.completed === false;
            break;
          case "inprogress":
            // For now, treat as pending since we don't have inprogress status in data
            statusMatch = todo.completed === false;
            break;
          case "onhold":
            // For now, treat as pending since we don't have onhold status in data
            statusMatch = todo.completed === false;
            break;
        }
      }

      // Date range filter (based on createdAt)
      let dateRangeMatch = true;
      if (dateRangeFilter !== "all") {
        const dateRange = getDateRange(dateRangeFilter);
        if (dateRange) {
          const todoCreatedDate = new Date(todo.createdAt);
          dateRangeMatch = todoCreatedDate >= dateRange.start && todoCreatedDate < dateRange.end;
          if (dateRangeFilter === "custom") {
            console.log("Custom filter check:", {
              todoCreatedDate,
              dateRange,
              dateRangeMatch,
              todoTitle: todo.title
            });
          }
        }
      }

      // Due date filter (based on dueDate)
      let dueDateMatch = true;
      if (dueDateFilter) {
        if (todo.dueDate) {
          const todoDueDate = new Date(todo.dueDate);
          const filterDate = new Date(dueDateFilter);
          dueDateMatch = todoDueDate.toDateString() === filterDate.toDateString();
        } else {
          dueDateMatch = false; // If filtering by due date but todo has no due date
        }
      }
      
      return tagMatch && assigneeMatch && statusMatch && dateRangeMatch && dueDateMatch;
    });

    // Sort todos based on sortBy
    filteredTodos.sort((a, b) => {
      switch (sortBy) {
        case "last7days":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "last1month":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "last1year":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return filteredTodos;
  };

  // Fetch todos
  useEffect(() => {
    if (socket) {
      (socket as any).emit("admin/dashboard/get-todos", { filter: activeFilter });
      (socket as any).on("admin/dashboard/get-todos-response", (response: any) => {
        if (response.done) {
          const todosData = response.data || [];
          setTodos(todosData);
          
          // Extract unique tags
          const tags = Array.from(new Set(todosData.map((todo: Todo) => todo.tag).filter(Boolean))) as string[];
          setAvailableTags(tags);
          
          // Extract unique assignees (using userId for now, can be enhanced with actual user names)
          const assignees = Array.from(new Set(todosData.map((todo: Todo) => todo.assignedTo || todo.userId).filter(Boolean))) as string[];
          setAvailableAssignees(assignees);
        }
        setLoading(false);
      });

      // Listen for todo creation success
      (socket as any).on("admin/dashboard/add-todo-response", (response: any) => {
        if (response.done) {
          // Refresh the todo list after successful creation
          (socket as any).emit("admin/dashboard/get-todos", { filter: activeFilter });
        }
      });

      // Listen for todo update success
      (socket as any).on("admin/dashboard/update-todo-response", (response: any) => {
        if (response.done) {
          // Refresh the todo list after successful update
          (socket as any).emit("admin/dashboard/get-todos", { filter: activeFilter });
        }
      });

      // Listen for todo deletion success
      (socket as any).on("admin/dashboard/delete-todo-response", (response: any) => {
        if (response.done) {
          console.log("Todo deleted successfully");
          // Refresh the todo list after successful deletion
          (socket as any).emit("admin/dashboard/get-todos", { filter: activeFilter });
        } else {
          console.error("Delete failed:", response.error);
        }
      });

      return () => {
        (socket as any).off("admin/dashboard/get-todos-response");
        (socket as any).off("admin/dashboard/add-todo-response");
        (socket as any).off("admin/dashboard/update-todo-response");
        (socket as any).off("admin/dashboard/delete-todo-response");
      };
    }
  }, [socket, activeFilter]);

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'text-purple';
      case 'medium': return 'text-warning';
      case 'low': return 'text-success';
      default: return 'text-secondary';
    }
  };

  // Get status badge class
  const getStatusBadgeClass = (completed: boolean) => {
    return completed 
      ? "badge badge-soft-success d-inline-flex align-items-center"
      : "badge badge-soft-secondary d-inline-flex align-items-center";
  };

  // Get tag badge class
  const getTagBadgeClass = (tag: string) => {
    const tagColors: { [key: string]: string } = {
      'projects': 'badge-success',
      'internal': 'badge-danger',
      'reminder': 'badge-secondary',
      'research': 'bg-pink',
      'meetings': 'badge-purple',
      'social': 'badge-info',
      'bugs': 'badge-danger',
      'animation': 'badge-warning',
      'security': 'badge-danger',
      'reports': 'badge-info'
    };
    return tagColors[tag?.toLowerCase()] || 'badge-secondary';
  };

  // Get progress percentage (mock calculation)
  const getProgressPercentage = (todo: Todo) => {
    return todo.completed ? 100 : Math.floor(Math.random() * 90) + 10;
  };

  // Get progress bar color
  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-success';
    if (percentage >= 70) return 'bg-purple';
    if (percentage >= 40) return 'bg-warning';
    return 'bg-danger';
  };

  const options = [
    { value: "bulk-actions", label: "Bulk Actions" },
    { value: "delete-marked", label: "Delete Marked" },
    { value: "unmark-all", label: "Unmark All" },
    { value: "mark-all", label: "Mark All" },
  ];
  return (
    <>
      <>
        {/* Page Wrapper */}
        <div className="page-wrapper">
          <div className="content">
            {/* Breadcrumb */}
            <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
              <div className="my-auto mb-2">
                <h2 className="mb-1">Todo</h2>
                <nav>
                  <ol className="breadcrumb mb-0">
                    <li className="breadcrumb-item">
                      <Link to={all_routes.adminDashboard}>
                        <i className="ti ti-smart-home" />
                      </Link>
                    </li>
                    <li className="breadcrumb-item">Application</li>
                    <li className="breadcrumb-item active" aria-current="page">
                      Todo
                    </li>
                  </ol>
                </nav>
              </div>
              <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
                <div className="d-flex align-items-center border rounded p-1 me-2">
                  <Link
                    to={all_routes.TodoList}
                    className="btn btn-icon btn-sm active bg-primary text-white"
                  >
                    <i className="ti ti-list-tree" />
                  </Link>
                  <Link to={all_routes.todo} className="btn btn-icon btn-sm">
                    <i className="ti ti-table" />
                  </Link>
                </div>
                <div className="">
                  <Link
                    to="#"
                    className="btn btn-primary d-flex align-items-center"
                    data-bs-toggle="modal"
                    data-bs-target="#add_todo"
                    title="Create a new todo task"
                  >
                    <i className="ti ti-circle-plus me-2" />
                    Create New
                  </Link>
                </div>
                <div className="ms-2 mb-0 head-icons">
                  <CollapseHeader />
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
                <h5 className="d-flex align-items-center">
                  Todo Lists{" "}
                  <span className="badge bg-soft-pink ms-2">{getFilteredTodos().length} Todos</span>
                </h5>
                <div className="d-flex align-items-center flex-wrap row-gap-3">
                  <div className="dropdown me-3">
                    <Link
                      to="#"
                      className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                      data-bs-toggle="dropdown"
                    >
                       {dateRangeFilter === "all" ? "All Time" : 
                        dateRangeFilter === "today" ? "Today" :
                        dateRangeFilter === "yesterday" ? "Yesterday" :
                        dateRangeFilter === "last7days" ? "Last 7 Days" :
                        dateRangeFilter === "last30days" ? "Last 30 Days" :
                        dateRangeFilter === "thismonth" ? "This Month" :
                        dateRangeFilter === "lastmonth" ? "Last Month" :
                        dateRangeFilter === "thisyear" ? "This Year" :
                        dateRangeFilter === "custom" ? 
                          (customDateRange && customDateRange.start && customDateRange.end ? 
                            `${customDateRange.start} to ${customDateRange.end}` : 
                            "Custom Range") : 
                          "All Time"}
                    </Link>
                    <ul className="dropdown-menu dropdown-menu-end p-3">
                      <li>
                        <Link
                          to="#"
                          className={`dropdown-item rounded-1 ${dateRangeFilter === "all" ? "active" : ""}`}
                          onClick={(e) => {
                            e.preventDefault();
                            handleDateRangeChange("all");
                          }}
                        >
                          All Time
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="#"
                          className={`dropdown-item rounded-1 ${dateRangeFilter === "today" ? "active" : ""}`}
                          onClick={(e) => {
                            e.preventDefault();
                            handleDateRangeChange("today");
                          }}
                        >
                          Today
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="#"
                          className={`dropdown-item rounded-1 ${dateRangeFilter === "yesterday" ? "active" : ""}`}
                          onClick={(e) => {
                            e.preventDefault();
                            handleDateRangeChange("yesterday");
                          }}
                        >
                          Yesterday
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="#"
                          className={`dropdown-item rounded-1 ${dateRangeFilter === "last7days" ? "active" : ""}`}
                          onClick={(e) => {
                            e.preventDefault();
                            handleDateRangeChange("last7days");
                          }}
                        >
                          Last 7 Days
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="#"
                          className={`dropdown-item rounded-1 ${dateRangeFilter === "last30days" ? "active" : ""}`}
                          onClick={(e) => {
                            e.preventDefault();
                            handleDateRangeChange("last30days");
                          }}
                        >
                          Last 30 Days
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="#"
                          className={`dropdown-item rounded-1 ${dateRangeFilter === "thismonth" ? "active" : ""}`}
                          onClick={(e) => {
                            e.preventDefault();
                            handleDateRangeChange("thismonth");
                          }}
                        >
                          This Month
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="#"
                          className={`dropdown-item rounded-1 ${dateRangeFilter === "lastmonth" ? "active" : ""}`}
                          onClick={(e) => {
                            e.preventDefault();
                            handleDateRangeChange("lastmonth");
                          }}
                        >
                          Last Month
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="#"
                          className={`dropdown-item rounded-1 ${dateRangeFilter === "thisyear" ? "active" : ""}`}
                          onClick={(e) => {
                            e.preventDefault();
                            handleDateRangeChange("thisyear");
                          }}
                        >
                          This Year
                        </Link>
                      </li>
                       <li><hr className="dropdown-divider" /></li>
                       <li>
                         <Link
                           to="#"
                           className={`dropdown-item rounded-1 ${dateRangeFilter === "custom" ? "active" : ""}`}
                           onClick={(e) => {
                             e.preventDefault();
                             handleCustomRangeClick();
                           }}
                         >
                           Custom Range
                        </Link>
                      </li>
                    </ul>
                   </div>
                   {showCustomRange && (
                     <div className="custom-range-picker p-2 border rounded bg-light me-3 d-inline-block">
                       <div className="d-flex align-items-center gap-2">
                         <span className="small text-muted">Select Range:</span>
                         <RangePicker
                           size="small"
                           format="DD-MM-YYYY"
                           placeholder={['Start Date', 'End Date']}
                           style={{ width: 200 }}
                           value={customDateRange ? [
                             dayjs(customDateRange.start), 
                             dayjs(customDateRange.end)
                           ] : null}
                           onChange={handleCustomDateRangeChange}
                         />
                         <button 
                           className="btn btn-sm btn-outline-secondary"
                           onClick={() => {
                             setShowCustomRange(false);
                             setCustomDateRange(null);
                             setDateRangeFilter("all");
                           }}
                         >
                           ×
                         </button>
                       </div>
                     </div>
                   )}
                  <div className="input-icon position-relative w-120 me-2 d-flex align-items-center">
                    <span className="input-icon-addon">
                      <i className="ti ti-calendar" />
                    </span>
                    <DatePicker
                      className="form-control datetimepicker"
                      format="DD-MM-YYYY"
                      placeholder="Due Date"
                      value={dueDateFilter ? dayjs(dueDateFilter) : null}
                      onChange={(date: any) => {
                        if (date) {
                          // Convert to YYYY-MM-DD format for filtering
                          const formattedDate = date.format('YYYY-MM-DD');
                          handleDueDateChange(formattedDate);
                        } else {
                          handleDueDateChange(null);
                        }
                      }}
                    />
                    {dueDateFilter && (
                      <button
                        type="button"
                        className="btn btn-sm btn-light border-0 ms-2 d-flex align-items-center justify-content-center"
                        onClick={() => handleDueDateChange(null)}
                        title="Clear due date filter"
                        style={{ 
                          fontSize: '14px', 
                          width: '28px', 
                          height: '28px', 
                          padding: '0', 
                          lineHeight: '1',
                          borderRadius: '50%',
                          backgroundColor: '#f8f9fa',
                          border: '1px solid #dee2e6',
                          color: '#6c757d',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}
                        onMouseEnter={(e) => {
                          const target = e.target as HTMLButtonElement;
                          target.style.backgroundColor = '#e9ecef';
                          target.style.color = '#495057';
                          target.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          const target = e.target as HTMLButtonElement;
                          target.style.backgroundColor = '#f8f9fa';
                          target.style.color = '#6c757d';
                          target.style.transform = 'scale(1)';
                        }}
                      >
                        <i className="ti ti-x" style={{ fontSize: '12px' }}></i>
                      </button>
                    )}
                  </div>
                  <div className="dropdown me-2">
                    <Link
                      to="#"
                      className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                      data-bs-toggle="dropdown"
                    >
                      {selectedTag === "all" ? "Tags" : selectedTag}
                    </Link>
                    <ul className="dropdown-menu dropdown-menu-end p-3">
                      <li>
                        <Link
                          to="#"
                          className={`dropdown-item rounded-1 ${selectedTag === "all" ? "active" : ""}`}
                          onClick={(e) => {
                            e.preventDefault();
                            handleTagChange("all");
                          }}
                        >
                          All Tags
                        </Link>
                      </li>
                      {availableTags.map((tag) => (
                        <li key={tag}>
                        <Link
                          to="#"
                            className={`dropdown-item rounded-1 ${selectedTag === tag ? "active" : ""}`}
                            onClick={(e) => {
                              e.preventDefault();
                              handleTagChange(tag);
                            }}
                          >
                            {tag}
                        </Link>
                      </li>
                      ))}
                    </ul>
                  </div>
                  <div className="dropdown me-2">
                    <Link
                      to="#"
                      className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                      data-bs-toggle="dropdown"
                    >
                      {selectedAssignee === "all" ? "Assignee" : selectedAssignee}
                    </Link>
                    <ul className="dropdown-menu dropdown-menu-end p-3">
                      <li>
                        <Link
                          to="#"
                          className={`dropdown-item rounded-1 ${selectedAssignee === "all" ? "active" : ""}`}
                          onClick={(e) => {
                            e.preventDefault();
                            handleAssigneeChange("all");
                          }}
                        >
                          All Assignees
                        </Link>
                      </li>
                      {availableAssignees.map((assignee) => (
                        <li key={assignee}>
                        <Link
                          to="#"
                            className={`dropdown-item rounded-1 ${selectedAssignee === assignee ? "active" : ""}`}
                            onClick={(e) => {
                              e.preventDefault();
                              handleAssigneeChange(assignee);
                            }}
                          >
                            {assignee}
                        </Link>
                      </li>
                      ))}
                    </ul>
                  </div>
                  <div className="dropdown me-2">
                    <Link
                      to="#"
                      className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                      data-bs-toggle="dropdown"
                    >
                      {selectedStatus === "all" ? "Select Status" : selectedStatus}
                    </Link>
                    <ul className="dropdown-menu dropdown-menu-end p-3">
                      <li>
                        <Link
                          to="#"
                          className={`dropdown-item rounded-1 ${selectedStatus === "all" ? "active" : ""}`}
                          onClick={(e) => {
                            e.preventDefault();
                            handleStatusChange("all");
                          }}
                        >
                          All Status
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="#"
                          className={`dropdown-item rounded-1 ${selectedStatus === "completed" ? "active" : ""}`}
                          onClick={(e) => {
                            e.preventDefault();
                            handleStatusChange("completed");
                          }}
                        >
                          Completed
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="#"
                          className={`dropdown-item rounded-1 ${selectedStatus === "pending" ? "active" : ""}`}
                          onClick={(e) => {
                            e.preventDefault();
                            handleStatusChange("pending");
                          }}
                        >
                          Pending
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="#"
                          className={`dropdown-item rounded-1 ${selectedStatus === "inprogress" ? "active" : ""}`}
                          onClick={(e) => {
                            e.preventDefault();
                            handleStatusChange("inprogress");
                          }}
                        >
                          Inprogress
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="#"
                          className={`dropdown-item rounded-1 ${selectedStatus === "onhold" ? "active" : ""}`}
                          onClick={(e) => {
                            e.preventDefault();
                            handleStatusChange("onhold");
                          }}
                        >
                          Onhold
                        </Link>
                      </li>
                    </ul>
                  </div>
                  <div className="dropdown">
                    <Link
                      to="#"
                      className="dropdown-toggle btn btn-white d-inline-flex align-items-center fs-12"
                      data-bs-toggle="dropdown"
                    >
                      <span className="fs-12 d-inline-flex me-1">Sort By : </span>
                      {sortBy === "last7days" ? "Last 7 Days" : 
                       sortBy === "last1month" ? "Last 1 month" : 
                       sortBy === "last1year" ? "Last 1 year" : "Last 7 Days"}
                    </Link>
                    <ul className="dropdown-menu dropdown-menu-end p-3">
                      <li>
                        <Link
                          to="#"
                          className={`dropdown-item rounded-1 ${sortBy === "last7days" ? "active" : ""}`}
                          onClick={(e) => {
                            e.preventDefault();
                            handleSortChange("last7days");
                          }}
                        >
                          Last 7 Days
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="#"
                          className={`dropdown-item rounded-1 ${sortBy === "last1month" ? "active" : ""}`}
                          onClick={(e) => {
                            e.preventDefault();
                            handleSortChange("last1month");
                          }}
                        >
                          Last 1 month
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="#"
                          className={`dropdown-item rounded-1 ${sortBy === "last1year" ? "active" : ""}`}
                          onClick={(e) => {
                            e.preventDefault();
                            handleSortChange("last1year");
                          }}
                        >
                          Last 1 year
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="card-body p-0">
                {/* Student List */}
                <div className="custom-datatable-filter table-responsive">
                  <table className="table datatable">
                    <thead className="thead-light">
                      <tr>
                        <th className="no-sort">
                          <div className="form-check form-check-md">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="select-all"
                            />
                          </div>
                        </th>
                        <th>Company Name</th>
                        <th>Tags</th>
                        <th>Assignee</th>
                        <th>Created On</th>
                        <th>Progress</th>
                        <th>Due Date</th>
                        <th>Status</th>
                        <th className="no-sort">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={9} className="text-center py-4">
                            <div className="spinner-border" role="status">
                              <span className="visually-hidden">Loading...</span>
                          </div>
                        </td>
                      </tr>
                      ) : getFilteredTodos().length === 0 ? (
                        <tr>
                          <td colSpan={9} className="text-center py-4 text-muted">
                            No todos found.
                        </td>
                      </tr>
                      ) : (
                        getFilteredTodos().map((todo: Todo, index: number) => {
                          const progressPercentage = getProgressPercentage(todo);
                          return (
                            <tr key={todo._id}>
                        <td>
                          <div className="d-flex align-items-center">
                            <div className="form-check form-check-md">
                                    <input 
                                      className="form-check-input" 
                                      type="checkbox" 
                                      checked={todo.completed}
                                      onChange={() => toggleTodo(todo._id, todo.completed)}
                                    />
                            </div>
                            <span className="mx-2 d-flex align-items-center rating-select">
                                    <i className={`ti ti-star${todo.completed ? '-filled filled' : ''}`} />
                            </span>
                            <span className="d-flex align-items-center">
                                    <i className={`ti ti-square-rounded ${getPriorityColor(todo.priority)} me-2`} />
                            </span>
                          </div>
                        </td>
                        <td>
                          <p className="fw-medium text-dark">
                                  {todo.title}
                          </p>
                        </td>
                        <td>
                                {todo.tag && (
                                  <span className={`badge ${getTagBadgeClass(todo.tag)}`}>
                                    {todo.tag}
                            </span>
                                )}
                        </td>
                        <td>
                          <div className="avatar-list-stacked avatar-group-sm">
                            <span className="avatar avatar-rounded">
                              <ImageWithBasePath
                                className="border border-white"
                                src="assets/img/profiles/avatar-19.jpg"
                                alt="img"
                              />
                            </span>
                          </div>
                        </td>
                              <td>{formatDate(todo.createdAt)}</td>
                        <td>
                                <span className="d-block mb-1">Progress : {progressPercentage}%</span>
                          <div
                            className="progress progress-xs flex-grow-1 mb-2"
                            style={{ width: 190 }}
                          >
                            <div
                                    className={`progress-bar ${getProgressBarColor(progressPercentage)} rounded`}
                              role="progressbar"
                                    style={{ width: `${progressPercentage}%` }}
                                    aria-valuenow={progressPercentage}
                              aria-valuemin={0}
                              aria-valuemax={100}
                            />
                          </div>
                        </td>
                              <td>{todo.dueDate ? formatDate(todo.dueDate) : '-'}</td>
                        <td>
                                <span className={`${getStatusBadgeClass(todo.completed)}`}>
                            <i className="ti ti-circle-filled fs-5 me-1" />
                                  {todo.completed ? 'Completed' : 'Pending'}
                          </span>
                        </td>
                        <td>
                          <div className="d-flex align-items-center">
                            <Link
                              to="#"
                              className="btn btn-sm btn-icon"
                              data-bs-toggle="modal"
                              data-bs-target="#view-note-units"
                              onClick={() => handleViewClick(todo)}
                              title="View todo"
                            >
                              <i className="ti ti-eye" />
                            </Link>
                            <Link
                              to="#"
                              className="btn btn-sm btn-icon"
                              data-bs-toggle="modal"
                              data-bs-target="#edit-note-units"
                              onClick={() => handleEditClick(todo)}
                              title="Edit todo"
                            >
                              <i className="ti ti-edit" />
                            </Link>
                            <button
                              type="button"
                              className="btn btn-sm btn-icon"
                              onClick={() => handleDeleteClick(todo._id)}
                              title="Delete todo"
                            >
                              <i className="ti ti-trash" />
                            </button>
                          </div>
                        </td>
                      </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                {/* /Student List */}
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
        {/* /Page Wrapper */}
      </>

      <TodoModal 
        onTodoAdded={handleTodoRefresh}
        selectedTodoToDelete={selectedTodoToDelete}
        onDeleteTodo={handleDeleteTodo}
        selectedTodoToEdit={selectedTodoToEdit}
        onTodoUpdated={handleTodoRefresh}
        selectedTodoToView={selectedTodoToView}
      />
    </>
  );
};

export default TodoList;