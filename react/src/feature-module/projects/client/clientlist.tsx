import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom';
import { all_routes } from '../../router/all_routes';
import { useSocket } from '../../../SocketContext';
import { Socket } from 'socket.io-client';
import { useClients } from '../../../hooks/useClients';
import Table from "../../../core/common/dataTable/index";
import CollapseHeader from '../../../core/common/collapse-header/collapse-header';
import ImageWithBasePath from '../../../core/common/imageWithBasePath';
import AddClient from './add_client';
import EditClient from './edit_client';
import DeleteClient from './delete_client';
import { message } from 'antd';

interface Client {
  _id: string;
  name: string;
  company: string;
  email: string;
  phone?: string;
  address?: string;
  logo?: string;
  status: 'Active' | 'Inactive';
  contractValue?: number;
  projects?: number;
  createdAt: string;
  updatedAt: string;
}

interface ClientStats {
  totalClients: number;
  activeClients: number;
  inactiveClients: number;
  newClients: number;
}

const ClientList = () => {
    const socket = useSocket() as Socket | null;
    
    // State management
    const { clients, stats, fetchAllData, loading, error, exportPDF, exportExcel, exporting } = useClients();
    const [filteredClients, setFilteredClients] = useState<Client[]>([]);
    
    // Filter states
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [selectedCompany, setSelectedCompany] = useState<string>('');
    const [selectedSort, setSelectedSort] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');
    
    // Extract unique companies for filter
    const [companies, setCompanies] = useState<string[]>([]);
    
    const [filters, setFilters] = useState({
        status: 'All',
        search: '',
        sortBy: 'createdAt',
        sortOrder: 'desc' as 'asc' | 'desc'
    });
    
    const [selectedClient, setSelectedClient] = useState<any>(null);
    
    // Fetch clients data
    // Initialize data fetch using the hook
    useEffect(() => {
        console.log('ClientList component mounted');
        fetchAllData();
    }, [fetchAllData]);

    // Load data on component mount

    // Apply filters whenever clients or filter states change (Activity-style filtering)
    useEffect(() => {
        console.log("[ClientList] Applying filters...");
        console.log("[ClientList] Current filters:", { selectedStatus, selectedCompany, selectedSort, searchQuery });
        console.log("[ClientList] Total clients before filtering:", clients.length);
        
        if (!clients || clients.length === 0) {
            setFilteredClients([]);
            return;
        }

        let result = [...clients];

        // Status filter
        if (selectedStatus && selectedStatus !== '') {
            console.log("[ClientList] Filtering by status:", selectedStatus);
            result = result.filter((client) => client.status === selectedStatus);
            console.log("[ClientList] After status filter:", result.length);
        }

        // Company filter
        if (selectedCompany && selectedCompany !== '') {
            console.log("[ClientList] Filtering by company:", selectedCompany);
            result = result.filter((client) => client.company === selectedCompany);
            console.log("[ClientList] After company filter:", result.length);
        }

        // Search query filter
        if (searchQuery && searchQuery.trim() !== '') {
            console.log("[ClientList] Filtering by search query:", searchQuery);
            const query = searchQuery.toLowerCase().trim();
            result = result.filter((client) => 
                client.name.toLowerCase().includes(query) ||
                client.company.toLowerCase().includes(query) ||
                client.email.toLowerCase().includes(query) ||
                (client.phone && client.phone.toLowerCase().includes(query))
            );
            console.log("[ClientList] After search filter:", result.length);
        }

        // Sort
        if (selectedSort) {
            result.sort((a, b) => {
                const dateA = new Date(a.createdAt);
                const dateB = new Date(b.createdAt);
                switch (selectedSort) {
                    case 'asc':
                        return a.name.localeCompare(b.name);
                    case 'desc':
                        return b.name.localeCompare(a.name);
                    case 'recent':
                        return dateB.getTime() - dateA.getTime();
                    case 'oldest':
                        return dateA.getTime() - dateB.getTime();
                    case 'company':
                        return a.company.localeCompare(b.company);
                    default:
                        return 0;
                }
            });
        }

        console.log("[ClientList] Final filtered clients count:", result.length);
        setFilteredClients(result);
    }, [clients, selectedStatus, selectedCompany, selectedSort, searchQuery]);

    // Handle filter changes (Activity-style handlers)
    const handleStatusChange = (status: string) => {
        console.log("[ClientList] Status filter changed to:", status);
        setSelectedStatus(status);
    };

    const handleCompanyChange = (company: string) => {
        console.log("[ClientList] Company filter changed to:", company);
        setSelectedCompany(company);
    };

    const handleSortChange = (sort: string) => {
        console.log("[ClientList] Sort filter changed to:", sort);
        setSelectedSort(sort);
    };

    const handleSearchChange = (query: string) => {
        console.log("[ClientList] Search query changed to:", query);
        setSearchQuery(query);
    };

    const handleClearFilters = () => {
        console.log("[ClientList] Clearing all filters");
        setSelectedStatus('');
        setSelectedCompany('');
        setSelectedSort('');
        setSearchQuery('');
    };

    // Handle delete client
    const handleDeleteClient = (client: any) => {
        setSelectedClient(client);
        // Dispatch custom event that delete_client.tsx is listening for
        window.dispatchEvent(
            new CustomEvent('delete-client', { detail: { client } })
        );
    };

    // Handle edit client
    const handleEditClient = (client: any) => {
        setSelectedClient(client);
        // Dispatch custom event that edit_client.tsx is listening for
        window.dispatchEvent(
            new CustomEvent('edit-client', { detail: { client } })
        );
    };

    // Export functions using the hook
    const handleExportPDF = useCallback(() => {
        exportPDF();
    }, [exportPDF]);

    const handleExportExcel = useCallback(() => {
        exportExcel();
    }, [exportExcel]);

    // Handle filter changes
    const handleStatusFilter = (status: string) => {
        setFilters(prev => ({ ...prev, status }));
        // Apply filters by fetching filtered data
        if (socket) {
            socket.emit('client:filter', { status, search: filters.search });
        }
    };

    const handleSearch = (search: string) => {
        setFilters(prev => ({ ...prev, search }));
        // Apply filters by fetching filtered data
        if (socket) {
            socket.emit('client:filter', { status: filters.status, search });
        }
    };

    const handleSort = (sortBy: string) => {
        const newSortOrder = filters.sortBy === sortBy && filters.sortOrder === 'desc' ? 'asc' : 'desc';
        setFilters(prev => ({ 
            ...prev, 
            sortBy,
            sortOrder: newSortOrder
        }));
        // Apply sorting by fetching sorted data
        if (socket) {
            socket.emit('client:filter', { 
                status: filters.status, 
                search: filters.search,
                sortBy,
                sortOrder: newSortOrder
            });
        }
    };

    const columns = [
        {
            title: "Client ID",
            dataIndex: "_id",
            render: (text: string, record: any) => (
                <Link to={`/clients-details/${record._id}`}>
                    {record._id.slice(-8).toUpperCase()}
                </Link>
            ),
            sorter: (a: any, b: any) => a._id.localeCompare(b._id),
        },
        {
            title: "Client Name",
            dataIndex: "name",
            render: (text: string, record: any) => (
                <div className="d-flex align-items-center file-name-icon">
                    <Link
                        to={`/clients-details/${record._id}`}
                        className="avatar avatar-md border avatar-rounded"
                    >
                        <ImageWithBasePath 
                            src={record.logo || `assets/img/users/user-01.jpg`} 
                            className="img-fluid" 
                            alt="img" 
                            isLink={record.logo ? record.logo.startsWith('https://') : false}
                        />
                    </Link>
                    <div className="ms-2">
                        <h6 className="fw-medium">
                            <Link to={`/clients-details/${record._id}`}>{record.name}</Link>
                        </h6>
                        <span className="fs-12 fw-normal">{record.company}</span>
                    </div>
                </div>
            ),
            sorter: (a: any, b: any) => a.name.localeCompare(b.name),
        },
        {
            title: "Company Name",
            dataIndex: "company",
            sorter: (a: any, b: any) => a.company.localeCompare(b.company),
        },
        {
            title: "Email",
            dataIndex: "email",
            sorter: (a: any, b: any) => a.email.localeCompare(b.email),
        },
        {
            title: "Phone",
            dataIndex: "phone",
            render: (text: string) => text || 'N/A',
            sorter: (a: any, b: any) => (a.phone || '').localeCompare(b.phone || ''),
        },
        {
            title: "Status",
            dataIndex: "status",
            render: (text: string, record: any) => (
                <span className={`badge d-inline-flex align-items-center badge-xs ${
                    record.status === 'Active' ? 'badge-success' : 'badge-danger'
                }`}>
                    <i className="ti ti-point-filled me-1" />
                    {record.status}
                </span>
            ),
            sorter: (a: any, b: any) => a.status.localeCompare(b.status),
        },
        {
            title: "Contract Value",
            dataIndex: "contractValue",
            render: (text: number) => `$${(text || 0).toLocaleString()}`,
            sorter: (a: any, b: any) => (a.contractValue || 0) - (b.contractValue || 0),
        },
        {
            title: "",
            dataIndex: "actions",
            render: (text: any, record: any) => (
                <div className="action-icon d-inline-flex">
                    <Link
                        to="#"
                        className="me-2"
                        data-bs-toggle="modal"
                        data-bs-target="#edit_client"
                        onClick={(e) => {
                            e.preventDefault();
                            handleEditClient(record);
                        }}
                    >
                        <i className="ti ti-edit" />
                    </Link>
                    <Link
                        to="#"
                        data-bs-toggle="modal"
                        data-bs-target="#delete_client"
                        onClick={(e) => {
                            e.preventDefault();
                            handleDeleteClient(record);
                        }}
                    >
                        <i className="ti ti-trash" />
                    </Link>
                </div>
            ),
        },
    ]

    return (
        <>
            {/* Page Wrapper */}
            <div className="page-wrapper">
                <div className="content">
                    {/* Breadcrumb */}
                    <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
                        <div className="my-auto mb-2">
                            <h2 className="mb-1">Clients</h2>
                            <nav>
                                <ol className="breadcrumb mb-0">
                                    <li className="breadcrumb-item">
                                        <Link to={all_routes.adminDashboard}>
                                            <i className="ti ti-smart-home" />
                                        </Link>
                                    </li>
                                    <li className="breadcrumb-item">Employee</li>
                                    <li className="breadcrumb-item active" aria-current="page">
                                        Client List
                                    </li>
                                </ol>
                            </nav>
                        </div>
                        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
                            <div className="me-2 mb-2">
                                <div className="d-flex align-items-center border bg-white rounded p-1 me-2 icon-list">
                                    <Link
                                        to={all_routes.clientlist}
                                        className="btn btn-icon btn-sm active bg-primary text-white me-1"
                                    >
                                        <i className="ti ti-list-tree" />
                                    </Link>
                                    <Link to={all_routes.clientgrid} className="btn btn-icon btn-sm">
                                        <i className="ti ti-layout-grid" />
                                    </Link>
                                </div>
                            </div>
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
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleExportPDF();
                                                }}
                                            >
                                                <i className="ti ti-file-type-pdf me-1" />
                                                {exporting ? "Exporting..." : "Export as PDF"}
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
                                                {exporting ? "Exporting..." : "Export as Excel"}
                                            </Link>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                            <div className="mb-2">
                                <Link
                                    to="#"
                                    data-bs-toggle="modal"
                                    data-bs-target="#add_client"
                                    className="btn btn-primary d-flex align-items-center"
                                >
                                    <i className="ti ti-circle-plus me-2" />
                                    Add Client
                                </Link>
                            </div>
                            <div className="ms-2 head-icons">
                            <CollapseHeader />
                            </div>
                        </div>
                    </div>
                    {/* /Breadcrumb */}
                    {/* Clients Info */}
                    <div className="row">
                        <div className="col-xl-3 col-md-6 d-flex">
                            <div className="card flex-fill">
                                <div className="card-body">
                                    <div className="d-flex align-items-center justify-content-between">
                                        <div className="d-flex align-items-center">
                                            <div className="flex-shrink-0 me-2">
                                                <span className="p-2 br-10 bg-pink-transparent border border-pink d-flex align-items-center justify-content-center">
                                                    <i className="ti ti-users-group text-pink fs-18" />
                                                </span>
                                            </div>
                                            <div>
                                                <p className="fs-12 fw-medium mb-0 text-gray-5 mb-1">
                                                    Total Clients
                                                </p>
                                                <h4>{stats?.totalClients || 0}</h4>
                                            </div>
                                        </div>
                                        {/* <span className="badge bg-transparent-purple d-inline-flex align-items-center fw-normal">
                                            <i className="ti ti-arrow-wave-right-down me-1" />
                                            +19.01%
                                        </span> */}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-xl-3 col-md-6 d-flex">
                            <div className="card flex-fill">
                                <div className="card-body">
                                    <div className="d-flex align-items-center justify-content-between">
                                        <div className="d-flex align-items-center">
                                            <div className="flex-shrink-0 me-2">
                                                <span className="p-2 br-10 bg-success-transparent border border-success d-flex align-items-center justify-content-center">
                                                    <i className="ti ti-user-share fs-18" />
                                                </span>
                                            </div>
                                            <div>
                                                <p className="fs-12 fw-medium mb-0 text-gray-5 mb-1">
                                                    Active Clients
                                                </p>
                                                <h4>{stats?.activeClients || 0}</h4>
                                            </div>
                                        </div>
                                        {/* <span className="badge bg-transparent-primary text-primary d-inline-flex align-items-center fw-normal">
                                            <i className="ti ti-arrow-wave-right-down me-1" />
                                            +19.01%
                                        </span> */}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-xl-3 col-md-6 d-flex">
                            <div className="card flex-fill">
                                <div className="card-body">
                                    <div className="d-flex align-items-center justify-content-between">
                                        <div className="d-flex align-items-center">
                                            <div className="flex-shrink-0 me-2">
                                                <span className="p-2 br-10 bg-danger-transparent border border-danger d-flex align-items-center justify-content-center">
                                                    <i className="ti ti-user-pause fs-18" />
                                                </span>
                                            </div>
                                            <div>
                                                <p className="fs-12 fw-medium mb-0 text-gray-5 mb-1">
                                                    Inactive Clients
                                                </p>
                                                <h4>{stats?.inactiveClients || 0}</h4>
                                            </div>
                                        </div>
                                        {/* <span className="badge bg-transparent-dark text-dark d-inline-flex align-items-center fw-normal">
                                            <i className="ti ti-arrow-wave-right-down me-1" />
                                            +19.01%
                                        </span> */}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-xl-3 col-md-6 d-flex">
                            <div className="card flex-fill">
                                <div className="card-body">
                                    <div className="d-flex align-items-center justify-content-between">
                                        <div className="d-flex align-items-center">
                                            <div className="flex-shrink-0 me-2">
                                                <span className="p-2 br-10 bg-info-transparent border border-info d-flex align-items-center justify-content-center">
                                                    <i className="ti ti-user-plus fs-18" />
                                                </span>
                                            </div>
                                            <div>
                                                <p className="fs-12 fw-medium mb-0 text-gray-5 mb-1">
                                                    New Clients
                                                </p>
                                                <h4>{stats?.newClients || 0}</h4>
                                            </div>
                                        </div>
                                        {/* <span className="badge bg-transparent-secondary text-dark d-inline-flex align-items-center fw-normal">
                                            <i className="ti ti-arrow-wave-right-down me-1" />
                                            +19.01%
                                        </span> */}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* /Clients Info */}
                    
                    {/* Clients list */}
                    <div className="card">
                        <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
                            <h5>Client List</h5>
                            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap row-gap-3">
                                {/* Search Input */}
                                <div className="me-3">
                                    <div className="input-icon-end position-relative">
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Search clients..."
                                            value={searchQuery}
                                            onChange={(e) => handleSearchChange(e.target.value)}
                                        />
                                        <span className="input-icon-addon">
                                            <i className="ti ti-search text-gray-7" />
                                        </span>
                                    </div>
                                </div>
                                
                                {/* Status Filter */}
                                <div className="dropdown me-3">
                                    <Link
                                        to="#"
                                        className="dropdown-toggle btn btn-sm btn-white d-inline-flex align-items-center"
                                        data-bs-toggle="dropdown"
                                    >
                                        {selectedStatus ? `Status: ${selectedStatus}` : 'Select Status'}
                                    </Link>
                                    <ul className="dropdown-menu dropdown-menu-end p-3">
                                        <li>
                                            <Link
                                                to="#"
                                                className="dropdown-item rounded-1"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleStatusChange('');
                                                }}
                                            >
                                                All Status
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                to="#"
                                                className="dropdown-item rounded-1"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleStatusChange('Active');
                                                }}
                                            >
                                                Active
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                to="#"
                                                className="dropdown-item rounded-1"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleStatusChange('Inactive');
                                                }}
                                            >
                                                Inactive
                                            </Link>
                                        </li>
                                    </ul>
                                </div>
                                
                                {/* Company Filter */}
                                {/* <div className="dropdown me-3">
                                    <Link
                                        to="#"
                                        className="dropdown-toggle btn btn-sm btn-white d-inline-flex align-items-center"
                                        data-bs-toggle="dropdown"
                                    >
                                        {selectedCompany ? `Company: ${selectedCompany}` : 'Select Company'}
                                    </Link>
                                    <ul className="dropdown-menu dropdown-menu-end p-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                        <li>
                                            <Link
                                                to="#"
                                                className="dropdown-item rounded-1"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleCompanyChange('');
                                                }}
                                            >
                                                All Companies
                                            </Link>
                                        </li>
                                        {companies.map((company, index) => (
                                            <li key={index}>
                                                <Link
                                                    to="#"
                                                    className="dropdown-item rounded-1"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        handleCompanyChange(company);
                                                    }}
                                                >
                                                    {company}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div> */}
                                
                                {/* Sort Filter */}
                                <div className="dropdown me-3">
                                    <Link
                                        to="#"
                                        className="dropdown-toggle btn btn-sm btn-white d-inline-flex align-items-center"
                                        data-bs-toggle="dropdown"
                                    >
                                        {selectedSort ? `Sort: ${selectedSort === 'asc' ? 'A-Z' : selectedSort === 'desc' ? 'Z-A' : selectedSort === 'recent' ? 'Recent' : selectedSort === 'oldest' ? 'Oldest' : 'Company'}` : 'Sort By'}
                                    </Link>
                                    <ul className="dropdown-menu dropdown-menu-end p-3">
                                        <li>
                                            <Link
                                                to="#"
                                                className="dropdown-item rounded-1"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleSortChange('asc');
                                                }}
                                            >
                                                Name A-Z
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
                                                Name Z-A
                                            </Link>
                                        </li>
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
                                                    handleSortChange('oldest');
                                                }}
                                            >
                                                Oldest First
                                            </Link>
                                        </li>
                                        {/* <li>
                                            <Link
                                                to="#"
                                                className="dropdown-item rounded-1"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleSortChange('company');
                                                }}
                                            >
                                                By Company
                                            </Link>
                                        </li> */}
                                    </ul>
                                </div>
                                
                                {/* Clear Filters */}
                                {(selectedStatus || selectedCompany || selectedSort || searchQuery) && (
                                    <div className="me-3">
                                        <Link
                                            to="#"
                                            className="btn btn-sm btn-outline-danger d-inline-flex align-items-center"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                handleClearFilters();
                                            }}
                                        >
                                            <i className="ti ti-x me-1" />
                                            Clear Filters
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="card-body p-0">
                            {loading ? (
                                <div className="text-center p-4">
                                    <div className="spinner-border" role="status">
                                        <span className="sr-only">Loading clients...</span>
                                    </div>
                                </div>
                            ) : error ? (
                                <div className="alert alert-danger m-3">
                                    <h6>Error loading clients</h6>
                                    <p className="mb-0">{error}</p>
                                    <button className="btn btn-primary mt-2" onClick={() => fetchAllData()}>
                                        Retry
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {/* Filter Summary */}
                                    <div className="px-3 py-2 border-bottom bg-light">
                                        <small className="text-muted">
                                            Showing {filteredClients.length} of {clients.length} clients
                                            {(selectedStatus || selectedCompany || selectedSort || searchQuery) && 
                                                <span className="ms-2">
                                                    <i className="ti ti-filter me-1"></i>
                                                    Filters applied:
                                                    {selectedStatus && ` Status: ${selectedStatus}`}
                                                    {selectedCompany && ` Company: ${selectedCompany}`}
                                                    {selectedSort && ` Sort: ${selectedSort}`}
                                                    {searchQuery && ` Search: "${searchQuery}"`}
                                                </span>
                                            }
                                        </small>
                                    </div>
                                    <Table dataSource={filteredClients} columns={columns} Selection={true} />
                                </>
                            )}
                        </div>
                    </div>
                    {/* /Clients list */}
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
            
            {/* Modal Components */}
            <AddClient />
            <EditClient />
            <DeleteClient />
        </>
    )
}

export default ClientList