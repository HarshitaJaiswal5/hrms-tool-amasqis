import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import Select from "react-select";
import ImageWithBasePath from "../common/imageWithBasePath";
import CommonSelect from "../common/commonSelect";
import CommonTextEditor from "../common/textEditor";
import { useSocket } from "../../SocketContext";
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

interface TodoModalProps {
  onTodoAdded?: () => void;
  selectedTodoToDelete?: string | null;
  onDeleteTodo?: (todoId: string) => void;
  selectedTodoToEdit?: Todo | null;
  onTodoUpdated?: () => void;
  selectedTodoToView?: Todo | null;
}

const TodoModal: React.FC<TodoModalProps> = ({ onTodoAdded, selectedTodoToDelete, onDeleteTodo, selectedTodoToEdit, onTodoUpdated, selectedTodoToView }) => {
  const socket = useSocket() as Socket | null;
  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [tags, setTags] = useState([
    { value: "Internal", label: "Internal" },
    { value: "Projects", label: "Projects" },
    { value: "Meetings", label: "Meetings" },
    { value: "Reminder", label: "Reminder" },
    { value: "Personal", label: "Personal" },
  ]);
  const [assignees, setAssignees] = useState([
    { value: "Self", label: "Self" },
    { value: "Team", label: "Team" },
    { value: "Manager", label: "Manager" },
  ]);
  const [formData, setFormData] = useState({
    title: "",
    tag: "Personal", // Set default tag
    priority: "Medium", // Set default priority
    description: "",
    assignee: "Self", // Set default assignee
    status: "Pending",
    dueDate: ""
  });

  const statusChoose = [
    { value: "Pending", label: "Pending" },
    { value: "In Progress", label: "In Progress" },
    { value: "Completed", label: "Completed" },
    { value: "On Hold", label: "On Hold" },
  ];

  const priorityOptions = [
    { value: "High", label: "High" },
    { value: "Medium", label: "Medium" },
    { value: "Low", label: "Low" },
  ];



  useEffect(() => {
    if (!socket) return;

    const handleTagsResponse = (response: any) => {
      console.log("Tags response received:", response);
      if (response.done) {
        setTags(response.data);
        console.log("Tags updated:", response.data);
      } else {
        console.error("Failed to fetch tags:", response.error);
      }
    };

    const handleAssigneesResponse = (response: any) => {
      console.log("Assignees response received:", response);
      if (response.done) {
        setAssignees(response.data);
        console.log("Assignees updated:", response.data);
      } else {
        console.error("Failed to fetch assignees:", response.error);
      }
    };

    // Add event listeners
    socket.on("admin/dashboard/get-todo-tags-response", handleTagsResponse);
    socket.on("admin/dashboard/get-todo-assignees-response", handleAssigneesResponse);

    // Request initial data
    console.log("Requesting tags and assignees from backend");
    socket.emit("admin/dashboard/get-todo-tags");
    socket.emit("admin/dashboard/get-todo-assignees");

    // Cleanup event listeners
    return () => {
      if (socket) {
        socket.off("admin/dashboard/get-todo-tags-response", handleTagsResponse);
        socket.off("admin/dashboard/get-todo-assignees-response", handleAssigneesResponse);
      }
    };
  }, [socket]);

  // Populate form when editing
  useEffect(() => {
    if (selectedTodoToEdit) {
      setIsEditMode(true);
      setFormData({
        title: selectedTodoToEdit.title || "",
        tag: selectedTodoToEdit.tag || "Personal",
        priority: selectedTodoToEdit.priority || "Medium",
        description: selectedTodoToEdit.description || "",
        assignee: selectedTodoToEdit.assignedTo || "Self",
        status: selectedTodoToEdit.completed ? "Completed" : "Pending",
        dueDate: selectedTodoToEdit.dueDate ? new Date(selectedTodoToEdit.dueDate).toISOString().split('T')[0] : ""
      });
    } else {
      setIsEditMode(false);
      resetForm();
    }
  }, [selectedTodoToEdit]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (field: string, selectedOption: any) => {
    console.log(`Select change - Field: ${field}, Selected:`, selectedOption);
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: selectedOption ? selectedOption.value : ''
      };
      console.log(`Updated form data:`, newData);
      return newData;
    });
  };

  const handleDescriptionChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      description: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert('Please enter a todo title');
      return;
    }

    if (!socket) {
      alert('No connection available. Please refresh the page.');
      return;
    }

    setIsLoading(true);

    try {
      console.log("Form data before submission:", formData);
      
      if (isEditMode && selectedTodoToEdit) {
        // Handle edit
        const updateData = {
          id: selectedTodoToEdit._id,
          title: formData.title,
          tag: formData.tag || 'Personal',
          priority: (formData.priority || 'Medium').toLowerCase(),
          description: formData.description || '',
          assignedTo: formData.assignee || 'Self',
          completed: formData.status === 'Completed',
          dueDate: formData.dueDate ? new Date(formData.dueDate) : null
        };
        console.log("Todo update data being sent:", updateData);

        const handleResponse = (response: any) => {
          console.log("Update todo response received:", response);
          setIsLoading(false);
          if (response.done) {
            console.log("Todo updated successfully");
            resetForm();
            closeModal('edit-note-units');
            if (onTodoUpdated) {
              onTodoUpdated();
            }
          } else {
            console.error("Failed to update todo:", response.error);
            alert('Failed to update todo: ' + response.error);
          }
          socket.off("admin/dashboard/update-todo-response", handleResponse);
        };

        socket.on("admin/dashboard/update-todo-response", handleResponse);
        socket.emit("admin/dashboard/update-todo", updateData);

        // Add timeout
        setTimeout(() => {
          if (isLoading) {
            console.error("Update todo request timed out");
            setIsLoading(false);
            alert('Request timed out. Please try again.');
            socket.off("admin/dashboard/update-todo-response", handleResponse);
          }
        }, 10000);
      } else {
        // Handle add
        const todoData = {
          title: formData.title,
          tag: formData.tag || 'Personal',
          priority: (formData.priority || 'Medium').toLowerCase(),
          description: formData.description || '',
          assignee: formData.assignee || 'Self',
          status: formData.status || 'Pending',
          dueDate: formData.dueDate ? new Date(formData.dueDate) : null
        };
        console.log("Todo data being sent:", todoData);

        const handleResponse = (response: any) => {
          console.log("Add todo response received:", response);
          setIsLoading(false);
          if (response.done) {
            console.log("Todo added successfully");
            resetForm();
            closeModal('add_todo');
            if (onTodoAdded) {
              onTodoAdded();
            }
          } else {
            console.error("Failed to add todo:", response.error);
            alert('Failed to add todo: ' + response.error);
          }
          socket.off("admin/dashboard/add-todo-response", handleResponse);
        };

        socket.on("admin/dashboard/add-todo-response", handleResponse);
        socket.emit("admin/dashboard/add-todo", todoData);

        // Add timeout
        setTimeout(() => {
          if (isLoading) {
            console.error("Add todo request timed out");
            setIsLoading(false);
            alert('Request timed out. Please try again.');
            socket.off("admin/dashboard/add-todo-response", handleResponse);
          }
        }, 10000);
      }
    } catch (error) {
      console.error('Error submitting todo:', error);
      alert('An error occurred while submitting the todo');
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      tag: "",
      priority: "",
      description: "",
      assignee: "",
      status: "Pending",
      dueDate: ""
    });
  };

  const closeModal = (modalId: string) => {
    const modal = document.getElementById(modalId);
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
        const closeButton = modal.querySelector('[data-bs-dismiss="modal"]') as HTMLElement;
        if (closeButton) {
          closeButton.click();
        } else {
          modal.style.display = 'none';
          modal.setAttribute('aria-hidden', 'true');
          modal.classList.remove('show');
          modal.removeAttribute('aria-modal');
          const backdrops = document.querySelectorAll('.modal-backdrop');
          backdrops.forEach(backdrop => backdrop.remove());
          document.body.classList.remove('modal-open');
          document.body.style.overflow = '';
          document.body.style.paddingRight = '';
        }
      }
    }
  };

  const cleanupModal = useCallback(() => {
    const modal = document.getElementById('add_todo');
    if (modal) {
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
      modal.classList.remove('show');
    }

    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => backdrop.remove());
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    document.body.style.marginRight = '';
    resetForm();
  }, []);

  // Handle modal cleanup when closed by Bootstrap
  useEffect(() => {
    const modal = document.getElementById('add_todo');
    if (modal) {
      const handleModalHidden = () => {
        setTimeout(() => {
          cleanupModal();
        }, 100);
      };

      modal.addEventListener('hidden.bs.modal', handleModalHidden);

      return () => {
        modal.removeEventListener('hidden.bs.modal', handleModalHidden);
      };
    }
  }, [cleanupModal]);

  return (
    <div>
      {/* Add Todo */}
      <div className="modal fade" id="add_todo" tabIndex={-1} aria-labelledby="addTodoModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Add New Todo</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
                onClick={cleanupModal}
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="row">
                  <div className="col-12">
                    <div className="mb-3">
                      <label className="form-label">Todo Title *</label>
                      <input
                        type="text"
                        className="form-control"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        placeholder="Enter todo title"
                        required
                      />
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="mb-3">
                      <label className="form-label">Tag</label>
                      <CommonSelect
                        className="select"
                        options={tags}
                        defaultValue={tags.find(option => option.value === formData.tag)}
                        onChange={(selectedOption) => handleSelectChange('tag', selectedOption)}
                      />
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="mb-3">
                      <label className="form-label">Priority</label>
                      <CommonSelect
                        className="select"
                        options={priorityOptions}
                        defaultValue={priorityOptions.find(option => option.value === formData.priority)}
                        onChange={(selectedOption) => handleSelectChange('priority', selectedOption)}
                      />
                    </div>
                  </div>
                  <div className="col-lg-12">
                    <div className="mb-3">
                      <label className="form-label">Description</label>
                      <CommonTextEditor
                        defaultValue={formData.description}
                        onChange={(value) => handleDescriptionChange(value)}
                      />
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="mb-3">
                      <label className="form-label">Assignee</label>
                      <CommonSelect
                        className="select"
                        options={assignees}
                        defaultValue={assignees.find(option => option.value === formData.assignee)}
                        onChange={(selectedOption) => handleSelectChange('assignee', selectedOption)}
                      />
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="mb-3">
                      <label className="form-label">Due Date</label>
                      <div className="input-groupicon calender-input">
                        <input
                          type="date"
                          className="form-control"
                          name="dueDate"
                          value={formData.dueDate || ''}
                          onChange={handleInputChange}
                          placeholder="Select date"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="mb-0">
                      <label className="form-label">Status</label>
                      <CommonSelect
                        className="select"
                        options={statusChoose}
                        defaultValue={statusChoose.find(option => option.value === formData.status)}
                        onChange={(selectedOption) => handleSelectChange('status', selectedOption)}
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
                  onClick={cleanupModal}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Adding...
                    </>
                  ) : (
                    'Add Todo'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Add Todo */}

      {/* Edit Note */}
      <div className="modal fade" id="edit-note-units" tabIndex={-1} aria-labelledby="editTodoModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered custom-modal-two">
          <div className="modal-content">
            <div className="page-wrapper-new p-0">
              <div className="content">
                <div className="modal-header border-0 custom-modal-header">
                  <div className="page-title">
                    <h4>Edit Todo</h4>
                  </div>
                  <div className=" edit-note-head d-flex align-items-center">
                    <button
                      type="button"
                      className="btn-close custom-btn-close"
                      data-bs-dismiss="modal"
                      aria-label="Close"
                    >
                      <i className="ti ti-x"></i>
                    </button>
                  </div>
                </div>
                <div className="modal-body custom-modal-body">
                  <form onSubmit={handleSubmit}>
                    <div className="row">
                      <div className="col-12">
                        <div className="input-blocks">
                          <label className="form-label">Todo Title *</label>
                          <input
                            type="text"
                            className="form-control"
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            placeholder="Enter todo title"
                            required
                          />
                        </div>
                      </div>
                      <div className="col-12">
                        <div className="input-blocks">
                          <label className="form-label">Assignee</label>
                          <CommonSelect
                            className="select"
                            options={assignees}
                            defaultValue={assignees.find(option => option.value === formData.assignee)}
                            onChange={(selectedOption) => handleSelectChange('assignee', selectedOption)}
                          />
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="input-blocks">
                          <label className="form-label">Tag</label>
                          <CommonSelect
                            className="select"
                            options={tags}
                            defaultValue={tags.find(option => option.value === formData.tag)}
                            onChange={(selectedOption) => handleSelectChange('tag', selectedOption)}
                          />
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="input-blocks">
                          <label className="form-label">Priority</label>
                          <CommonSelect
                            className="select"
                            options={priorityOptions}
                            defaultValue={priorityOptions.find(option => option.value === formData.priority)}
                            onChange={(selectedOption) => handleSelectChange('priority', selectedOption)}
                          />
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="input-blocks todo-calendar">
                          <label className="form-label">Due Date</label>
                          <div className="input-groupicon calender-input">
                            <input
                              type="date"
                              className="form-control"
                              name="dueDate"
                              value={formData.dueDate || ''}
                              onChange={handleInputChange}
                              placeholder="Select date"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="input-blocks">
                          <label className="form-label">Status</label>
                          <CommonSelect
                            className="select"
                            options={statusChoose}
                            defaultValue={statusChoose.find(option => option.value === formData.status)}
                            onChange={(selectedOption) => handleSelectChange('status', selectedOption)}
                          />
                        </div>
                      </div>
                      <div className="col-lg-12">
                        <div className="input-blocks summer-description-box notes-summernote">
                          <label className="form-label">Description</label>
                          <CommonTextEditor
                            defaultValue={formData.description}
                            onChange={(value) => handleDescriptionChange(value)}
                          />
                          <p className="text-muted mt-1">Maximum 500 characters</p>
                        </div>
                      </div>
                    </div>
                    <div className="modal-footer-btn">
                      <button
                        type="button"
                        className="btn btn-cancel me-2"
                        data-bs-dismiss="modal"
                        disabled={isLoading}
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="btn btn-submit"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            {isEditMode ? 'Updating...' : 'Adding...'}
                          </>
                        ) : (
                          isEditMode ? 'Update Todo' : 'Add Todo'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* /Edit Note */}

      {/* Delete Note */}
      <div className="modal fade" id="delete_modal" tabIndex={-1} aria-labelledby="deleteTodoModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="page-wrapper-new p-0">
              <div className="content">
                <div className="delete-popup">
                  <div className="delete-image text-center mx-auto">
                    <ImageWithBasePath
                      src="./assets/img/icons/close-circle.png"
                      alt="Img"
                      className="img-fluid"
                    />
                  </div>
                  <div className="delete-heads">
                    <h4>Are You Sure?</h4>
                    <p>
                      Do you really want to delete this todo item? This process
                      cannot be undone.
                    </p>
                  </div>
                  <div className="modal-footer-btn delete-footer">
                    <Link
                      to="#"
                      className="btn btn-cancel me-2"
                      data-bs-dismiss="modal"
                    >
                      Cancel
                    </Link>
                    <Link 
                      to="#" 
                      className="btn btn-submit"
                      data-bs-dismiss="modal"
                      onClick={(e) => {
                        e.preventDefault();
                        console.log("Delete button in modal clicked");
                        console.log("selectedTodoToDelete:", selectedTodoToDelete);
                        console.log("onDeleteTodo function:", !!onDeleteTodo);
                        if (selectedTodoToDelete && onDeleteTodo) {
                          console.log("Calling onDeleteTodo with:", selectedTodoToDelete);
                          onDeleteTodo(selectedTodoToDelete);
                        } else {
                          console.error("Missing selectedTodoToDelete or onDeleteTodo function");
                        }
                      }}
                    >
                      Delete
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* /Delete Note */}

      {/* View Note */}
      <div className="modal fade" id="view-note-units" tabIndex={-1} aria-labelledby="viewTodoModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="page-wrapper-new p-0">
              <div className="content">
                <div className="modal-header border-0 custom-modal-header">
                  <div className="page-title edit-page-title">
                    <h4>Todo Details</h4>
                    <p>View todo information</p>
                  </div>
                  <div className=" edit-noted-head d-flex align-items-center">
                    <Link to="#">
                      <span>
                        <i data-feather="trash-2" />
                      </span>
                    </Link>
                    <Link to="#" className="me-2">
                      <span>
                        <i data-feather="star" />
                      </span>
                    </Link>
                    <button
                      type="button"
                      className="btn-close custom-btn-close"
                      data-bs-dismiss="modal"
                      aria-label="Close"
                    >
                      <i className="ti ti-x"></i>
                    </button>
                  </div>
                </div>
                <div className="modal-body custom-modal-body">
                  <div className="row">
                    <div className="col-12">
                      <div className="edit-head-view">
                        <h6>{selectedTodoToView?.title || 'Todo Title'}</h6>
                        <p>
                          {selectedTodoToView?.description || 'No description available'}
                        </p>
                        <div className="d-flex flex-wrap gap-2 mb-3">
                          <span className={`badge ${selectedTodoToView?.priority?.toLowerCase() === 'high' ? 'badge-danger' : selectedTodoToView?.priority?.toLowerCase() === 'medium' ? 'badge-warning' : 'badge-success'}`}>
                            <i className="fas fa-circle" /> {selectedTodoToView?.priority || 'Medium'} Priority
                          </span>
                          {selectedTodoToView?.tag && (
                            <span className="badge badge-info">
                              <i className="ti ti-tag" /> {selectedTodoToView.tag}
                            </span>
                          )}
                          <span className={`badge ${selectedTodoToView?.completed ? 'badge-success' : 'badge-warning'}`}>
                            <i className="ti ti-check" /> {selectedTodoToView?.completed ? 'Completed' : 'Pending'}
                          </span>
                        </div>
                        <div className="todo-details">
                          {selectedTodoToView?.assignedTo && (
                            <p className="mb-2">
                              <strong>Assigned to:</strong> {selectedTodoToView.assignedTo}
                            </p>
                          )}
                          {selectedTodoToView?.dueDate && (
                            <p className="mb-2">
                              <strong>Due Date:</strong> {new Date(selectedTodoToView.dueDate).toLocaleDateString()}
                            </p>
                          )}
                          <p className="mb-2">
                            <strong>Created:</strong> {selectedTodoToView?.createdAt ? new Date(selectedTodoToView.createdAt).toLocaleDateString() : 'N/A'}
                          </p>
                          <p className="mb-2">
                            <strong>Last Updated:</strong> {selectedTodoToView?.updatedAt ? new Date(selectedTodoToView.updatedAt).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="modal-footer-btn edit-footer-menu">
                        <Link
                          to="#"
                          className="btn btn-cancel me-2"
                          data-bs-dismiss="modal"
                        >
                          Close
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* /View Note */}
    </div>
  );
};

export default TodoModal;
