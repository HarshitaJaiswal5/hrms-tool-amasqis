import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Socket } from 'socket.io-client';
import { useSocket } from '../../../SocketContext';
import { all_routes } from '../../router/all_routes';
import CommonSelect from '../../../core/common/commonSelect';
import Table from "../../../core/common/dataTable/index";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";
import PredefinedDateRanges from '../../../core/common/datePicker';
import CollapseHeader from '../../../core/common/collapse-header/collapse-header';

interface User {
  _id: string;
  name: string;
  image_url: string;
  email: string;
  created_date: string;
  role: 'Employee' | 'Client';
  status: string;
}

type FormData = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  role: 'Employee' | 'Client';
};

const Users = () => {
  // --- STATE MANAGEMENT ---
  const socket = useSocket() as Socket | null;
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  const [filters, setFilters] = useState({
  dateRange: null,
  role: 'All',
  status: 'All',
  sortBy: 'recent',
});

  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    role: 'Employee',
  });
  
  const [passwordVisibility, setPasswordVisibility] = useState({
    password: false,
    confirmPassword: false,
  });
  
  // This is needed for the original Add User modal's dropdown
  const roleChoose = [
    { value: "Employee", label: "Employee" },
    { value: "Client", label: "Client" },
  ];
const handleFilterChange = (filterName: string, value: any) => {
  setFilters(prevFilters => ({ ...prevFilters, [filterName]: value }));
};
  // --- HANDLER FUNCTIONS ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prevState => ({ ...prevState, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    if (socket) {
      socket.emit('admin/users/create', formData);
    }
  };

  const togglePasswordVisibility = (field: "password" | "confirmPassword") => {
    setPasswordVisibility(prevState => ({ ...prevState, [field]: !prevState[field] }));
  };
  
  const handleEditClick = (user: User) => {
    setEditingUser(user);
  };

  const handleUpdateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (socket && editingUser) {
      socket.emit('admin/users/update', { 
        userId: editingUser._id, 
        updatedData: formData 
      });
    }
  };

  const handleDeleteClick = (userId: string) => {
    setUserToDelete(userId);
  };

  const confirmDelete = () => {
    if (socket && userToDelete) {
      socket.emit('admin/users/delete', { userId: userToDelete });
      setUserToDelete(null);
    }
  };

  // --- EFFECTS ---
  useEffect(() => {
  if (socket) {
    setLoading(true);
    socket.emit('admin/users/get', filters);
  }
}, [filters, socket]);


  useEffect(() => {
    if (!socket) return;

    socket.emit('admin/users/get');
    setLoading(true);

    const handleGetResponse = (response: { done: boolean; data: User[]; error?: string }) => {
      if (response.done) {
        setData(response.data);
      } else {
        setError(response.error || 'Failed to fetch users.');
      }
      setLoading(false);
    };

    const handleListUpdate = (response: { done: boolean; data: User[]; error?: string }) => {
      if (response.done) {
        setData(response.data);
      }
    };
    
    socket.on('admin/users/get-response', handleGetResponse);
    socket.on('admin/users/list-update', handleListUpdate);

    return () => {
      socket.off('admin/users/get-response', handleGetResponse);
      socket.off('admin/users/list-update', handleListUpdate);
    };
  }, [socket]);

  useEffect(() => {
    if (editingUser) {
      const nameParts = editingUser.name.split(' ');
      setFormData({
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: editingUser.email,
        role: editingUser.role,
        username: '', 
        phone: '',
        password: '',
        confirmPassword: '',
      });
    }
  }, [editingUser]);
  
  // --- TABLE COLUMNS ---
  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      render: (text: string, record: User) => (
        <div className="d-flex align-items-center">
          <Link to="#" className="avatar avatar-md avatar-rounded">
            <ImageWithBasePath src={record.image_url} alt="img" />
          </Link>
          <div className="ms-2">
            <h6 className="fw-medium">
              <Link to="#">{text}</Link>
            </h6>
          </div>
        </div>
      ),
      sorter: (a: User, b: User) => a.name.localeCompare(b.name),
    },
    {
      title: "Email",
      dataIndex: "email",
      sorter: (a: User, b: User) => a.email.localeCompare(b.email),
    },
    {
      title: "Created Date",
      dataIndex: "created_date",
      render: (date: string) => new Date(date).toLocaleDateString(),
      sorter: (a: User, b: User) => new Date(a.created_date).getTime() - new Date(b.created_date).getTime(),
    },
    {
      title: "Role",
      dataIndex: "role",
      render: (text: string) => (
        <span className={`badge badge-md ${text === 'Employee' ? 'badge-pink-transparent' : 'badge-soft-purple'}`}>{text}</span>
      ),
      sorter: (a: User, b: User) => a.role.localeCompare(b.role),
    },
    {
      title: "Status",
      render: (_: any, record: User) => (
        <div className="action-icon d-inline-flex align-items-center">
          <button
            type="button"
            className="btn btn-link p-0 me-2"
            data-bs-toggle="modal"
            data-bs-target="#edit_user"
            onClick={() => handleEditClick(record)}
          >
            <i className="ti ti-edit" />
          </button>
          <button
            type="button"
            className="btn btn-link p-0"
            data-bs-toggle="modal"
            data-bs-target="#delete-modal"
            onClick={() => handleDeleteClick(record._id)}
          >
            <i className="ti ti-trash" />
          </button>
        </div>
      ),
    },
  ];
  
  if (loading) {
    return <div className="page-wrapper"><div className="content">Loading...</div></div>;
  }
  
  if (error) {
    return <div className="page-wrapper"><div className="content"><div className="alert alert-danger">{error}</div></div></div>;
  }
  
  return (
    <>
      <div className="page-wrapper">
        <div className="content">
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Users</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={all_routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">Administration</li>
                  <li className="breadcrumb-item active" aria-current="page">Users</li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
              <div className="me-2 mb-2">
                <div className="dropdown">
                  <Link to="#" className="dropdown-toggle btn btn-white d-inline-flex align-items-center" data-bs-toggle="dropdown">
                    <i className="ti ti-file-export me-1" />Export
                  </Link>
                  <ul className="dropdown-menu dropdown-menu-end p-3">
                    <li><Link to="#" className="dropdown-item rounded-1"><i className="ti ti-file-type-pdf me-1" />Export as PDF</Link></li>
                    <li><Link to="#" className="dropdown-item rounded-1"><i className="ti ti-file-type-xls me-1" />Export as Excel</Link></li>
                  </ul>
                </div>
              </div>
              <div className="mb-2">
                <Link to="#" data-bs-toggle="modal" data-bs-target="#add_users" className="btn btn-primary d-flex align-items-center">
                  <i className="ti ti-circle-plus me-2" />Add New User
                </Link>
              </div>
              <div className="head-icons ms-2">
                <CollapseHeader />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
    <h5>Users List</h5>
    <div className="d-flex my-xl-auto right-content align-items-center flex-wrap row-gap-3">
        <div className="me-3">
            <div className="input-icon-end position-relative">
                <PredefinedDateRanges onChange={(range) => handleFilterChange('dateRange', range)} />
                <span className="input-icon-addon"><i className="ti ti-chevron-down" /></span>
            </div>
        </div>
        <div className="dropdown me-3">
            <Link to="#" className="dropdown-toggle btn btn-white d-inline-flex align-items-center" data-bs-toggle="dropdown">
                {filters.role}
            </Link>
            <ul className="dropdown-menu dropdown-menu-end p-3">
                <li><Link to="#" className="dropdown-item rounded-1" onClick={() => handleFilterChange('role', 'All')}>All</Link></li>
                <li><Link to="#" className="dropdown-item rounded-1" onClick={() => handleFilterChange('role', 'Employee')}>Employee</Link></li>
                <li><Link to="#" className="dropdown-item rounded-1" onClick={() => handleFilterChange('role', 'Client')}>Client</Link></li>
            </ul>
        </div>
        <div className="dropdown me-3">
            <Link to="#" className="dropdown-toggle btn btn-white d-inline-flex align-items-center" data-bs-toggle="dropdown">
                {filters.status}
            </Link>
            <ul className="dropdown-menu dropdown-menu-end p-3">
                <li><Link to="#" className="dropdown-item rounded-1" onClick={() => handleFilterChange('status', 'All')}>All</Link></li>
                <li><Link to="#" className="dropdown-item rounded-1" onClick={() => handleFilterChange('status', 'Active')}>Active</Link></li>
                <li><Link to="#" className="dropdown-item rounded-1" onClick={() => handleFilterChange('status', 'Inactive')}>Inactive</Link></li>
            </ul>
        </div>
        <div className="dropdown">
            <Link to="#" className="dropdown-toggle btn btn-white d-inline-flex align-items-center" data-bs-toggle="dropdown">
                Sort By: {
                    {
                        'recent': 'Recently Added',
                        'name_asc': 'Name Ascending',
                        'name_desc': 'Name Descending'
                    }[filters.sortBy]
                }
            </Link>
            <ul className="dropdown-menu dropdown-menu-end p-3">
                <li><Link to="#" className="dropdown-item rounded-1" onClick={() => handleFilterChange('sortBy', 'recent')}>Recently Added</Link></li>
                <li><Link to="#" className="dropdown-item rounded-1" onClick={() => handleFilterChange('sortBy', 'name_asc')}>Name Ascending</Link></li>
                <li><Link to="#" className="dropdown-item rounded-1" onClick={() => handleFilterChange('sortBy', 'name_desc')}>Name Descending</Link></li>
            </ul>
        </div>
    </div>
</div>
            <div className="card-body p-0">
              <Table dataSource={data} columns={columns} Selection={true} />
            </div>
          </div>
        </div>
        <div className="footer d-sm-flex align-items-center justify-content-between border-top bg-white p-3">
          <p className="mb-0">2014 - 2025 © SmartHR.</p>
          <p>Designed &amp; Developed By <Link to="#" className="text-primary">Dreams</Link></p>
        </div>
      </div>

      {/* Add Users Modal */}
<div className="modal fade" id="add_users">
  <div className="modal-dialog modal-dialog-centered modal-lg">
    <div className="modal-content">
      <div className="modal-header">
        <h4 className="modal-title">Add User</h4>
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
        <div className="modal-body pb-0">
          <div className="row">
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label">First Name</label>
                <input type="text" className="form-control" name="firstName" value={formData.firstName} onChange={handleChange} required />
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label">Last Name</label>
                <input type="text" className="form-control" name="lastName" value={formData.lastName} onChange={handleChange} required />
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label">User Name</label>
                <input type="text" className="form-control" name="username" value={formData.username} onChange={handleChange} required />
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label">Email</label>
                <input type="email" className="form-control" name="email" value={formData.email} onChange={handleChange} required />
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label">Password</label>
                <div className="pass-group">
                  <input
                    type={passwordVisibility.password ? "text" : "password"}
                    className="pass-input form-control"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                  <span
                    className={`ti toggle-passwords ${passwordVisibility.password ? "ti-eye" : "ti-eye-off"}`}
                    onClick={() => togglePasswordVisibility("password")}
                  ></span>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label">Confirm Password</label>
                <div className="pass-group">
                  <input
                    type={passwordVisibility.confirmPassword ? "text" : "password"}
                    className="pass-input form-control"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                  <span
                    className={`ti toggle-passwords ${passwordVisibility.confirmPassword ? "ti-eye" : "ti-eye-off"}`}
                    onClick={() => togglePasswordVisibility("confirmPassword")}
                  ></span>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label">Phone</label>
                <input type="text" className="form-control" name="phone" value={formData.phone} onChange={handleChange} />
              </div>
            </div>
            <div className="col-md-6">
                <div className="mb-3">
                    <label className="form-label">Role</label>
                    {/* Note: This assumes your CommonSelect component takes 'value' and 'onChange' props that work with a standard event.
                        If it requires a special handler, you may need to adjust the handleChange function. */}
                    <CommonSelect
                        className='select'
                        options={roleChoose}
                        defaultValue={roleChoose.find(option => option.value === formData.role)}
                        onChange={(selectedOption: { value: string; label: string } | null) => {
                            if (selectedOption) {
                                handleChange({ target: { name: 'role', value: selectedOption.value } } as React.ChangeEvent<HTMLSelectElement>);
                            }
                        }}
                    />
                </div>
            </div>
            <div className="col-md-12">
              <div className="card">
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table">
                      <thead className="thead-light">
                        <tr>
                          <th>Module Permissions</th>
                          <th>Read</th>
                          <th>Write</th>
                          <th>Create</th>
                          <th>Delete</th>
                          <th>Import</th>
                          <th>Export</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><h6 className="fs-14 fw-normal text-gray-9">Employee</h6></td>
                          {Array(6).fill(null).map((_, index) => (<td key={index}><div className="form-check form-check-md"><input className="form-check-input" type="checkbox" /></div></td>))}
                        </tr>
                        <tr>
                          <td><h6 className="fs-14 fw-normal text-gray-9">Holidays</h6></td>
                          {Array(6).fill(null).map((_, index) => (<td key={index}><div className="form-check form-check-md"><input className="form-check-input" type="checkbox" /></div></td>))}
                        </tr>
                        <tr>
                          <td><h6 className="fs-14 fw-normal text-gray-9">Leaves</h6></td>
                          {Array(6).fill(null).map((_, index) => (<td key={index}><div className="form-check form-check-md"><input className="form-check-input" type="checkbox" /></div></td>))}
                        </tr>
                        <tr>
                          <td><h6 className="fs-14 fw-normal text-gray-9">Events</h6></td>
                          {Array(6).fill(null).map((_, index) => (<td key={index}><div className="form-check form-check-md"><input className="form-check-input" type="checkbox" /></div></td>))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-white border me-2" data-bs-dismiss="modal">Cancel</button>
          <button type="submit" data-bs-dismiss="modal" className="btn btn-primary">Add User</button>
        </div>
      </form>
    </div>
  </div>
</div>
      
      {/* Edit User Modal */}
<div className="modal fade" id="edit_user">
  <div className="modal-dialog modal-dialog-centered modal-lg">
    <div className="modal-content">
      <div className="modal-header">
        <h4 className="modal-title">Edit User</h4>
        <button
          type="button"
          className="btn-close custom-btn-close"
          data-bs-dismiss="modal"
          aria-label="Close"
        >
          <i className="ti ti-x" />
        </button>
      </div>
      <form onSubmit={handleUpdateSubmit}>
        <div className="modal-body pb-0">
          <div className="row">
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label">First Name</label>
                <input
                  type="text"
                  className="form-control"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label">Last Name</label>
                <input
                  type="text"
                  className="form-control"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label">User Name</label>
                <input
                  type="text"
                  className="form-control"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label">Password</label>
                <div className="pass-group">
                  <input
                    type={passwordVisibility.password ? "text" : "password"}
                    className="pass-input form-control"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Leave blank to keep unchanged"
                  />
                  <span
                    className={`ti toggle-passwords ${passwordVisibility.password ? "ti-eye" : "ti-eye-off"}`}
                    onClick={() => togglePasswordVisibility("password")}
                  />
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label">Confirm Password</label>
                <div className="pass-group">
                  <input
                    type={passwordVisibility.confirmPassword ? "text" : "password"}
                    className="pass-input form-control"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                  />
                  <span
                    className={`ti toggle-passwords ${passwordVisibility.confirmPassword ? "ti-eye" : "ti-eye-off"}`}
                    onClick={() => togglePasswordVisibility("confirmPassword")}
                  />
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label">Phone</label>
                <input
                  type="text"
                  className="form-control"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label">Role</label>
                <select 
                    className="form-select" 
                    name="role" 
                    value={formData.role} 
                    onChange={handleChange}
                >
                    <option value="Employee">Employee</option>
                    <option value="Client">Client</option>
                </select>
              </div>
            </div>
            <div className="col-md-12">
              <div className="card">
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table">
                      <thead className="thead-light">
                        <tr>
                          <th>Module Permissions</th>
                          <th>Read</th>
                          <th>Write</th>
                          <th>Create</th>
                          <th>Delete</th>
                          <th>Import</th>
                          <th>Export</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><h6 className="fs-14 fw-normal text-gray-9">Employee</h6></td>
                          {Array(6).fill(null).map((_, index) => (<td key={index}><div className="form-check form-check-md"><input className="form-check-input" type="checkbox" defaultChecked={index === 0 || index === 2} /></div></td>))}
                        </tr>
                         <tr>
                          <td><h6 className="fs-14 fw-normal text-gray-9">Holidays</h6></td>
                          {Array(6).fill(null).map((_, index) => (<td key={index}><div className="form-check form-check-md"><input className="form-check-input" type="checkbox" defaultChecked={index < 3} /></div></td>))}
                        </tr>
                        <tr>
                          <td><h6 className="fs-14 fw-normal text-gray-9">Leaves</h6></td>
                          {Array(6).fill(null).map((_, index) => (<td key={index}><div className="form-check form-check-md"><input className="form-check-input" type="checkbox" defaultChecked /></div></td>))}
                        </tr>
                        <tr>
                          <td><h6 className="fs-14 fw-normal text-gray-9">Events</h6></td>
                          {Array(6).fill(null).map((_, index) => (<td key={index}><div className="form-check form-check-md"><input className="form-check-input" type="checkbox" defaultChecked /></div></td>))}
                        </tr>
                      </tbody>
                    </table>
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
          <button type="submit" data-bs-dismiss="modal" className="btn btn-primary">
            Update User
          </button>
        </div>
      </form>
    </div>
  </div>
</div>

      {/* Delete Modal */}
      <div className="modal fade" id="delete-modal">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <form onSubmit={(e) => { e.preventDefault(); confirmDelete(); }}>
              <div className="modal-body text-center">
                <span className="delete-icon"><i className="ti ti-trash-x" /></span>
                <h4>Confirm Deletion</h4>
                <p>Are you sure you want to delete this user? This action cannot be undone.</p>
                <div className="d-flex justify-content-center">
                  <button type="button" className="btn btn-light me-3" data-bs-dismiss="modal">Cancel</button>
                  <button type="submit" className="btn btn-danger" data-bs-dismiss="modal">Yes, Delete</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default Users;