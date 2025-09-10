import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import TodoModal from "../../../core/modals/todoModal";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";
import { route } from "../../../core/common/selectoption/selectoption";
import { all_routes } from "../../router/all_routes";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import CollapseHeader from "../../../core/common/collapse-header/collapse-header";
import { useSocket } from "../../../SocketContext";
import { Socket } from "socket.io-client";

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

interface TodoStats {
  total: number;
  completed: number;
  pending: number;
  byPriority: {
    high: number;
    medium: number;
    low: number;
  };
}



const Todo = () => {
  const socket = useSocket() as Socket | null;
  const [todos, setTodos] = useState<Todo[]>([]);
  const [todoStats, setTodoStats] = useState<TodoStats>({
    total: 0,
    completed: 0,
    pending: 0,
    byPriority: { high: 0, medium: 0, low: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedTag, setSelectedTag] = useState("all");
  const [sortBy, setSortBy] = useState("createdDate");
  const [dueDateFilter, setDueDateFilter] = useState<string | null>(null);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
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

  // Fetch todos and statistics
  useEffect(() => {
    if (socket) {
      // Fetch todos
      (socket as any).emit("admin/dashboard/get-todos", { filter: activeFilter });
      (socket as any).on("admin/dashboard/get-todos-response", (response: any) => {
    if (response.done) {
          const todosData = response.data || [];
          setTodos(todosData);
          
          // Extract unique tags
          const tags = Array.from(new Set(todosData.map((todo: Todo) => todo.tag).filter(Boolean))) as string[];
          setAvailableTags(tags);
    }
    setLoading(false);
      });

      // Fetch statistics
      (socket as any).emit("admin/dashboard/get-todo-statistics", { filter: activeFilter });
      (socket as any).on("admin/dashboard/get-todo-statistics-response", (response: any) => {
        console.log("Statistics response:", response);
    if (response.done) {
          setTodoStats(response.data || {
            total: 0,
            completed: 0,
            pending: 0,
            byPriority: { high: 0, medium: 0, low: 0 }
          });
    } else {
          console.error("Statistics error:", response.error);
          // Set default stats on error
          setTodoStats({
            total: 0,
            completed: 0,
            pending: 0,
            byPriority: { high: 0, medium: 0, low: 0 }
          });
        }
      });

      // Listen for todo deletion success
      (socket as any).on("admin/dashboard/delete-todo-response", (response: any) => {
    if (response.done) {
          console.log("Todo deleted successfully");
          // Refresh the todo list and statistics after successful deletion
          (socket as any).emit("admin/dashboard/get-todos", { filter: activeFilter });
          (socket as any).emit("admin/dashboard/get-todo-statistics", { filter: activeFilter });
        } else {
          console.error("Delete failed:", response.error);
        }
      });

      return () => {
        (socket as any).off("admin/dashboard/get-todos-response");
        (socket as any).off("admin/dashboard/get-todo-statistics-response");
        (socket as any).off("admin/dashboard/delete-todo-response");
      };
    }
  }, [socket, activeFilter]);

  // Handle filter change
  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    setLoading(true);
  };

  // Handle tag filter change
  const handleTagChange = (tag: string) => {
    setSelectedTag(tag);
  };

  // Handle sort change
  const handleSortChange = (sort: string) => {
    setSortBy(sort);
  };

  // Handle due date filter change
  const handleDueDateChange = (date: string | null) => {
    setDueDateFilter(date);
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

  // Handle todo refresh
  const handleTodoRefresh = () => {
    if (socket) {
      socket.emit("admin/dashboard/get-todos", { filter: activeFilter });
      socket.emit("admin/dashboard/get-todo-statistics", { filter: activeFilter });
    }
  };

  // Get filtered todos based on current filters
  const getFilteredTodos = () => {
    return todos.filter(todo => {
      const tagMatch = selectedTag === "all" || todo.tag?.toLowerCase() === selectedTag.toLowerCase();
      const dueDateMatch = !dueDateFilter || (todo.dueDate && new Date(todo.dueDate).toDateString() === new Date(dueDateFilter).toDateString());
      
      return tagMatch && dueDateMatch;
    });
  };

  // Calculate statistics from filtered todos
  const calculateStats = () => {
    const filteredTodos = getFilteredTodos();
    const total = filteredTodos.length;
    const completed = filteredTodos.filter(todo => todo.completed).length;
    const pending = total - completed;
    
    const byPriority = {
      high: filteredTodos.filter(todo => todo.priority?.toLowerCase() === "high").length,
      medium: filteredTodos.filter(todo => todo.priority?.toLowerCase() === "medium").length,
      low: filteredTodos.filter(todo => todo.priority?.toLowerCase() === "low").length
    };

    return { total, completed, pending, byPriority };
  };

  // Get todos by priority with additional filtering and sorting
  const getTodosByPriority = (priority: string) => {
    let filteredTodos = todos.filter(todo => {
      const priorityMatch = todo.priority?.toLowerCase() === priority.toLowerCase();
      const tagMatch = selectedTag === "all" || todo.tag?.toLowerCase() === selectedTag.toLowerCase();
      const dueDateMatch = !dueDateFilter || (todo.dueDate && new Date(todo.dueDate).toDateString() === new Date(dueDateFilter).toDateString());
      
      return priorityMatch && tagMatch && dueDateMatch;
    });

    // Sort todos
    filteredTodos.sort((a, b) => {
      switch (sortBy) {
        case "priority":
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return (priorityOrder[b.priority?.toLowerCase() as keyof typeof priorityOrder] || 0) - 
                 (priorityOrder[a.priority?.toLowerCase() as keyof typeof priorityOrder] || 0);
        case "dueDate":
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case "createdDate":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return filteredTodos;
  };

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
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
                  <Link to={all_routes.TodoList} className="btn btn-icon btn-sm">
                    <i className="ti ti-list-tree" />
                  </Link>
                  <Link
                    to={all_routes.todo}
                    className="btn btn-icon btn-sm active bg-primary text-white"
                  >
                    <i className="ti ti-table" />
                  </Link>
                </div>
                <div className="">
                  <div className="input-icon-start position-relative">
                    <span className="input-icon-addon">
                      <i className="ti ti-search" />
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search Todo List"
                    />
                  </div>
                </div>
                <div className="ms-2 mb-0 head-icons">
                  <CollapseHeader />
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <div className="row gy-3 mb-3">
                  <div className="col-sm-4">
                    <div className="d-flex align-items-center">
                      <h4>Total Todo</h4>
                      <span className="badge badge-dark rounded-pill badge-xs ms-2">
                        {calculateStats().total}
                      </span>
                    </div>
                  </div>
                  <div className="col-sm-8">
                    <div className="d-flex align-items-center justify-content-end">
                      <p className="mb-0 me-3 pe-3 border-end fs-14">
                        Total Task : <span className="text-dark"> {calculateStats().total} </span>
                      </p>
                      <p className="mb-0 me-3 pe-3 border-end fs-14">
                        Pending : <span className="text-dark"> {calculateStats().pending} </span>
                      </p>
                      <p className="mb-0 fs-14">
                        Completed : <span className="text-dark"> {calculateStats().completed} </span>
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mb-3">
                  <button
                    className="btn bg-primary-transparent border-dashed border-primary w-100 text-start"
                    data-bs-toggle="modal"
                    data-bs-target="#add_todo"
                  >
                    <i className="ti ti-plus me-2" />
                    New task
                  </button>
                </div>
                <div className="row border-bottom mb-3">
                  <div className="col-lg-6">
                    <div className="d-flex align-items-center flex-wrap row-gap-3 mb-3">
                      <h6 className="me-2">Priority</h6>
                      <ul
                        className="nav nav-pills border d-inline-flex p-1 rounded bg-light todo-tabs"
                        id="pills-tab"
                        role="tablist"
                      >
                        <li className="nav-item" role="presentation">
                          <button
                            className={`nav-link btn btn-sm btn-icon py-3 d-flex align-items-center justify-content-center w-auto ${activeFilter === "all" ? "active" : ""}`}
                            onClick={() => handleFilterChange("all")}
                            type="button"
                            role="tab"
                            aria-selected={activeFilter === "all"}
                          >
                            All
                          </button>
                        </li>
                        <li className="nav-item" role="presentation">
                          <button
                            className={`nav-link btn btn-sm btn-icon py-3 d-flex align-items-center justify-content-center w-auto ${activeFilter === "high" ? "active" : ""}`}
                            onClick={() => handleFilterChange("high")}
                            type="button"
                            role="tab"
                            aria-selected={activeFilter === "high"}
                          >
                            High
                          </button>
                        </li>
                        <li className="nav-item" role="presentation">
                          <button
                            className={`nav-link btn btn-sm btn-icon py-3 d-flex align-items-center justify-content-center w-auto ${activeFilter === "medium" ? "active" : ""}`}
                            onClick={() => handleFilterChange("medium")}
                            type="button"
                            role="tab"
                            aria-selected={activeFilter === "medium"}
                          >
                            Medium
                          </button>
                        </li>
                        <li className="nav-item" role="presentation">
                          <button
                            className={`nav-link btn btn-sm btn-icon py-3 d-flex align-items-center justify-content-center w-auto ${activeFilter === "low" ? "active" : ""}`}
                            onClick={() => handleFilterChange("low")}
                            type="button"
                            role="tab"
                            aria-selected={activeFilter === "low"}
                          >
                            Low
                          </button>
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div className="col-lg-6">
                    <div className="d-flex align-items-center justify-content-lg-end flex-wrap row-gap-3 mb-3">
                      <div className="input-icon w-120 position-relative me-2 d-flex align-items-center">
                        <span className="input-icon-addon">
                          <i className="ti ti-calendar text-gray-9" />
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
                          {selectedTag === "all" ? "All Tags" : selectedTag}
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
                      <div className="d-flex align-items-center">
                        <span className="d-inline-flex me-2">Sort By : </span>
                        <div className="dropdown">
                          <Link
                            to="#"
                            className="dropdown-toggle btn btn-white d-inline-flex align-items-center border-0 bg-transparent p-0 text-dark"
                            data-bs-toggle="dropdown"
                          >
                            {sortBy === "createdDate" ? "Created Date" : 
                             sortBy === "priority" ? "Priority" : 
                             sortBy === "dueDate" ? "Due Date" : "Created Date"}
                          </Link>
                          <ul className="dropdown-menu dropdown-menu-end p-3">
                            <li>
                              <Link
                                to="#"
                                className={`dropdown-item rounded-1 ${sortBy === "createdDate" ? "active" : ""}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleSortChange("createdDate");
                                }}
                              >
                                Created Date
                              </Link>
                            </li>
                            <li>
                              <Link
                                to="#"
                                className={`dropdown-item rounded-1 ${sortBy === "priority" ? "active" : ""}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleSortChange("priority");
                                }}
                              >
                                Priority
                              </Link>
                            </li>
                            <li>
                              <Link
                                to="#"
                                className={`dropdown-item rounded-1 ${sortBy === "dueDate" ? "active" : ""}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleSortChange("dueDate");
                                }}
                              >
                                Due Date
                              </Link>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="tab-content" id="pills-tabContent">
                  <div
                    className="tab-pane fade show active"
                    id="pills-home"
                    role="tabpanel"
                  >
                    {loading ? (
                      <div className="text-center py-4">
                        <div className="spinner-border" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      </div>
                    ) : (
                    <div className="accordion todo-accordion" id="accordionExample">
                        {["High", "Medium", "Low"].map((priority, priorityIndex) => {
                          const priorityTodos = getTodosByPriority(priority.toLowerCase());
                          const priorityCount = priorityTodos.length;
                          
                          if (priorityCount === 0 && activeFilter !== "all") return null;
                          
                          return (
                            <div key={priority} className="accordion-item mb-3">
                        <div className="row align-items-center mb-3 row-gap-3">
                          <div className="col-lg-4 col-sm-6">
                                  <div className="accordion-header" id={`heading${priority}`}>
                              <div
                                className="accordion-button"
                                data-bs-toggle="collapse"
                                      data-bs-target={`#collapse${priority}`}
                                      aria-controls={`collapse${priority}`}
                              >
                                <div className="d-flex align-items-center w-100">
                                  <div className="me-2">
                                    <Link to="#">
                                      <span>
                                        <i className="fas fa-chevron-down" />
                                      </span>
                                    </Link>
                                  </div>
                                  <div className="d-flex align-items-center">
                                    <span>
                                            <i className={`ti ti-square-rounded ${getPriorityColor(priority)} me-2`} />
                                    </span>
                                          <h5 className="fw-semibold">{priority}</h5>
                                    <span className="badge bg-light rounded-pill ms-2">
                                            {priorityCount}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="col-lg-8 col-sm-6">
                            <div className="d-flex align-items-center justify-content-sm-end">
                              <Link
                                to="#"
                                className="btn btn-light me-2"
                                data-bs-toggle="modal"
                                data-bs-target="#add_todo"
                              >
                                <i className="ti ti-circle-plus me-2" />
                                Add New
                              </Link>
                              <Link to="#" className="btn btn-outline-light border">
                                See All <i className="ti ti-arrow-right ms-2" />
                              </Link>
                            </div>
                          </div>
                        </div>
                        <div
                                id={`collapse${priority}`}
                          className="accordion-collapse collapse show"
                                aria-labelledby={`heading${priority}`}
                          data-bs-parent="#accordionExample"
                        >
                          <div className="accordion-body">
                            <div className="list-group list-group-flush border-bottom pb-2">
                                    {priorityTodos.map((todo, todoIndex) => (
                                      <div key={todo._id} className="list-group-item list-item-hover shadow-sm rounded mb-2 p-3">
                                <div className="row align-items-center row-gap-3">
                                  <div className="col-lg-6 col-md-7">
                                            <div className={`todo-inbox-check d-flex align-items-center flex-wrap row-gap-3 ${todo.completed ? 'todo-strike-content' : ''}`}>
                                      <span className="me-2 d-flex align-items-center">
                                        <i className="ti ti-grid-dots text-dark" />
                                      </span>
                                      <div className="form-check form-check-md me-2">
                                        <input
                                          className="form-check-input"
                                          type="checkbox"
                                                  checked={todo.completed}
                                                  onChange={() => toggleTodo(todo._id, todo.completed)}
                                        />
                                      </div>
                                      <span className="me-2 d-flex align-items-center rating-select">
                                                <i className={`ti ti-star${todo.completed ? '-filled filled' : ''}`} />
                                      </span>
                                      <div className="strike-info">
                                        <h4 className="fs-14">
                                                  {todo.title}
                                        </h4>
                                      </div>
                                              {todo.dueDate && (
                                      <span className="badge bg-transparent-dark text-dark rounded-pill ms-2">
                                        <i className="ti ti-calendar me-1" />
                                                  {formatDate(todo.dueDate)}
                                      </span>
                                              )}
                                    </div>
                                  </div>
                                  <div className="col-lg-6 col-md-5">
                                    <div className="d-flex align-items-center justify-content-md-end flex-wrap row-gap-3">
                                              {todo.tag && (
                                                <span className={`badge ${getTagBadgeClass(todo.tag)} me-3`}>
                                                  {todo.tag}
                                      </span>
                                              )}
                                              <span className={`${getStatusBadgeClass(todo.completed)} me-3`}>
                                        <i className="fas fa-circle fs-6 me-1" />
                                                {todo.completed ? 'Completed' : 'Pending'}
                                      </span>
                                      <div className="d-flex align-items-center">
                                        <div className="avatar-list-stacked avatar-group-sm">
                                          <span className="avatar avatar-rounded">
                                            <ImageWithBasePath
                                              className="border border-white"
                                              src="assets/img/profiles/avatar-13.jpg"
                                              alt="img"
                                            />
                                          </span>
                                        </div>
                                        <div className="dropdown ms-2">
                                          <Link
                                            to="#"
                                            className="d-inline-flex align-items-center"
                                            data-bs-toggle="dropdown"
                                          >
                                            <i className="ti ti-dots-vertical" />
                                          </Link>
                                          <ul className="dropdown-menu dropdown-menu-end p-3">
                                            <li>
                                              <Link
                                                to="#"
                                                className="dropdown-item rounded-1"
                                                data-bs-toggle="modal"
                                                data-bs-target="#edit-note-units"
                                                onClick={() => handleEditClick(todo)}
                                              >
                                                <i className="ti ti-edit me-2" />
                                                Edit
                                              </Link>
                                            </li>
                                            <li>
                                              <button
                                                type="button"
                                                className="dropdown-item rounded-1 border-0 bg-transparent w-100 text-start"
                                                onClick={() => handleDeleteClick(todo._id)}
                                              >
                                                <i className="ti ti-trash me-2" />
                                                Delete
                                              </button>
                                            </li>
                                            <li>
                                              <Link
                                                to="#"
                                                className="dropdown-item rounded-1"
                                                data-bs-toggle="modal"
                                                data-bs-target="#view-note-units"
                                                onClick={() => setSelectedTodoToView(todo)}
                                              >
                                                <i className="ti ti-eye me-2" />
                                                View
                                              </Link>
                                            </li>
                                          </ul>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                                    ))}
                                    {priorityTodos.length === 0 && (
                                      <div className="text-center py-4 text-muted">
                                        No {priority.toLowerCase()} priority todos found.
                                      </div>
                                    )}
                                      </div>
                                    </div>
                                  </div>
                                        </div>
                          );
                        })}
                                        </div>
                    )}
                  </div>
                </div>
                <div className="text-center">
                  <Link to="#" className="btn btn-primary">
                    <i className="ti ti-loader me-2" />
                    Load More
                  </Link>
                </div>
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

export default Todo;