import { useEffect, useState, useMemo, useCallback } from "react";
import ReactApexChart from "react-apexcharts";
import { Link } from "react-router-dom";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";
import { all_routes } from "../../router/all_routes";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { Chart } from "primereact/chart";
import { Calendar } from 'primereact/calendar';
import ProjectModals from "../../../core/modals/projectModal";
import RequestModals from "../../../core/modals/requestModal";
import TodoModal from "../../../core/modals/todoModal";
import CollapseHeader from "../../../core/common/collapse-header/collapse-header";
import { useUser } from "@clerk/clerk-react";
import { useSocket } from "../../../SocketContext";
import { Socket } from "socket.io-client";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

interface DashboardData {
  pendingItems?: {
    approvals: number;
    leaveRequests: number;
  };
  employeeGrowth?: {
    currentWeek: number;
    lastWeek: number;
    percentage: number;
    trend: 'up' | 'down' | 'stable';
  };
  stats?: {
    attendance?: { present: number; total: number; percentage: number };
    projects?: { total: number; completed: number; percentage: number };
    clients?: number;
    tasks?: { total: number; completed: number };
    earnings?: number;
    weeklyProfit?: number;
    employees?: number;
    jobApplications?: number;
    clientsGrowth?: number;
    tasksGrowth?: number;
    earningsGrowth?: number;
    profitGrowth?: number;
    applicationsGrowth?: number;
    employeesGrowth?: number;
  };
  employeesByDepartment?: Array<{ department: string; count: number }>;
  employeeStatus?: {
    total: number;
    distribution: Record<string, number>;
    topPerformer: {
      name: string;
      position: string;
      performance: number;
      avatar: string;
    };
  };
  attendanceOverview?: {
    total: number;
    present: number;
    late: number;
    permission: number;
    absent: number;
    absentees: Array<{
      _id: string;
      name: string;
      avatar: string;
      position: string;
    }>;
  };
  clockInOutData?: Array<{
    _id: string;
    name: string;
    position: string;
    avatar: string;
    clockIn: string;
    clockOut: string;
    status: string;
    hoursWorked: number;
  }>;
  salesOverview?: {
    income: number[];
    expenses: number[];
    lastUpdated: string;
  };
  recentInvoices?: Array<{
    _id: string;
    invoiceNumber: string;
    title: string;
    amount: number;
    status: string;
    clientName: string;
    clientLogo: string;
  }>;
  employeesList?: Array<{
    _id: string;
    name: string;
    position: string;
    department: string;
    avatar: string;
  }>;
  jobApplicants?: {
    openings: Array<{ _id: string; count: number }>;
    applicants: Array<{
      _id: string;
      name: string;
      position: string;
      experience: string;
      location: string;
      avatar: string;
    }>;
  };
  recentActivities?: Array<{
    _id: string;
    action: string;
    description: string;
    createdAt: string;
    employeeName: string;
    employeeAvatar: string;
  }>;
  birthdays?: {
    today: Array<{ name: string; position: string; avatar: string }>;
    tomorrow: Array<{ name: string; position: string; avatar: string }>;
    upcoming: Array<{ name: string; position: string; avatar: string; date: string }>;
  };
  todos?: Array<{
    _id: string;
    title: string;
    completed: boolean;
    userId: string;
    createdAt: string;
  }>;
  projectsData?: Array<{
    id: string;
    name: string;
    hours: number;
    totalHours: number;
    deadline: string;
    priority: string;
    progress: number;
    team: Array<{ name: string; avatar: string }>;
  }>;
  taskStatistics?: {
    total: number;
    distribution: Record<string, { count: number; percentage: number }>;
    hoursSpent: number;
    targetHours: number;
  };
  schedules?: Array<{
    _id: string;
    title: string;
    type: string;
    date: string;
    startTime: string;
    endTime: string;
    participants: Array<{ name: string; avatar: string }>;
  }>;
}

const AdminDashboard = () => {
  const routes = all_routes;
  const { user, isLoaded, isSignedIn } = useUser();
  const socket = useSocket() as Socket | null;
  const [dashboardData, setDashboardData] = useState<DashboardData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(new Date());
  const [todoFilter, setTodoFilter] = useState('all');

  // Filter states for different cards
  const [filters, setFilters] = useState({
    employeeStatus: 'all',
    attendanceOverview: 'all',
    clockInOut: 'all',
    invoices: 'all',
    projects: 'all',
    taskStatistics: 'all',
    salesOverview: 'all',
    employeesByDepartment: 'all'
  });

  // Additional filter states for departments and invoice types
  const [departmentFilters, setDepartmentFilters] = useState({
    clockInOut: 'All Departments',
    salesOverview: 'All Departments'
  });

  const [invoiceFilter, setInvoiceFilter] = useState('all');

  const handleYearChange = (newDate: Date) => {
    console.log(`[YEAR FILTER] Year changed to: ${newDate.getFullYear()}`);
    setDate(newDate);

    if (socket) {
      const year = newDate.getFullYear();
      socket.emit("admin/dashboard/get-all-data", { year });
    }
  };

  const getUserName = () => {
    if (!user) return "Admin";
    return user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || "Admin";
  };

  const getUserImage = () => {
    if (!user) return "assets/img/profiles/avatar-31.jpg";
    return user.imageUrl || "assets/img/profiles/avatar-31.jpg";
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    if (target.src.includes('assets/img/profiles/avatar-31.jpg')) {
      return;
    }
    target.src = "assets/img/profiles/avatar-31.jpg";
  };

  const filterTodosByCurrentFilter = useCallback((todos: any[]) => {
    if (!todos || todos.length === 0) return todos;
    if (todoFilter === 'all') return todos;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    try {
      return todos.filter(todo => {
        if (!todo.createdAt) return false;

        const todoDate = new Date(todo.createdAt);
        if (isNaN(todoDate.getTime())) return false;

        switch (todoFilter) {
          case 'today':
            return todoDate >= startOfToday && todoDate < endOfToday;
          case 'week':
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            weekStart.setHours(0, 0, 0, 0);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 7);
            return todoDate >= weekStart && todoDate < weekEnd;
          case 'month':
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            return todoDate >= monthStart && todoDate < monthEnd;
          default:
            return true;
        }
      });
    } catch (error) {
      console.error('Error filtering todos:', error);
      return todos;
    }
  }, [todoFilter]);

  useEffect(() => {
    let isMounted = true;

    const initDashboard = () => {
      if (!socket) {
        console.log("Socket not available yet, waiting...");
        return;
      }

      console.log("Socket available, initializing dashboard...");
      setLoading(true);

      const timeoutId = setTimeout(() => {
        if (loading && isMounted) {
          console.warn("Dashboard loading timeout - showing fallback");
          setError("Dashboard loading timed out. Please refresh the page.");
          setLoading(false);
        }
      }, 30000); // 30 second timeout

      const currentYear = date.getFullYear();
      console.log(`[INITIAL LOAD] Sending year: ${currentYear}`);
      socket.emit("admin/dashboard/get-all-data", { year: currentYear });

      // Set up event listeners
      const handleDashboardResponse = (response: any) => {
        console.log("Received dashboard data response:", response);
        clearTimeout(timeoutId);
        if (!isMounted) return;

        if (response.done) {
          console.log("Dashboard data loaded successfully");
          setDashboardData(response.data);
          setLoading(false);
        } else {
          console.error("Dashboard data error:", response.error);
          setError(response.error || "Failed to fetch dashboard data");
          setLoading(false);
        }
      };

      const handleTodosResponse = (response: any) => {
        console.log(`[TODO BROADCAST] Received todos broadcast:`, response);
        if (!isMounted) return;

        if (response.done) {
          console.log(`[TODO BROADCAST] Setting todos:`, response.data);
          setDashboardData(prev => ({
            ...prev,
            todos: response.data
          }));
        }
      };

      const handleUpdateTodoResponse = (response: any) => {
        if (!isMounted) return;

        if (response.done) {
          setDashboardData(prev => ({
            ...prev,
            todos: prev.todos?.map(todo =>
              todo._id === response.data._id ? response.data : todo
            )
          }));
        }
      };

      const handleEmployeeStatusResponse = (response: any) => {
        if (!isMounted) return;
        if (response.done) {
          setDashboardData(prev => ({
            ...prev,
            employeeStatus: response.data
          }));
        }
      };

      const handleAttendanceOverviewResponse = (response: any) => {
        if (!isMounted) return;
        if (response.done) {
          setDashboardData(prev => ({
            ...prev,
            attendanceOverview: response.data
          }));
        }
      };

      const handleClockInOutResponse = (response: any) => {
        if (!isMounted) return;
        if (response.done) {
          setDashboardData(prev => ({
            ...prev,
            clockInOutData: response.data
          }));
        }
      };

      const handleRecentInvoicesResponse = (response: any) => {
        if (!isMounted) return;
        if (response.done) {
          setDashboardData(prev => ({
            ...prev,
            recentInvoices: response.data
          }));
        }
      };

      const handleProjectsDataResponse = (response: any) => {
        if (!isMounted) return;
        if (response.done) {
          setDashboardData(prev => ({
            ...prev,
            projectsData: response.data
          }));
        }
      };

      const handleTaskStatisticsResponse = (response: any) => {
        if (!isMounted) return;
        if (response.done) {
          setDashboardData(prev => ({
            ...prev,
            taskStatistics: response.data
          }));
        }
      };

      const handleSalesOverviewResponse = (response: any) => {
        if (!isMounted) return;
        if (response.done) {
          setDashboardData(prev => ({
            ...prev,
            salesOverview: response.data
          }));
        }
      };

      const handleEmployeesByDepartmentResponse = (response: any) => {
        if (!isMounted) return;
        if (response.done) {
          setDashboardData(prev => ({
            ...prev,
            employeesByDepartment: response.data
          }));
        }
      };

      // Add all event listeners
      socket.on("admin/dashboard/get-all-data-response", handleDashboardResponse);
      socket.on("admin/dashboard/get-todos-response", handleTodosResponse);
      socket.on("admin/dashboard/update-todo-response", handleUpdateTodoResponse);
      socket.on("admin/dashboard/get-employee-status-response", handleEmployeeStatusResponse);
      socket.on("admin/dashboard/get-attendance-overview-response", handleAttendanceOverviewResponse);
      socket.on("admin/dashboard/get-clock-inout-data-response", handleClockInOutResponse);
      socket.on("admin/dashboard/get-recent-invoices-response", handleRecentInvoicesResponse);
      socket.on("admin/dashboard/get-projects-data-response", handleProjectsDataResponse);
      socket.on("admin/dashboard/get-task-statistics-response", handleTaskStatisticsResponse);
      socket.on("admin/dashboard/get-sales-overview-response", handleSalesOverviewResponse);
      socket.on("admin/dashboard/get-employees-by-department-response", handleEmployeesByDepartmentResponse);

      // Cleanup function
      return () => {
        clearTimeout(timeoutId);
        if (socket) {
          socket.off("admin/dashboard/get-all-data-response", handleDashboardResponse);
          socket.off("admin/dashboard/get-todos-response", handleTodosResponse);
          socket.off("admin/dashboard/update-todo-response", handleUpdateTodoResponse);
          socket.off("admin/dashboard/get-employee-status-response", handleEmployeeStatusResponse);
          socket.off("admin/dashboard/get-attendance-overview-response", handleAttendanceOverviewResponse);
          socket.off("admin/dashboard/get-clock-inout-data-response", handleClockInOutResponse);
          socket.off("admin/dashboard/get-recent-invoices-response", handleRecentInvoicesResponse);
          socket.off("admin/dashboard/get-projects-data-response", handleProjectsDataResponse);
          socket.off("admin/dashboard/get-task-statistics-response", handleTaskStatisticsResponse);
          socket.off("admin/dashboard/get-sales-overview-response", handleSalesOverviewResponse);
          socket.off("admin/dashboard/get-employees-by-department-response", handleEmployeesByDepartmentResponse);
        }
      };
    };

    if (socket) {
      const cleanup = initDashboard();
      return cleanup;
    }

    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, date]);

  // Chart configurations
  const empDepartmentOptions = {
    chart: {
      height: 235,
      type: 'bar' as const,
      padding: {
        top: 0,
        left: 10,
        right: 10,
        bottom: 0
      },
      toolbar: {
        show: false,
      }
    },
    fill: {
      colors: ['#F26522'],
      opacity: 1,
    },
    colors: ['#F26522'],
    grid: {
      borderColor: '#E5E7EB',
      strokeDashArray: 5,
      padding: {
        top: -20,
        left: 20,
        right: 20,
        bottom: 0
      }
    },
    plotOptions: {
      bar: {
        borderRadius: 5,
        horizontal: true,
        barHeight: '45%',
        endingShape: 'rounded'
      }
    },
    dataLabels: {
      enabled: true,
      style: {
        fontSize: '12px',
        fontWeight: 'bold',
        colors: ['#fff']
      },
      offsetX: 10
    },
    series: [{
      data: dashboardData.employeesByDepartment?.map(dept => ({
        x: dept.department,
        y: dept.count
      })) || [],
      name: 'Employees'
    }],
    xaxis: {
      labels: {
        style: {
          colors: '#111827',
          fontSize: '12px',
        }
      },
      axisBorder: {
        show: true,
        color: '#E5E7EB'
      },
      axisTicks: {
        show: true,
        color: '#E5E7EB'
      },
      min: 0,
      max: (() => {
        const maxValue = Math.max(...(dashboardData.employeesByDepartment?.map(dept => dept.count) || [0]));
        return maxValue > 0 ? Math.ceil(maxValue * 1.2) : 10;
      })(),
      tickAmount: 5,
      forceNiceScale: true
    },
    yaxis: {
      labels: {
        style: {
          colors: '#6B7280',
          fontSize: '12px',
        }
      }
    },
    tooltip: {
      enabled: true,
      y: {
        formatter: function (val: number) {
          return val + " employees";
        }
      }
    }
  };

  const salesIncomeOptions = {
    chart: {
      height: 290,
      type: 'bar' as const,
      stacked: true,
      toolbar: {
        show: false,
      }
    },
    colors: ['#FF6F28', '#F8F9FA'],
    responsive: [{
      breakpoint: 480,
      options: {
        legend: {
          position: 'bottom',
          offsetX: -10,
          offsetY: 0
        }
      }
    }],
    plotOptions: {
      bar: {
        borderRadius: 5,
        borderRadiusWhenStacked: 'all' as const,
        horizontal: false,
        endingShape: 'rounded'
      },
    },
    series: [{
      name: 'Income',
      data: dashboardData.salesOverview?.income || []
    }, {
      name: 'Expenses',
      data: dashboardData.salesOverview?.expenses || []
    }],
    xaxis: {
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      labels: {
        style: {
          colors: '#6B7280',
          fontSize: '13px',
        }
      }
    },
    yaxis: {
      labels: {
        offsetX: -15,
        style: {
          colors: '#6B7280',
          fontSize: '13px',
        }
      }
    },
    grid: {
      borderColor: '#E5E7EB',
      strokeDashArray: 5,
      padding: {
        left: -8,
      },
    },
    legend: {
      show: false
    },
    dataLabels: {
      enabled: false
    },
    fill: {
      opacity: 1
    },
  };

  // Attendance Chart Data
  const attendanceChartData = {
    labels: ['Late', 'Present', 'Permission', 'Absent'],
    datasets: [{
      label: 'Attendance',
      data: [
        dashboardData.attendanceOverview?.late || 0,
        dashboardData.attendanceOverview?.present || 0,
        dashboardData.attendanceOverview?.permission || 0,
        dashboardData.attendanceOverview?.absent || 0
      ],
      backgroundColor: ['#0C4B5E', '#03C95A', '#FFC107', '#E70D0D'],
      borderWidth: 5,
      borderRadius: 10,
      borderColor: '#fff',
      hoverBorderWidth: 0,
      cutout: '60%',
    }]
  };

  const attendanceChartOptions = {
    rotation: -100,
    circumference: 200,
    layout: {
      padding: {
        top: -20,
        bottom: -20,
      }
    },
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
  };

  // Task Statistics Chart Data
  const taskStatsData = {
    labels: ["Ongoing", "Onhold", "Completed", "Overdue"],
    datasets: [{
      label: 'Task Statistics',
      data: [
        dashboardData.taskStatistics?.distribution?.["Ongoing"]?.count || 0,
        dashboardData.taskStatistics?.distribution?.["On Hold"]?.count || 0,
        dashboardData.taskStatistics?.distribution?.["Completed"]?.count || 0,
        dashboardData.taskStatistics?.distribution?.["Overdue"]?.count || 0
      ],
      backgroundColor: ['#FFC107', '#1B84FF', '#03C95A', '#E70D0D'],
      borderWidth: -10,
      borderColor: 'transparent',
      hoverBorderWidth: 0,
      cutout: '75%',
      spacing: -30,
    }],
  };

  const taskStatsOptions = {
    rotation: -100,
    circumference: 185,
    layout: {
      padding: {
        top: -20,
        bottom: 20,
      }
    },
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    elements: {
      arc: {
        borderWidth: -30,
        borderRadius: 30,
      }
    },
  };

  // Helper functions
  const updateTodo = (todoId: string, updates: any) => {
    if (socket) {
      // Optimistic update - update UI immediately
      setDashboardData(prev => ({
        ...prev,
        todos: prev.todos?.map(todo =>
          todo._id === todoId ? { ...todo, ...updates } : todo
        )
      }));

      // Send update to server
      socket.emit("admin/dashboard/update-todo", { id: todoId, ...updates });
    }
  };

  const toggleTodo = (todoId: string, completed: boolean) => {
    updateTodo(todoId, { completed });
  };

  const deleteTodo = (todoId: string) => {
    if (socket) {
      console.log(`[DELETE TODO] Attempting to delete todo: ${todoId}`);
      const todoToDelete = dashboardData.todos?.find(todo => todo._id === todoId);
      console.log(`[DELETE TODO] Todo to delete:`, todoToDelete);

      // Optimistic update - remove from UI immediately
      setDashboardData(prev => ({
        ...prev,
        todos: prev.todos?.filter(todo => todo._id !== todoId)
      }));

      // Listen for delete response
      const handleDeleteResponse = (response: any) => {
        console.log(`[DELETE TODO] Server response:`, response);
        if (!response.done) {
          // Rollback optimistic update if delete failed
          if (todoToDelete) {
            console.log(`[DELETE TODO] Rolling back optimistic update`);
            setDashboardData(prev => ({
              ...prev,
              todos: prev.todos ? [...prev.todos, todoToDelete] : [todoToDelete]
            }));
          }
          alert('Failed to delete todo: ' + response.error);
        } else {
          console.log(`[DELETE TODO] Successfully deleted todo`);
        }
        // Clean up listener
        socket.off("admin/dashboard/delete-todo-permanently-response", handleDeleteResponse);
      };

      socket.on("admin/dashboard/delete-todo-permanently-response", handleDeleteResponse);
      socket.emit("admin/dashboard/delete-todo-permanently", todoId);
    }
  };

  const handleTodoFilterChange = (filter: string) => {
    console.log(`[TODO FILTER] Changing filter from ${todoFilter} to ${filter}`);
    setTodoFilter(filter);
    // Don't emit socket request here - let client-side filtering handle it
  };

  // Handle filter changes for different cards
  const handleFilterChange = (cardType: string, filter: string) => {
    console.log(`[FILTER CHANGE] ${cardType}: ${filter}`);
    setFilters(prev => ({
      ...prev,
      [cardType]: filter
    }));

    // Emit socket event for the specific card with current year
    if (socket) {
      const year = date.getFullYear();
      const eventData = { filter, year };

      switch(cardType) {
        case 'employeeStatus':
          socket.emit("admin/dashboard/get-employee-status", eventData);
          break;
        case 'attendanceOverview':
          socket.emit("admin/dashboard/get-attendance-overview", eventData);
          break;
        case 'clockInOut':
          socket.emit("admin/dashboard/get-clock-inout-data", eventData);
          break;
        case 'invoices':
          socket.emit("admin/dashboard/get-recent-invoices", eventData);
          break;
        case 'projects':
          socket.emit("admin/dashboard/get-projects-data", eventData);
          break;
        case 'taskStatistics':
          socket.emit("admin/dashboard/get-task-statistics", eventData);
          break;
        case 'salesOverview':
          socket.emit("admin/dashboard/get-sales-overview", eventData);
          break;
        case 'employeesByDepartment':
          socket.emit("admin/dashboard/get-employees-by-department", eventData);
          break;
      }
    }
  };

  // Handle department filter changes
  const handleDepartmentFilterChange = (cardType: string, department: string) => {
    console.log(`[DEPARTMENT FILTER] ${cardType}: ${department}`);
    setDepartmentFilters(prev => ({
      ...prev,
      [cardType]: department
    }));

    // Emit socket event for the specific card with current filters
    if (socket) {
      const year = date.getFullYear();
      const eventData = {
        filter: cardType === 'clockInOut' ? filters.clockInOut : filters.salesOverview,
        department: department === 'All Departments' ? null : department,
        year
      };

      switch(cardType) {
        case 'clockInOut':
          socket.emit("admin/dashboard/get-clock-inout-data", eventData);
          break;
        case 'salesOverview':
          socket.emit("admin/dashboard/get-sales-overview", eventData);
          break;
      }
    }
  };

  // Handle invoice filter changes
  const handleInvoiceFilterChange = (filter: string) => {
    console.log(`[INVOICE FILTER] ${filter}`);
    setInvoiceFilter(filter);

    // Emit socket event for invoices with current time filter
    if (socket) {
      const year = date.getFullYear();
      const eventData = {
        filter: filters.invoices,
        invoiceType: filter,
        year
      };
      socket.emit("admin/dashboard/get-recent-invoices", eventData);
    }
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatLastUpdated = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    } else if (diffMins < 1440) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  // Calculate employee status percentages
  const calculateEmployeeStatusPercentages = () => {
    const total = dashboardData.employeeStatus?.total || 0;
    if (total === 0) return { fulltime: 0, contract: 0, probation: 0, wfh: 0 };

    const distribution = dashboardData.employeeStatus?.distribution || {};
    return {
      fulltime: Math.round(((distribution["Fulltime"] || 0) / total) * 100),
      contract: Math.round(((distribution["Contract"] || 0) / total) * 100),
      probation: Math.round(((distribution["Probation"] || 0) / total) * 100),
      wfh: Math.round(((distribution["WFH"] || 0) / total) * 100),
    };
  };

  const statusPercentages = calculateEmployeeStatusPercentages();

  // Memoize filtered todos to prevent unnecessary recalculations
  const filteredTodos = useMemo(() => {
    return filterTodosByCurrentFilter(dashboardData.todos || []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardData.todos, todoFilter, filterTodosByCurrentFilter]);

  // Export functions
  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      const currentDate = new Date().toLocaleDateString();
      const currentYear = date.getFullYear();

      // Title
      doc.setFontSize(20);
      doc.text("Admin Dashboard Report", 20, 20);

      doc.setFontSize(12);
      doc.text(`Generated on: ${currentDate}`, 20, 35);
      doc.text(`Year: ${currentYear}`, 20, 45);

      let yPosition = 60;

      // Dashboard Stats
      doc.setFontSize(16);
      doc.text("Dashboard Statistics", 20, yPosition);
      yPosition += 15;

      doc.setFontSize(10);
      const stats = dashboardData.stats;
      if (stats) {
        doc.text(`Attendance: ${stats.attendance?.present || 0}/${stats.attendance?.total || 0} (${stats.attendance?.percentage?.toFixed(1) || 0}%)`, 20, yPosition);
        yPosition += 10;
        doc.text(`Projects: ${stats.projects?.completed || 0}/${stats.projects?.total || 0} (${stats.projects?.percentage?.toFixed(1) || 0}%)`, 20, yPosition);
        yPosition += 10;
        doc.text(`Total Clients: ${stats.clients || 0}`, 20, yPosition);
        yPosition += 10;
        doc.text(`Tasks: ${stats.tasks?.completed || 0}/${stats.tasks?.total || 0}`, 20, yPosition);
        yPosition += 10;
        doc.text(`Earnings: $${stats.earnings?.toLocaleString() || 0}`, 20, yPosition);
        yPosition += 10;
        doc.text(`Weekly Profit: $${stats.weeklyProfit?.toLocaleString() || 0}`, 20, yPosition);
        yPosition += 10;
        doc.text(`Total Employees: ${stats.employees || 0}`, 20, yPosition);
        yPosition += 20;
      }

      // Employee Status
      if (dashboardData.employeeStatus) {
        doc.setFontSize(16);
        doc.text("Employee Status Distribution", 20, yPosition);
        yPosition += 15;

        doc.setFontSize(10);
        const distribution = dashboardData.employeeStatus.distribution;
        Object.entries(distribution).forEach(([status, count]) => {
          doc.text(`${status}: ${count}`, 30, yPosition);
          yPosition += 8;
        });
        yPosition += 10;

        if (dashboardData.employeeStatus.topPerformer) {
          doc.text("Top Performer:", 20, yPosition);
          yPosition += 8;
          doc.text(`${dashboardData.employeeStatus.topPerformer.name} - ${dashboardData.employeeStatus.topPerformer.performance}%`, 30, yPosition);
          yPosition += 20;
        }
      }

      // Recent Activities
      if (dashboardData.recentActivities && dashboardData.recentActivities.length > 0) {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(16);
        doc.text("Recent Activities", 20, yPosition);
        yPosition += 15;

        doc.setFontSize(10);
        dashboardData.recentActivities.slice(0, 10).forEach((activity) => {
          if (yPosition > 280) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(`${activity.action}: ${activity.description}`, 20, yPosition);
          yPosition += 8;
          doc.text(`By: ${activity.employeeName} - ${formatDate(activity.createdAt)}`, 30, yPosition);
          yPosition += 12;
        });
      }

      // Save the PDF
      doc.save(`admin-dashboard-report-${currentDate.replace(/\//g, '-')}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF export. Please try again.");
    }
  };

  const exportToExcel = () => {
    try {
      const currentDate = new Date().toLocaleDateString();

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Dashboard Stats Sheet
      const statsData: (string | number)[][] = [];
      if (dashboardData.stats) {
        statsData.push(["Metric", "Value"]);
        statsData.push(["Attendance Present", dashboardData.stats.attendance?.present || 0]);
        statsData.push(["Attendance Total", dashboardData.stats.attendance?.total || 0]);
        statsData.push(["Attendance Percentage", `${dashboardData.stats.attendance?.percentage?.toFixed(1) || 0}%`]);
        statsData.push(["Projects Completed", dashboardData.stats.projects?.completed || 0]);
        statsData.push(["Projects Total", dashboardData.stats.projects?.total || 0]);
        statsData.push(["Total Clients", dashboardData.stats.clients || 0]);
        statsData.push(["Tasks Completed", dashboardData.stats.tasks?.completed || 0]);
        statsData.push(["Tasks Total", dashboardData.stats.tasks?.total || 0]);
        statsData.push(["Earnings", dashboardData.stats.earnings || 0]);
        statsData.push(["Weekly Profit", dashboardData.stats.weeklyProfit || 0]);
        statsData.push(["Total Employees", dashboardData.stats.employees || 0]);
      }
      const statsWS = XLSX.utils.aoa_to_sheet(statsData);
      XLSX.utils.book_append_sheet(wb, statsWS, "Dashboard Stats");

      // Employee Status Sheet
      if (dashboardData.employeeStatus) {
        const employeeStatusData: (string | number)[][] = [["Status", "Count"]];
        Object.entries(dashboardData.employeeStatus.distribution).forEach(([status, count]) => {
          employeeStatusData.push([status, count]);
        });
        const employeeStatusWS = XLSX.utils.aoa_to_sheet(employeeStatusData);
        XLSX.utils.book_append_sheet(wb, employeeStatusWS, "Employee Status");
      }

      // Employees by Department Sheet
      if (dashboardData.employeesByDepartment) {
        const deptData: (string | number)[][] = [["Department", "Employee Count"]];
        dashboardData.employeesByDepartment.forEach((dept) => {
          deptData.push([dept.department, dept.count]);
        });
        const deptWS = XLSX.utils.aoa_to_sheet(deptData);
        XLSX.utils.book_append_sheet(wb, deptWS, "Employees by Department");
      }

      // Recent Invoices Sheet
      if (dashboardData.recentInvoices) {
        const invoiceData: (string | number)[][] = [["Invoice Number", "Title", "Client", "Amount", "Status"]];
        dashboardData.recentInvoices.forEach((invoice) => {
          invoiceData.push([
            invoice.invoiceNumber,
            invoice.title,
            invoice.clientName,
            invoice.amount,
            invoice.status
          ]);
        });
        const invoiceWS = XLSX.utils.aoa_to_sheet(invoiceData);
        XLSX.utils.book_append_sheet(wb, invoiceWS, "Recent Invoices");
      }

      // Projects Data Sheet
      if (dashboardData.projectsData) {
        const projectData: (string | number)[][] = [["Project Name", "Hours", "Total Hours", "Progress %", "Priority", "Deadline"]];
        dashboardData.projectsData.forEach((project) => {
          projectData.push([
            project.name,
            project.hours,
            project.totalHours,
            project.progress,
            project.priority,
            formatDate(project.deadline)
          ]);
        });
        const projectWS = XLSX.utils.aoa_to_sheet(projectData);
        XLSX.utils.book_append_sheet(wb, projectWS, "Projects");
      }

      // Recent Activities Sheet
      if (dashboardData.recentActivities) {
        const activityData: string[][] = [["Employee", "Action", "Description", "Date"]];
        dashboardData.recentActivities.forEach((activity) => {
          activityData.push([
            activity.employeeName,
            activity.action,
            activity.description,
            formatDate(activity.createdAt)
          ]);
        });
        const activityWS = XLSX.utils.aoa_to_sheet(activityData);
        XLSX.utils.book_append_sheet(wb, activityWS, "Recent Activities");
      }

      // Attendance Overview Sheet
      if (dashboardData.attendanceOverview) {
        const attendanceData: (string | number)[][] = [["Metric", "Count"]];
        attendanceData.push(["Total", dashboardData.attendanceOverview.total]);
        attendanceData.push(["Present", dashboardData.attendanceOverview.present]);
        attendanceData.push(["Late", dashboardData.attendanceOverview.late]);
        attendanceData.push(["Permission", dashboardData.attendanceOverview.permission]);
        attendanceData.push(["Absent", dashboardData.attendanceOverview.absent]);
        const attendanceWS = XLSX.utils.aoa_to_sheet(attendanceData);
        XLSX.utils.book_append_sheet(wb, attendanceWS, "Attendance Overview");
      }

      // Clock In/Out Data Sheet
      if (dashboardData.clockInOutData) {
        const clockData: (string | number)[][] = [["Employee", "Position", "Clock In", "Clock Out", "Status", "Hours Worked"]];
        dashboardData.clockInOutData.forEach((record) => {
          clockData.push([
            record.name,
            record.position,
            formatTime(record.clockIn),
            formatTime(record.clockOut),
            record.status,
            record.hoursWorked
          ]);
        });
        const clockWS = XLSX.utils.aoa_to_sheet(clockData);
        XLSX.utils.book_append_sheet(wb, clockWS, "Clock In-Out Data");
      }

      // Todos Sheet
      if (filteredTodos && filteredTodos.length > 0) {
        const todoData: string[][] = [["Title", "Completed", "Created Date"]];
        filteredTodos.forEach((todo) => {
          todoData.push([
            todo.title,
            todo.completed ? "Yes" : "No",
            formatDate(todo.createdAt)
          ]);
        });
        const todoWS = XLSX.utils.aoa_to_sheet(todoData);
        XLSX.utils.book_append_sheet(wb, todoWS, "Todos");
      }

      // Save the Excel file
      XLSX.writeFile(wb, `admin-dashboard-report-${currentDate.replace(/\//g, '-')}.xlsx`);
    } catch (error) {
      console.error("Error generating Excel:", error);
      alert("Error generating Excel export. Please try again.");
    }
  };

  // Filter invoices based on the selected filter
  const filteredInvoices = useMemo(() => {
    if (!dashboardData.recentInvoices || invoiceFilter === 'all') {
      return dashboardData.recentInvoices || [];
    }

    return dashboardData.recentInvoices.filter(invoice => {
      if (invoiceFilter === 'paid') {
        return invoice.status?.toLowerCase() === 'paid';
      } else if (invoiceFilter === 'unpaid') {
        return invoice.status?.toLowerCase() === 'unpaid';
      }
      return true;
    });
  }, [dashboardData.recentInvoices, invoiceFilter]);

  // Format growth percentage display
  const formatGrowthPercentage = (value: number | undefined) => {
    if (!value) return '0%';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getGrowthIconClass = (value: number | undefined) => {
    if (!value) return 'fa-solid fa-minus';
    return value >= 0 ? 'fa-solid fa-caret-up' : 'fa-solid fa-caret-down';
  };

  const getGrowthTextClass = (value: number | undefined) => {
    if (!value) return 'text-secondary';
    return value >= 0 ? 'text-success' : 'text-danger';
  };

  if (loading || !isLoaded) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
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
              <h2 className="mb-1">Admin Dashboard</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">Dashboard</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Admin Dashboard
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
              <div className="me-2 mb-2">
                <div className="dropdown">
                  <Link to="#"
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
                          exportToPDF();
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
                          exportToExcel();
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
                <div className="input-icon w-120 position-relative">
                  <span className="input-icon-addon">
                    <i className="ti ti-calendar text-gray-9" />
                  </span>
                  <Calendar value={date} onChange={(e: any) => handleYearChange(e.value)} view="year" dateFormat="yy" className="Calendar-form" />
                </div>
              </div>
              <div className="ms-2 head-icons">
                <CollapseHeader />
              </div>
            </div>
          </div>
          {/* /Breadcrumb */}

          {/* Welcome Wrap */}
          <div className="card border-0">
            <div className="card-body d-flex align-items-center justify-content-between flex-wrap pb-1">
              <div className="d-flex align-items-center mb-3">
                <span className="avatar avatar-xl flex-shrink-0">
                  {isSignedIn && user ? (
                    <img
                      src={getUserImage()}
                      alt="Profile"
                      className="rounded-circle"
                      onError={handleImageError}
                    />
                  ) : (
                    <ImageWithBasePath
                      src="assets/img/profiles/avatar-31.jpg"
                      className="rounded-circle"
                      alt="img"
                    />
                  )}
                </span>
                <div className="ms-3">
                  <h3 className="mb-2">
                    Welcome Back, {getUserName()}{" "}
                    <Link to="#" className="edit-icon">
                      <i className="ti ti-edit fs-14" />
                    </Link>
                  </h3>
                  <p>
                    You have{" "}
                    <span className="text-primary text-decoration-underline">
                      {dashboardData.pendingItems?.approvals || 0}
                    </span>{" "}
                    Pending Approvals &amp;{" "}
                    <span className="text-primary text-decoration-underline">
                      {dashboardData.pendingItems?.leaveRequests || 0}
                    </span>{" "}
                    Leave Requests
                  </p>
                </div>
              </div>
              <div className="d-flex align-items-center flex-wrap mb-1">
                <Link
                  to="#"
                  className="btn btn-secondary btn-md me-2 mb-2"
                  data-bs-toggle="modal" data-inert={true}
                  data-bs-target="#add_project"
                >
                  <i className="ti ti-square-rounded-plus me-1" />
                  Add Project
                </Link>
                <Link
                  to="#"
                  className="btn btn-primary btn-md mb-2"
                  data-bs-toggle="modal" data-inert={true}
                  data-bs-target="#add_leaves"
                >
                  <i className="ti ti-square-rounded-plus me-1" />
                  Add Requests
                </Link>
              </div>
            </div>
          </div>
          {/* /Welcome Wrap */}

          <div className="row">
            {/* Widget Info */}
            <div className="col-xxl-8 d-flex">
              <div className="row flex-fill">
                <div className="col-md-3 d-flex">
                  <div className="card flex-fill">
                    <div className="card-body">
                      <span className="avatar rounded-circle bg-primary mb-2">
                        <i className="ti ti-calendar-share fs-16" />
                      </span>
                      <h6 className="fs-13 fw-medium text-default mb-1">
                        Attendance
                      </h6>
                      <h3 className="mb-3">
                        {dashboardData.stats?.attendance?.present || 0}/{dashboardData.stats?.attendance?.total || 0}{" "}
                        <span className={`fs-12 fw-medium ${getGrowthTextClass(dashboardData.stats?.attendance?.percentage)}`}>
                          <i className={`${getGrowthIconClass(dashboardData.stats?.attendance?.percentage)} me-1`} />
                          {formatGrowthPercentage(dashboardData.stats?.attendance?.percentage)}
                        </span>
                      </h3>
                      <Link to="/attendance-employee" className="link-default">
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
                <div className="col-md-3 d-flex">
                  <div className="card flex-fill">
                    <div className="card-body">
                      <span className="avatar rounded-circle bg-secondary mb-2">
                        <i className="ti ti-browser fs-16" />
                      </span>
                      <h6 className="fs-13 fw-medium text-default mb-1">
                        Total Projects
                      </h6>
                      <h3 className="mb-3">
                        {dashboardData.stats?.projects?.completed || 0}/{dashboardData.stats?.projects?.total || 0}{" "}
                        <span className={`fs-12 fw-medium ${getGrowthTextClass(dashboardData.stats?.projects?.percentage)}`}>
                          <i className={`${getGrowthIconClass(dashboardData.stats?.projects?.percentage)} me-1`} />
                          {formatGrowthPercentage(dashboardData.stats?.projects?.percentage)}
                        </span>
                      </h3>
                      <Link to="/projects" className="link-default">
                        View All
                      </Link>
                    </div>
                  </div>
                </div>
                <div className="col-md-3 d-flex">
                  <div className="card flex-fill">
                    <div className="card-body">
                      <span className="avatar rounded-circle bg-info mb-2">
                        <i className="ti ti-users-group fs-16" />
                      </span>
                      <h6 className="fs-13 fw-medium text-default mb-1">
                        Total Clients
                      </h6>
                      <h3 className="mb-3">
                        {dashboardData.stats?.clients || 0}{" "}
                        <span className={`fs-12 fw-medium ${getGrowthTextClass(dashboardData.stats?.clientsGrowth)}`}>
                          <i className={`${getGrowthIconClass(dashboardData.stats?.clientsGrowth)} me-1`} />
                          {formatGrowthPercentage(dashboardData.stats?.clientsGrowth)}
                        </span>
                      </h3>
                      <Link to="/clients" className="link-default">
                        View All
                      </Link>
                    </div>
                  </div>
                </div>
                <div className="col-md-3 d-flex">
                  <div className="card flex-fill">
                    <div className="card-body">
                      <span className="avatar rounded-circle bg-pink mb-2">
                        <i className="ti ti-checklist fs-16" />
                      </span>
                      <h6 className="fs-13 fw-medium text-default mb-1">
                        Total Tasks
                      </h6>
                      <h3 className="mb-3">
                        {dashboardData.stats?.tasks?.completed || 0}/{dashboardData.stats?.tasks?.total || 0}{" "}
                        <span className={`fs-12 fw-medium ${getGrowthTextClass(dashboardData.stats?.tasksGrowth)}`}>
                          <i className={`${getGrowthIconClass(dashboardData.stats?.tasksGrowth)} me-1`} />
                          {formatGrowthPercentage(dashboardData.stats?.tasksGrowth)}
                        </span>
                      </h3>
                      <Link to="/tasks" className="link-default">
                        View All
                      </Link>
                    </div>
                  </div>
                </div>
                <div className="col-md-3 d-flex">
                  <div className="card flex-fill">
                    <div className="card-body">
                      <span className="avatar rounded-circle bg-purple mb-2">
                        <i className="ti ti-moneybag fs-16" />
                      </span>
                      <h6 className="fs-13 fw-medium text-default mb-1">
                        Earnings
                      </h6>
                      <h3 className="mb-3">
                        ${dashboardData.stats?.earnings || 0}{" "}
                        <span className={`fs-12 fw-medium ${getGrowthTextClass(dashboardData.stats?.earningsGrowth)}`}>
                          <i className={`${getGrowthIconClass(dashboardData.stats?.earningsGrowth)} me-1`} />
                          {formatGrowthPercentage(dashboardData.stats?.earningsGrowth)}
                        </span>
                      </h3>
                      <Link to="/expenses" className="link-default">
                        View All
                      </Link>
                    </div>
                  </div>
                </div>
                <div className="col-md-3 d-flex">
                  <div className="card flex-fill">
                    <div className="card-body">
                      <span className="avatar rounded-circle bg-danger mb-2">
                        <i className="ti ti-browser fs-16" />
                      </span>
                      <h6 className="fs-13 fw-medium text-default mb-1">
                        Profit This Week
                      </h6>
                      <h3 className="mb-3">
                        ${dashboardData.stats?.weeklyProfit || 0}{" "}
                        <span className={`fs-12 fw-medium ${getGrowthTextClass(dashboardData.stats?.profitGrowth)}`}>
                          <i className={`${getGrowthIconClass(dashboardData.stats?.profitGrowth)} me-1`} />
                          {formatGrowthPercentage(dashboardData.stats?.profitGrowth)}
                        </span>
                      </h3>
                      <Link to="/purchase-transaction" className="link-default">
                        View All
                      </Link>
                    </div>
                  </div>
                </div>
                <div className="col-md-3 d-flex">
                  <div className="card flex-fill">
                    <div className="card-body">
                      <span className="avatar rounded-circle bg-success mb-2">
                        <i className="ti ti-users-group fs-16" />
                      </span>
                      <h6 className="fs-13 fw-medium text-default mb-1">
                        Job Applicants
                      </h6>
                      <h3 className="mb-3">
                        {dashboardData.stats?.jobApplications || 0}{" "}
                        <span className={`fs-12 fw-medium ${getGrowthTextClass(dashboardData.stats?.applicationsGrowth)}`}>
                          <i className={`${getGrowthIconClass(dashboardData.stats?.applicationsGrowth)} me-1`} />
                          {formatGrowthPercentage(dashboardData.stats?.applicationsGrowth)}
                        </span>
                      </h3>
                      <Link to="/job-list" className="link-default">
                        View All
                      </Link>
                    </div>
                  </div>
                </div>
                <div className="col-md-3 d-flex">
                  <div className="card flex-fill">
                    <div className="card-body">
                      <span className="avatar rounded-circle bg-dark mb-2">
                        <i className="ti ti-user-star fs-16" />
                      </span>
                      <h6 className="fs-13 fw-medium text-default mb-1">
                        Employees
                      </h6>
                      <h3 className="mb-3">
                        {dashboardData.stats?.employees || 0}{" "}
                        <span className={`fs-12 fw-medium ${getGrowthTextClass(dashboardData.stats?.employeesGrowth)}`}>
                          <i className={`${getGrowthIconClass(dashboardData.stats?.employeesGrowth)} me-1`} />
                          {formatGrowthPercentage(dashboardData.stats?.employeesGrowth)}
                        </span>
                      </h3>
                      <Link to="/employees" className="link-default">
                        View All
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* /Widget Info */}

            {/* Employees By Department */}
            <div className="col-xxl-4 d-flex">
              <div className="card flex-fill">
                <div className="card-header pb-2 d-flex align-items-center justify-content-between flex-wrap">
                  <h5 className="mb-2">Employees By Department</h5>
                  <div className="dropdown mb-2">
                    <Link to="#"
                      className="btn btn-white border btn-sm d-inline-flex align-items-center"
                      data-bs-toggle="dropdown"
                    >
                      <i className="ti ti-calendar me-1" />
                      {filters.employeesByDepartment === 'today' ? 'Today' :
                        filters.employeesByDepartment === 'week' ? 'This Week' :
                        filters.employeesByDepartment === 'month' ? 'This Month' :
                        filters.employeesByDepartment === 'year' ? 'This Year' : 'All Time'}
                    </Link>
                    <ul className="dropdown-menu  dropdown-menu-end p-3">
                      <li>
                        <Link to="#"
                          className={`dropdown-item rounded-1 ${filters.employeesByDepartment === 'all' ? 'active' : ''}`}
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange('employeesByDepartment', 'all');
                          }}
                        >
                          All Time
                        </Link>
                      </li>
                      <li>
                        <Link to="#"
                          className={`dropdown-item rounded-1 ${filters.employeesByDepartment === 'year' ? 'active' : ''}`}
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange('employeesByDepartment', 'year');
                          }}
                        >
                          This Year
                        </Link>
                      </li>
                      <li>
                        <Link to="#"
                          className={`dropdown-item rounded-1 ${filters.employeesByDepartment === 'month' ? 'active' : ''}`}
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange('employeesByDepartment', 'month');
                          }}
                        >
                          This Month
                        </Link>
                      </li>
                      <li>
                        <Link to="#"
                          className={`dropdown-item rounded-1 ${filters.employeesByDepartment === 'week' ? 'active' : ''}`}
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange('employeesByDepartment', 'week');
                          }}
                        >
                          This Week
                        </Link>
                      </li>
                      <li>
                        <Link to="#"
                          className={`dropdown-item rounded-1 ${filters.employeesByDepartment === 'today' ? 'active' : ''}`}
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange('employeesByDepartment', 'today');
                          }}
                        >
                          Today
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="card-body">
                  <ReactApexChart
                    id="emp-department"
                    options={empDepartmentOptions}
                    series={empDepartmentOptions.series}
                    type="bar"
                    height={220}
                  />
                  <p className="fs-13">
                    <i className="ti ti-circle-filled me-2 fs-8 text-primary" />
                    No of Employees {dashboardData.employeeGrowth?.trend === 'up' ? 'increased' : dashboardData.employeeGrowth?.trend === 'down' ? 'decreased' : 'remained stable'} by{" "}
                    <span className={`fw-bold ${dashboardData.employeeGrowth?.trend === 'up' ? 'text-success' : dashboardData.employeeGrowth?.trend === 'down' ? 'text-danger' : 'text-secondary'}`}>
                      {dashboardData.employeeGrowth?.trend === 'up' ? '+' : dashboardData.employeeGrowth?.trend === 'down' ? '-' : ''}
                      {Math.abs(dashboardData.employeeGrowth?.percentage || 0)}%
                    </span> from last {filters.employeesByDepartment === 'today' ? 'Day' :
                      filters.employeesByDepartment === 'week' ? 'Week' :
                      filters.employeesByDepartment === 'month' ? 'Month' :
                      filters.employeesByDepartment === 'year' ? 'Year' : 'Period'}
                  </p>
                </div>
              </div>
            </div>
            {/* /Employees By Department */}
          </div>

          <div className="row">
            {/* Total Employee */}
            <div className="col-xxl-4 d-flex">
              <div className="card flex-fill">
                <div className="card-header pb-2 d-flex align-items-center justify-content-between flex-wrap">
                  <h5 className="mb-2">Employee Status</h5>
                  <div className="dropdown mb-2">
                    <Link to="#"
                      className="btn btn-white border btn-sm d-inline-flex align-items-center"
                      data-bs-toggle="dropdown"
                    >
                      <i className="ti ti-calendar me-1" />
                      {filters.employeeStatus === 'today' ? 'Today' :
                        filters.employeeStatus === 'week' ? 'This Week' :
                        filters.employeeStatus === 'month' ? 'This Month' : 'All'}
                    </Link>
                    <ul className="dropdown-menu  dropdown-menu-end p-3">
                      <li>
                        <Link to="#"
                          className={`dropdown-item rounded-1 ${filters.employeeStatus === 'month' ? 'active' : ''}`}
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange('employeeStatus', 'month');
                          }}
                        >
                          This Month
                        </Link>
                      </li>
                      <li>
                        <Link to="#"
                          className={`dropdown-item rounded-1 ${filters.employeeStatus === 'week' ? 'active' : ''}`}
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange('employeeStatus', 'week');
                          }}
                        >
                          This Week
                        </Link>
                      </li>
                      <li>
                        <Link to="#"
                          className={`dropdown-item rounded-1 ${filters.employeeStatus === 'today' ? 'active' : ''}`}
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange('employeeStatus', 'today');
                          }}
                        >
                          Today
                        </Link>
                      </li>
                      <li>
                        <Link to="#"
                          className={`dropdown-item rounded-1 ${filters.employeeStatus === 'all' ? 'active' : ''}`}
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange('employeeStatus', 'all');
                          }}
                        >
                          All
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <p className="fs-13 mb-3">Total Employee</p>
                    <h3 className="mb-3">{dashboardData.employeeStatus?.total || 0}</h3>
                  </div>
                  <div className="progress-stacked emp-stack mb-3">
                    <div
                      className="progress"
                      role="progressbar"
                      aria-label="Segment one"
                      aria-valuenow={statusPercentages.fulltime}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      style={{ width: `${statusPercentages.fulltime}%` }}
                    >
                      <div className="progress-bar bg-warning" />
                    </div>
                    <div
                      className="progress"
                      role="progressbar"
                      aria-label="Segment two"
                      aria-valuenow={statusPercentages.contract}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      style={{ width: `${statusPercentages.contract}%` }}
                    >
                      <div className="progress-bar bg-secondary" />
                    </div>
                    <div
                      className="progress"
                      role="progressbar"
                      aria-label="Segment three"
                      aria-valuenow={statusPercentages.probation}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      style={{ width: `${statusPercentages.probation}%` }}
                    >
                      <div className="progress-bar bg-danger" />
                    </div>
                    <div
                      className="progress"
                      role="progressbar"
                      aria-label="Segment four"
                      aria-valuenow={statusPercentages.wfh}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      style={{ width: `${statusPercentages.wfh}%` }}
                    >
                      <div className="progress-bar bg-pink" />
                    </div>
                  </div>
                  <div className="border mb-3">
                    <div className="row gx-0">
                      <div className="col-6">
                        <div className="p-2 flex-fill border-end border-bottom">
                          <p className="fs-13 mb-2">
                            <i className="ti ti-square-filled text-primary fs-12 me-2" />
                            Fulltime <span className="text-gray-9">({statusPercentages.fulltime}%)</span>
                          </p>
                          <h2 className="display-1">{dashboardData.employeeStatus?.distribution?.["Fulltime"] || 0}</h2>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="p-2 flex-fill border-bottom text-end">
                          <p className="fs-13 mb-2">
                            <i className="ti ti-square-filled me-2 text-secondary fs-12" />
                            Contract <span className="text-gray-9">({statusPercentages.contract}%)</span>
                          </p>
                          <h2 className="display-1">{dashboardData.employeeStatus?.distribution?.["Contract"] || 0}</h2>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="p-2 flex-fill border-end">
                          <p className="fs-13 mb-2">
                            <i className="ti ti-square-filled me-2 text-danger fs-12" />
                            Probation <span className="text-gray-9">({statusPercentages.probation}%)</span>
                          </p>
                          <h2 className="display-1">{dashboardData.employeeStatus?.distribution?.["Probation"] || 0}</h2>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="p-2 flex-fill text-end">
                          <p className="fs-13 mb-2">
                            <i className="ti ti-square-filled text-pink me-2 fs-12" />
                            WFH <span className="text-gray-9">({statusPercentages.wfh}%)</span>
                          </p>
                          <h2 className="display-1">{dashboardData.employeeStatus?.distribution?.["WFH"] || 0}</h2>
                        </div>
                      </div>
                    </div>
                  </div>
                  <h6 className="mb-2">Top Performer</h6>
                  {dashboardData.employeeStatus?.topPerformer && (
                    <div className="p-2 d-flex align-items-center justify-content-between border border-primary bg-primary-100 br-5 mb-4">
                      <div className="d-flex align-items-center overflow-hidden">
                        <span className="me-2">
                          <i className="ti ti-award-filled text-primary fs-24" />
                        </span>
                        <Link
                          to="/employee-details"
                          className="avatar avatar-md me-2"
                        >
                          <ImageWithBasePath
                            src={dashboardData.employeeStatus.topPerformer.avatar}
                            className="rounded-circle border border-white"
                            alt="img"
                          />
                        </Link>
                        <div>
                          <h6 className="text-truncate mb-1 fs-14 fw-medium">
                            <Link to="/employee-details">{dashboardData.employeeStatus.topPerformer.name}</Link>
                          </h6>
                          <p className="fs-13">{dashboardData.employeeStatus.topPerformer.position}</p>
                        </div>
                      </div>
                      <div className="text-end">
                        <p className="fs-13 mb-1">Performance</p>
                        <h5 className="text-primary">{dashboardData.employeeStatus.topPerformer.performance}%</h5>
                      </div>
                    </div>
                  )}
                  <Link to="/employees" className="btn btn-light btn-md w-100">
                    View All Employees
                  </Link>
                </div>
                            </div>
            </div>
            {/* /Total Employee */}

            {/* Attendance Overview */}
            <div className="col-xxl-4 col-xl-6 d-flex">
              <div className="card flex-fill">
                <div className="card-header pb-2 d-flex align-items-center justify-content-between flex-wrap">
                  <h5 className="mb-2">Attendance Overview</h5>
                  <div className="dropdown mb-2">
                    <Link to="#"
                      className="btn btn-white border btn-sm d-inline-flex align-items-center"
                      data-bs-toggle="dropdown"
                    >
                      <i className="ti ti-calendar me-1" />
                      {filters.attendanceOverview === 'today' ? 'Today' :
                        filters.attendanceOverview === 'week' ? 'This Week' :
                        filters.attendanceOverview === 'month' ? 'This Month' : 'All'}
                    </Link>
                    <ul className="dropdown-menu  dropdown-menu-end p-3">
                      <li>
                        <Link to="#"
                          className={`dropdown-item rounded-1 ${filters.attendanceOverview === 'month' ? 'active' : ''}`}
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange('attendanceOverview', 'month');
                          }}
                        >
                          This Month
                        </Link>
                      </li>
                      <li>
                        <Link to="#"
                          className={`dropdown-item rounded-1 ${filters.attendanceOverview === 'week' ? 'active' : ''}`}
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange('attendanceOverview', 'week');
                          }}
                        >
                          This Week
                        </Link>
                      </li>
                      <li>
                        <Link to="#"
                          className={`dropdown-item rounded-1 ${filters.attendanceOverview === 'today' ? 'active' : ''}`}
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange('attendanceOverview', 'today');
                          }}
                        >
                          Today
                        </Link>
                      </li>
                      <li>
                        <Link to="#"
                          className={`dropdown-item rounded-1 ${filters.attendanceOverview === 'all' ? 'active' : ''}`}
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange('attendanceOverview', 'all');
                          }}
                        >
                          All
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="card-body">
                  <div className="chartjs-wrapper-demo position-relative mb-4">
                    <Chart type="doughnut" data={attendanceChartData} options={attendanceChartOptions} className="w-full attendence-chart md:w-30rem" />
                    <div className="position-absolute text-center attendance-canvas">
                      <p className="fs-13 mb-1">Total Attendance</p>
                      <h3>{dashboardData.attendanceOverview?.total || 0}</h3>
                    </div>
                  </div>
                  <h6 className="mb-3">Status</h6>
                  <div className="d-flex align-items-center justify-content-between">
                    <p className="f-13 mb-2">
                      <i className="ti ti-circle-filled text-success me-1" />
                      Present
                    </p>
                    <p className="f-13 fw-medium text-gray-9 mb-2">
                      {dashboardData.attendanceOverview?.present || 0}
                    </p>
                  </div>
                  <div className="d-flex align-items-center justify-content-between">
                    <p className="f-13 mb-2">
                      <i className="ti ti-circle-filled text-secondary me-1" />
                      Late
                    </p>
                    <p className="f-13 fw-medium text-gray-9 mb-2">
                      {dashboardData.attendanceOverview?.late || 0}
                    </p>
                  </div>
                  <div className="d-flex align-items-center justify-content-between">
                    <p className="f-13 mb-2">
                      <i className="ti ti-circle-filled text-warning me-1" />
                      Permission
                    </p>
                    <p className="f-13 fw-medium text-gray-9 mb-2">
                      {dashboardData.attendanceOverview?.permission || 0}
                    </p>
                  </div>
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <p className="f-13 mb-2">
                      <i className="ti ti-circle-filled text-danger me-1" />
                      Absent
                    </p>
                    <p className="f-13 fw-medium text-gray-9 mb-2">
                      {dashboardData.attendanceOverview?.absent || 0}
                    </p>
                  </div>
                  <div className="bg-light br-5 box-shadow-xs p-2 pb-0 d-flex align-items-center justify-content-between flex-wrap">
                    <div className="d-flex align-items-center">
                      <p className="mb-2 me-2">Total Absenties</p>
                      <div className="avatar-list-stacked avatar-group-sm mb-2">
                        {dashboardData.attendanceOverview?.absentees?.slice(0, 4).map((absentee, index) => (
                          <span key={absentee._id} className="avatar avatar-rounded">
                            <ImageWithBasePath
                              className="border border-white"
                              src={absentee.avatar}
                              alt="img"
                            />
                          </span>
                        ))}
                        {(dashboardData.attendanceOverview?.absentees?.length || 0) > 4 && (
                          <Link
                            className="avatar bg-primary avatar-rounded text-fixed-white fs-10"
                            to="#"
                          >
                            +{(dashboardData.attendanceOverview?.absentees?.length || 0) - 4}
                          </Link>
                        )}
                      </div>
                    </div>
                    <Link to="/leaves"
                      className="fs-13 link-primary text-decoration-underline mb-2"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            {/* /Attendance Overview */}

            {/* Clock-In/Out */}
            <div className="col-xxl-4 col-xl-6 d-flex">
              <div className="card flex-fill">
                <div className="card-header pb-2 d-flex align-items-center justify-content-between flex-wrap">
                  <h5 className="mb-2">Clock-In/Out</h5>
                  <div className="d-flex align-items-center">
                    <div className="dropdown mb-2">
                      <Link
                        to="#"
                        className="dropdown-toggle btn btn-white btn-sm d-inline-flex align-items-center border-0 fs-13 me-2"
                        data-bs-toggle="dropdown"
                      >
                        {departmentFilters.clockInOut}
                      </Link>
                      <ul className="dropdown-menu  dropdown-menu-end p-3">
                        <li>
                          <Link to="#"
                            className={`dropdown-item rounded-1 ${departmentFilters.clockInOut === 'All Departments' ? 'active' : ''}`}
                            onClick={(e) => {
                              e.preventDefault();
                              handleDepartmentFilterChange('clockInOut', 'All Departments');
                            }}
                          >
                            All Departments
                          </Link>
                        </li>
                        {dashboardData.employeesByDepartment?.map((dept) => (
                          <li key={dept.department}>
                            <Link to="#"
                              className={`dropdown-item rounded-1 ${departmentFilters.clockInOut === dept.department ? 'active' : ''}`}
                              onClick={(e) => {
                                e.preventDefault();
                                handleDepartmentFilterChange('clockInOut', dept.department);
                              }}
                            >
                              {dept.department}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="dropdown mb-2">
                      <Link
                        to="#"
                        className="btn btn-white border btn-sm d-inline-flex align-items-center"
                        data-bs-toggle="dropdown"
                      >
                        <i className="ti ti-calendar me-1" />
                        {filters.clockInOut === 'today' ? 'Today' :
                          filters.clockInOut === 'week' ? 'This Week' :
                          filters.clockInOut === 'month' ? 'This Month' : 'All'}
                      </Link>
                      <ul className="dropdown-menu  dropdown-menu-end p-3">
                        <li>
                          <Link to="#"
                            className={`dropdown-item rounded-1 ${filters.clockInOut === 'month' ? 'active' : ''}`}
                            onClick={(e) => {
                              e.preventDefault();
                              handleFilterChange('clockInOut', 'month');
                            }}
                          >
                            This Month
                          </Link>
                        </li>
                        <li>
                          <Link to="#"
                            className={`dropdown-item rounded-1 ${filters.clockInOut === 'week' ? 'active' : ''}`}
                            onClick={(e) => {
                              e.preventDefault();
                              handleFilterChange('clockInOut', 'week');
                            }}
                          >
                            This Week
                          </Link>
                        </li>
                        <li>
                          <Link to="#"
                            className={`dropdown-item rounded-1 ${filters.clockInOut === 'today' ? 'active' : ''}`}
                            onClick={(e) => {
                              e.preventDefault();
                              handleFilterChange('clockInOut', 'today');
                            }}
                          >
                            Today
                          </Link>
                        </li>
                        <li>
                          <Link to="#"
                            className={`dropdown-item rounded-1 ${filters.clockInOut === 'all' ? 'active' : ''}`}
                            onClick={(e) => {
                              e.preventDefault();
                              handleFilterChange('clockInOut', 'all');
                            }}
                          >
                            All
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  <div>
                    {dashboardData.clockInOutData?.slice(0, 3).map((employee, index) => (
                      <div key={employee._id} className={`d-flex align-items-center justify-content-between mb-3 p-2 border ${index === 0 ? 'border-dashed' : ''} br-5`}>
                        <div className="d-flex align-items-center">
                          <Link to="#" className="avatar flex-shrink-0">
                            <ImageWithBasePath
                              src={employee.avatar}
                              className="rounded-circle border border-2"
                              alt="img"
                            />
                          </Link>
                          <div className="ms-2">
                            <h6 className="fs-14 fw-medium text-truncate">
                              {employee.name}
                            </h6>
                            <p className="fs-13">{employee.position}</p>
                          </div>
                        </div>
                        <div className="d-flex align-items-center">
                          <Link to="#" className="link-default me-2">
                            <i className="ti ti-clock-share" />
                          </Link>
                          <span className={`fs-10 fw-medium d-inline-flex align-items-center badge ${employee.status === 'Present' ? 'badge-success' : 'badge-danger'}`}>
                            <i className="ti ti-circle-filled fs-5 me-1" />
                            {formatTime(employee.clockIn)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <h6 className="mb-2">Late</h6>
                  {dashboardData.clockInOutData?.filter(emp => emp.status === 'Late').slice(0, 1).map((employee) => (
                    <div key={employee._id} className="d-flex align-items-center justify-content-between mb-3 p-2 border border-dashed br-5">
                      <div className="d-flex align-items-center">
                        <span className="avatar flex-shrink-0">
                          <ImageWithBasePath
                            src={employee.avatar}
                            className="rounded-circle border border-2"
                            alt="img"
                          />
                        </span>
                        <div className="ms-2">
                          <h6 className="fs-14 fw-medium text-truncate">
                            {employee.name}{" "}
                            <span className="fs-10 fw-medium d-inline-flex align-items-center badge badge-warning">
                              <i className="ti ti-clock-hour-11 me-1" />
                              Late
                            </span>
                          </h6>
                          <p className="fs-13">{employee.position}</p>
                        </div>
                      </div>
                      <div className="d-flex align-items-center">
                        <Link to="#" className="link-default me-2">
                          <i className="ti ti-clock-share" />
                        </Link>
                        <span className="fs-10 fw-medium d-inline-flex align-items-center badge badge-danger">
                          <i className="ti ti-circle-filled fs-5 me-1" />
                          {formatTime(employee.clockIn)}
                        </span>
                      </div>
                    </div>
                  ))}
                  <Link to="/attendance-report" className="btn btn-light btn-md w-100">
                    View All Attendance
                  </Link>
                </div>
              </div>
            </div>
            {/* /Clock-In/Out */}
          </div>

          <div className="row">
            {/* Jobs Applicants */}
            <div className="col-xxl-4 d-flex">
              <div className="card flex-fill">
                <div className="card-header pb-2 d-flex align-items-center justify-content-between flex-wrap">
                  <h5 className="mb-2">Jobs Applicants</h5>
                  <Link to="/job-list" className="btn btn-light btn-md mb-2">
                    View All
                  </Link>
                </div>
                <div className="card-body">
                  <ul
                    className="nav nav-tabs tab-style-1 nav-justified d-sm-flex d-block p-0 mb-4"
                    role="tablist"
                  >
                    <li className="nav-item" role="presentation">
                      <Link
                        className="nav-link fw-medium"
                        data-bs-toggle="tab"
                        data-bs-target="#openings"
                        aria-current="page"
                        to="#openings"
                        aria-selected="true"
                        role="tab"
                      >
                        Openings
                      </Link>
                    </li>
                    <li className="nav-item" role="presentation">
                      <Link
                        className="nav-link fw-medium active"
                        data-bs-toggle="tab"
                        data-bs-target="#applicants"
                        to="#applicants"
                        aria-selected="false"
                        tabIndex={-1}
                        role="tab"
                      >
                        Applicants
                      </Link>
                    </li>
                  </ul>
                  <div className="tab-content">
                    <div className="tab-pane fade" id="openings">
                      {dashboardData.jobApplicants?.openings?.map((opening, index) => (
                        <div key={opening._id} className="d-flex align-items-center justify-content-between mb-4">
                          <div className="d-flex align-items-center">
                            <Link to="#" className="avatar overflow-hidden flex-shrink-0 bg-gray-100">
                              <ImageWithBasePath
                                src="assets/img/icons/apple.svg"
                                className="img-fluid rounded-circle w-auto h-auto"
                                alt="img"
                              />
                            </Link>
                            <div className="ms-2 overflow-hidden">
                              <p className="text-dark fw-medium text-truncate mb-0">
                                <Link to="#">{opening._id}</Link>
                              </p>
                              <span className="fs-12">No of Openings : {opening.count}</span>
                            </div>
                          </div>
                          <Link to="#" className="btn btn-light btn-sm p-0 btn-icon d-flex align-items-center justify-content-center">
                            <i className="ti ti-edit" />
                          </Link>
                        </div>
                      ))}
                    </div>
                    <div className="tab-pane fade show active" id="applicants">
                      {dashboardData.jobApplicants?.applicants?.map((applicant, index) => (
                        <div key={applicant._id} className="d-flex align-items-center justify-content-between mb-4">
                          <div className="d-flex align-items-center">
                            <Link to="#" className="avatar overflow-hidden flex-shrink-0">
                              <ImageWithBasePath
                                src={applicant.avatar}
                                className="img-fluid rounded-circle"
                                alt="img"
                              />
                            </Link>
                            <div className="ms-2 overflow-hidden">
                              <p className="text-dark fw-medium text-truncate mb-0">
                                <Link to="#">{applicant.name}</Link>
                              </p>
                              <span className="fs-13 d-inline-flex align-items-center">
                                Exp : {applicant.experience}
                                <i className="ti ti-circle-filled fs-4 mx-2 text-primary" />
                                {applicant.location}
                              </span>
                            </div>
                          </div>
                          <span className="badge badge-secondary badge-xs">
                            {applicant.position}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* /Jobs Applicants */}

            {/* Employees */}
            <div className="col-xxl-4 col-xl-6 d-flex">
              <div className="card flex-fill">
                <div className="card-header pb-2 d-flex align-items-center justify-content-between flex-wrap">
                  <h5 className="mb-2">Employees</h5>
                  <Link to="/employees" className="btn btn-light btn-md mb-2">
                    View All
                  </Link>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-nowrap mb-0">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Department</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardData.employeesList?.slice(0, 5).map((employee, index) => (
                          <tr key={employee._id}>
                            <td>
                              <div className="d-flex align-items-center">
                                <Link to="#" className="avatar">
                                  <ImageWithBasePath
                                    src={employee.avatar}
                                    className="img-fluid rounded-circle"
                                    alt="img"
                                  />
                                </Link>
                                <div className="ms-2">
                                  <h6 className="fw-medium">
                                    <Link to="#">{employee.name}</Link>
                                  </h6>
                                  <span className="fs-12">{employee.position}</span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="badge badge-secondary-transparent badge-xs">
                                {employee.department}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
            {/* /Employees */}

            {/* Todo */}
            <div className="col-xxl-4 col-xl-6 d-flex">
              <div className="card flex-fill">
                <div className="card-header pb-2 d-flex align-items-center justify-content-between flex-wrap">
                  <h5 className="mb-2">Todo</h5>
                  <div className="d-flex align-items-center">
                    <div className="dropdown mb-2 me-2">
                      <Link
                        to="#"
                        className="btn btn-white border btn-sm d-inline-flex align-items-center"
                        data-bs-toggle="dropdown"
                      >
                        <i className="ti ti-calendar me-1" />
                        {todoFilter === 'today' ? 'Today' :
                          todoFilter === 'week' ? 'This Week' :
                          todoFilter === 'month' ? 'This Month' : 'All'}
                      </Link>
                      <ul className="dropdown-menu  dropdown-menu-end p-3">
                        <li>
                          <Link to="#"
                            className={`dropdown-item rounded-1 ${todoFilter === 'month' ? 'active' : ''}`}
                            onClick={(e) => {
                              e.preventDefault();
                              handleTodoFilterChange('month');
                            }}
                          >
                            This Month
                          </Link>
                        </li>
                        <li>
                          <Link to="#"
                            className={`dropdown-item rounded-1 ${todoFilter === 'week' ? 'active' : ''}`}
                            onClick={(e) => {
                              e.preventDefault();
                              handleTodoFilterChange('week');
                            }}
                          >
                            This Week
                          </Link>
                        </li>
                        <li>
                          <Link to="#"
                            className={`dropdown-item rounded-1 ${todoFilter === 'today' ? 'active' : ''}`}
                            onClick={(e) => {
                              e.preventDefault();
                              handleTodoFilterChange('today');
                            }}
                          >
                            Today
                          </Link>
                        </li>
                        <li>
                          <Link to="#"
                            className={`dropdown-item rounded-1 ${todoFilter === 'all' ? 'active' : ''}`}
                            onClick={(e) => {
                              e.preventDefault();
                              handleTodoFilterChange('all');
                            }}
                          >
                            All
                          </Link>
                        </li>
                      </ul>
                    </div>
                    <Link to="#"
                      className="btn btn-primary btn-icon btn-xs rounded-circle d-flex align-items-center justify-content-center p-0 mb-2"
                      data-bs-toggle="modal" data-inert={true}
                      data-bs-target="#add_todo"
                    >
                      <i className="ti ti-plus fs-16" />
                    </Link>
                  </div>
                </div>
                <div className="card-body">
                  {filteredTodos.map((todo, index) => (
                    <div key={todo._id} className={`d-flex align-items-center todo-item border p-2 br-5 mb-2 ${todo.completed ? 'todo-strike' : ''}`}>
                      <i className="ti ti-grid-dots me-2" />
                      <div className="form-check flex-grow-1">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`todo${index}`}
                          checked={todo.completed}
                          onChange={() => toggleTodo(todo._id, !todo.completed)}
                        />
                        <label className="form-check-label fw-medium" htmlFor={`todo${index}`}>
                          {todo.title}
                        </label>
                      </div>
                      <div className="todo-actions ms-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger btn-icon"
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this todo? This action cannot be undone.')) {
                              deleteTodo(todo._id);
                            }
                          }}
                          title="Delete todo"
                        >
                          <i className="ti ti-trash fs-12" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {(!dashboardData.todos || filteredTodos.length === 0) && (
                    <div className="text-center py-4">
                      <p className="text-muted">No todos found for the selected period.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* /Todo */}
          </div>

          <div className="row">
            {/* Sales Overview */}
            <div className="col-xl-7 d-flex">
              <div className="card flex-fill">
                <div className="card-header pb-2 d-flex align-items-center justify-content-between flex-wrap">
                  <h5 className="mb-2">Sales Overview</h5>
                  <div className="d-flex align-items-center">
                    <div className="dropdown mb-2">
                      <Link
                        to="#"
                        className="dropdown-toggle btn btn-white border-0 btn-sm d-inline-flex align-items-center fs-13 me-2"
                        data-bs-toggle="dropdown"
                      >
                        {departmentFilters.salesOverview}
                      </Link>
                      <ul className="dropdown-menu  dropdown-menu-end p-3">
                        <li>
                          <Link to="#"
                            className={`dropdown-item rounded-1 ${departmentFilters.salesOverview === 'All Departments' ? 'active' : ''}`}
                            onClick={(e) => {
                              e.preventDefault();
                              handleDepartmentFilterChange('salesOverview', 'All Departments');
                            }}
                          >
                            All Departments
                          </Link>
                        </li>
                        {dashboardData.employeesByDepartment?.map((dept) => (
                          <li key={dept.department}>
                            <Link to="#"
                              className={`dropdown-item rounded-1 ${departmentFilters.salesOverview === dept.department ? 'active' : ''}`}
                              onClick={(e) => {
                                e.preventDefault();
                                handleDepartmentFilterChange('salesOverview', dept.department);
                              }}
                            >
                              {dept.department}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="dropdown mb-2">
                      <Link
                        to="#"
                        className="btn btn-white border btn-sm d-inline-flex align-items-center"
                        data-bs-toggle="dropdown"
                      >
                        <i className="ti ti-calendar me-1" />
                        {filters.salesOverview === 'today' ? 'Today' :
                         filters.salesOverview === 'week' ? 'This Week' :
                         filters.salesOverview === 'month' ? 'This Month' : 'All'}
                      </Link>
                      <ul className="dropdown-menu  dropdown-menu-end p-3">
                        <li>
                          <Link to="#"
                            className={`dropdown-item rounded-1 ${filters.salesOverview === 'month' ? 'active' : ''}`}
                            onClick={(e) => {
                              e.preventDefault();
                              handleFilterChange('salesOverview', 'month');
                            }}
                          >
                            This Month
                          </Link>
                        </li>
                        <li>
                          <Link to="#"
                            className={`dropdown-item rounded-1 ${filters.salesOverview === 'week' ? 'active' : ''}`}
                            onClick={(e) => {
                              e.preventDefault();
                              handleFilterChange('salesOverview', 'week');
                            }}
                          >
                            This Week
                          </Link>
                        </li>
                        <li>
                          <Link to="#"
                            className={`dropdown-item rounded-1 ${filters.salesOverview === 'today' ? 'active' : ''}`}
                            onClick={(e) => {
                              e.preventDefault();
                              handleFilterChange('salesOverview', 'today');
                            }}
                          >
                            Today
                          </Link>
                        </li>
                        <li>
                          <Link to="#"
                            className={`dropdown-item rounded-1 ${filters.salesOverview === 'all' ? 'active' : ''}`}
                            onClick={(e) => {
                              e.preventDefault();
                              handleFilterChange('salesOverview', 'all');
                            }}
                          >
                            All
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="card-body pb-0">
                  <div className="d-flex align-items-center justify-content-between flex-wrap">
                    <div className="d-flex align-items-center mb-1">
                      <p className="fs-13 text-gray-9 me-3 mb-0">
                        <i className="ti ti-square-filled me-2 text-primary" />
                        Income
                      </p>
                      <p className="fs-13 text-gray-9 mb-0">
                        <i className="ti ti-square-filled me-2 text-gray-2" />
                        Expenses
                      </p>
                    </div>
                    <p className="fs-13 mb-1">
                      Last Updated {formatLastUpdated(dashboardData.salesOverview?.lastUpdated || '')}
                    </p>
                  </div>
                  <ReactApexChart
                    id="sales-income"
                    options={salesIncomeOptions}
                    series={salesIncomeOptions.series}
                    type="bar"
                    height={270}
                  />
                </div>
              </div>
            </div>
            {/* /Sales Overview */}

            {/* Invoices */}
            <div className="col-xl-5 d-flex">
              <div className="card flex-fill">
                <div className="card-header pb-2 d-flex align-items-center justify-content-between flex-wrap">
                  <h5 className="mb-2">Invoices</h5>
                  <div className="d-flex align-items-center">
                    <div className="dropdown mb-2">
                      <Link
                        to="#"
                        className="dropdown-toggle btn btn-white btn-sm d-inline-flex align-items-center fs-13 me-2 border-0"
                        data-bs-toggle="dropdown"
                      >
                        {invoiceFilter === 'all' ? 'All Invoices' :
                         invoiceFilter === 'paid' ? 'Paid' :
                         invoiceFilter === 'unpaid' ? 'Unpaid' : 'All Invoices'}
                      </Link>
                      <ul className="dropdown-menu  dropdown-menu-end p-3">
                        <li>
                          <Link to="#"
                            className={`dropdown-item rounded-1 ${invoiceFilter === 'all' ? 'active' : ''}`}
                            onClick={(e) => {
                              e.preventDefault();
                              handleInvoiceFilterChange('all');
                            }}
                          >
                            All Invoices
                          </Link>
                        </li>
                        <li>
                          <Link to="#"
                            className={`dropdown-item rounded-1 ${invoiceFilter === 'paid' ? 'active' : ''}`}
                            onClick={(e) => {
                              e.preventDefault();
                              handleInvoiceFilterChange('paid');
                            }}
                          >
                            Paid
                          </Link>
                        </li>
                        <li>
                          <Link to="#"
                            className={`dropdown-item rounded-1 ${invoiceFilter === 'unpaid' ? 'active' : ''}`}
                            onClick={(e) => {
                              e.preventDefault();
                              handleInvoiceFilterChange('unpaid');
                            }}
                          >
                            Unpaid
                          </Link>
                        </li>
                      </ul>
                    </div>
                    <div className="dropdown mb-2">
                      <Link
                        to="#"
                        className="btn btn-white border btn-sm d-inline-flex align-items-center"
                        data-bs-toggle="dropdown"
                      >
                        <i className="ti ti-calendar me-1" />
                        {filters.invoices === 'today' ? 'Today' :
                         filters.invoices === 'week' ? 'This Week' :
                         filters.invoices === 'month' ? 'This Month' : 'All'}
                      </Link>
                      <ul className="dropdown-menu  dropdown-menu-end p-3">
                        <li>
                          <Link to="#"
                            className={`dropdown-item rounded-1 ${filters.invoices === 'month' ? 'active' : ''}`}
                            onClick={(e) => {
                              e.preventDefault();
                              handleFilterChange('invoices', 'month');
                            }}
                          >
                            This Month
                          </Link>
                        </li>
                        <li>
                          <Link to="#"
                            className={`dropdown-item rounded-1 ${filters.invoices === 'week' ? 'active' : ''}`}
                            onClick={(e) => {
                              e.preventDefault();
                              handleFilterChange('invoices', 'week');
                            }}
                          >
                            This Week
                          </Link>
                        </li>
                        <li>
                          <Link to="#"
                            className={`dropdown-item rounded-1 ${filters.invoices === 'today' ? 'active' : ''}`}
                            onClick={(e) => {
                              e.preventDefault();
                              handleFilterChange('invoices', 'today');
                            }}
                          >
                            Today
                          </Link>
                        </li>
                        <li>
                          <Link to="#"
                            className={`dropdown-item rounded-1 ${filters.invoices === 'all' ? 'active' : ''}`}
                            onClick={(e) => {
                              e.preventDefault();
                              handleFilterChange('invoices', 'all');
                            }}
                          >
                            All
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="card-body pt-2">
                  <div className="table-responsive pt-1">
                    <table className="table table-nowrap table-borderless mb-0">
                      <tbody>
                        {filteredInvoices.length > 0 ? (
                          filteredInvoices.slice(0, 5).map((invoice, index) => (
                            <tr key={invoice._id}>
                              <td className="px-0">
                                <div className="d-flex align-items-center">
                                  <Link to="/invoice-details" className="avatar">
                                    <ImageWithBasePath
                                      src={invoice.clientLogo}
                                      className="img-fluid rounded-circle"
                                      alt="img"
                                    />
                                  </Link>
                                  <div className="ms-2">
                                    <h6 className="fw-medium">
                                      <Link to="/invoice-details">
                                        {invoice.title}
                                      </Link>
                                    </h6>
                                    <span className="fs-13 d-inline-flex align-items-center">
                                      {invoice.invoiceNumber}
                                      <i className="ti ti-circle-filled fs-4 mx-1 text-primary" />
                                      {invoice.clientName}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <p className="fs-13 mb-1">Payment</p>
                                <h6 className="fw-medium">${invoice.amount}</h6>
                              </td>
                              <td className="px-0 text-end">
                                <span className={`badge ${invoice.status === 'Paid' ? 'badge-success-transparent' : 'badge-danger-transparent'} badge-xs d-inline-flex align-items-center`}>
                                  <i className="ti ti-circle-filled fs-5 me-1" />
                                  {invoice.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="text-center py-4">
                              <p className="text-muted">No invoices found for the selected filter.</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <Link to="/invoice" className="btn btn-light btn-md w-100 mt-2">
                    View All
                  </Link>
                </div>
              </div>
            </div>
            {/* /Invoices */}
          </div>

          <div className="row">
            {/* Projects */}
            <div className="col-xxl-8 col-xl-7 d-flex">
              <div className="card flex-fill">
                <div className="card-header pb-2 d-flex align-items-center justify-content-between flex-wrap">
                  <h5 className="mb-2">Projects</h5>
                  <div className="d-flex align-items-center">
                    <div className="dropdown mb-2">
                      <Link
                        to="#"
                        className="btn btn-white border btn-sm d-inline-flex align-items-center"
                        data-bs-toggle="dropdown"
                      >
                        <i className="ti ti-calendar me-1" />
                        {filters.projects === 'today' ? 'Today' :
                         filters.projects === 'week' ? 'This Week' :
                         filters.projects === 'month' ? 'This Month' : 'All'}
                      </Link>
                      <ul className="dropdown-menu  dropdown-menu-end p-3">
                        <li>
                          <Link to="#"
                            className={`dropdown-item rounded-1 ${filters.projects === 'month' ? 'active' : ''}`}
                            onClick={(e) => {
                              e.preventDefault();
                              handleFilterChange('projects', 'month');
                            }}
                          >
                            This Month
                          </Link>
                        </li>
                        <li>
                          <Link to="#"
                            className={`dropdown-item rounded-1 ${filters.projects === 'week' ? 'active' : ''}`}
                            onClick={(e) => {
                              e.preventDefault();
                              handleFilterChange('projects', 'week');
                            }}
                          >
                            This Week
                          </Link>
                        </li>
                        <li>
                          <Link to="#"
                            className={`dropdown-item rounded-1 ${filters.projects === 'today' ? 'active' : ''}`}
                            onClick={(e) => {
                              e.preventDefault();
                              handleFilterChange('projects', 'today');
                            }}
                          >
                            Today
                          </Link>
                        </li>
                        <li>
                          <Link to="#"
                            className={`dropdown-item rounded-1 ${filters.projects === 'all' ? 'active' : ''}`}
                            onClick={(e) => {
                              e.preventDefault();
                              handleFilterChange('projects', 'all');
                            }}
                          >
                            All
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-nowrap mb-0">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Name</th>
                          <th>Team</th>
                          <th>Hours</th>
                          <th>Deadline</th>
                          <th>Priority</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardData.projectsData?.slice(0, 7).map((project, index) => (
                          <tr key={project.id}>
                            <td>
                              <Link to="/project-details" className="link-default">
                                PRO-{String(index + 1).padStart(3, '0')}
                              </Link>
                            </td>
                            <td>
                              <h6 className="fw-medium">
                                <Link to="/project-details">
                                  {project.name}
                                </Link>
                              </h6>
                            </td>
                            <td>
                              <div className="avatar-list-stacked avatar-group-sm">
                                {project.team.slice(0, 3).map((member, idx) => (
                                  <span key={idx} className="avatar avatar-rounded">
                                    <ImageWithBasePath
                                      className="border border-white"
                                      src={member.avatar}
                                      alt="img"
                                    />
                                  </span>
                                ))}
                                {project.team.length > 3 && (
                                  <Link
                                    className="avatar bg-primary avatar-rounded text-fixed-white fs-10 fw-medium"
                                    to="#"
                                  >
                                    +{project.team.length - 3}
                                  </Link>
                                )}
                              </div>
                            </td>
                            <td>
                              <p className="mb-1">{project.hours}/{project.totalHours} Hrs</p>
                              <div
                                className="progress progress-xs w-100"
                                role="progressbar"
                                aria-valuenow={project.progress}
                                aria-valuemin={0}
                                aria-valuemax={100}
                              >
                                <div
                                  className="progress-bar bg-primary"
                                  style={{ width: `${project.progress}%` }}
                                />
                              </div>
                            </td>
                            <td>{formatDate(project.deadline)}</td>
                            <td>
                              <span className={`badge ${project.priority === 'High' ? 'badge-danger' : project.priority === 'Medium' ? 'badge-pink' : 'badge-success'} d-inline-flex align-items-center badge-xs`}>
                                <i className="ti ti-point-filled me-1" />
                                {project.priority}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
            {/* /Projects */}

            {/* Tasks Statistics */}
            <div className="col-xxl-4 col-xl-5 d-flex">
              <div className="card flex-fill">
                <div className="card-header pb-2 d-flex align-items-center justify-content-between flex-wrap">
                  <h5 className="mb-2">Tasks Statistics</h5>
                  <div className="d-flex align-items-center">
                    <div className="dropdown mb-2">
                      <Link
                        to="#"
                        className="btn btn-white border btn-sm d-inline-flex align-items-center"
                        data-bs-toggle="dropdown"
                      >
                        <i className="ti ti-calendar me-1" />
                        {filters.taskStatistics === 'today' ? 'Today' :
                         filters.taskStatistics === 'week' ? 'This Week' :
                         filters.taskStatistics === 'month' ? 'This Month' : 'All'}
                      </Link>
                      <ul className="dropdown-menu  dropdown-menu-end p-3">
                        <li>
                          <Link to="#"
                            className={`dropdown-item rounded-1 ${filters.taskStatistics === 'month' ? 'active' : ''}`}
                            onClick={(e) => {
                              e.preventDefault();
                              handleFilterChange('taskStatistics', 'month');
                            }}
                          >
                            This Month
                          </Link>
                        </li>
                        <li>
                          <Link to="#"
                            className={`dropdown-item rounded-1 ${filters.taskStatistics === 'week' ? 'active' : ''}`}
                            onClick={(e) => {
                              e.preventDefault();
                              handleFilterChange('taskStatistics', 'week');
                            }}
                          >
                            This Week
                          </Link>
                        </li>
                        <li>
                          <Link to="#"
                            className={`dropdown-item rounded-1 ${filters.taskStatistics === 'today' ? 'active' : ''}`}
                            onClick={(e) => {
                              e.preventDefault();
                              handleFilterChange('taskStatistics', 'today');
                            }}
                          >
                            Today
                          </Link>
                        </li>
                        <li>
                          <Link to="#"
                            className={`dropdown-item rounded-1 ${filters.taskStatistics === 'all' ? 'active' : ''}`}
                            onClick={(e) => {
                              e.preventDefault();
                              handleFilterChange('taskStatistics', 'all');
                            }}
                          >
                            All
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  <div className="chartjs-wrapper-demo position-relative mb-4">
                    <Chart type="doughnut" data={taskStatsData} options={taskStatsOptions} className="w-full md:w-30rem semi-donut-chart" />
                    <div className="position-absolute text-center attendance-canvas">
                      <p className="fs-13 mb-1">Total Tasks</p>
                      <h3>{dashboardData.taskStatistics?.total || 0}</h3>
                    </div>
                  </div>
                  <div className="d-flex align-items-center flex-wrap">
                    <div className="border-end text-center me-2 pe-2 mb-3">
                      <p className="fs-13 d-inline-flex align-items-center mb-1">
                        <i className="ti ti-circle-filled fs-10 me-1 text-warning" />
                        Ongoing
                      </p>
                      <h5>{dashboardData.taskStatistics?.distribution?.["Ongoing"]?.percentage || 0}%</h5>
                    </div>
                    <div className="border-end text-center me-2 pe-2 mb-3">
                      <p className="fs-13 d-inline-flex align-items-center mb-1">
                        <i className="ti ti-circle-filled fs-10 me-1 text-info" />
                        On Hold{" "}
                      </p>
                      <h5>{dashboardData.taskStatistics?.distribution?.["On Hold"]?.percentage || 0}%</h5>
                    </div>
                    <div className="border-end text-center me-2 pe-2 mb-3">
                      <p className="fs-13 d-inline-flex align-items-center mb-1">
                        <i className="ti ti-circle-filled fs-10 me-1 text-danger" />
                        Overdue
                      </p>
                      <h5>{dashboardData.taskStatistics?.distribution?.["Overdue"]?.percentage || 0}%</h5>
                    </div>
                    <div className="text-center me-2 pe-2 mb-3">
                      <p className="fs-13 d-inline-flex align-items-center mb-1">
                        <i className="ti ti-circle-filled fs-10 me-1 text-success" />
                        Completed
                      </p>
                      <h5>{dashboardData.taskStatistics?.distribution?.["Completed"]?.percentage || 0}%</h5>
                    </div>
                  </div>
                  <div className="bg-dark br-5 p-3 pb-0 d-flex align-items-center justify-content-between">
                    <div className="mb-2">
                      <h4 className="text-success">{dashboardData.taskStatistics?.hoursSpent || 0}/{dashboardData.taskStatistics?.targetHours || 0} hrs</h4>
                      <p className="fs-13 mb-0">Spent on Overall Tasks This Week</p>
                    </div>
                    <Link to="/tasks" className="btn btn-sm btn-light mb-2 text-nowrap">
                      View All
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            {/* /Tasks Statistics */}
          </div>

          <div className="row">
            {/* Schedules */}
            <div className="col-xxl-4 d-flex">
              <div className="card flex-fill">
                <div className="card-header pb-2 d-flex align-items-center justify-content-between flex-wrap">
                  <h5 className="mb-2">Schedules</h5>
                  <Link to="/candidates" className="btn btn-light btn-md mb-2">
                    View All
                  </Link>
                </div>
                <div className="card-body">
                  {dashboardData.schedules?.slice(0, 2).map((schedule, index) => (
                    <div key={schedule._id} className={`bg-light p-3 br-5 ${index === 0 ? 'mb-4' : 'mb-0'}`}>
                      <span className="badge badge-secondary badge-xs mb-1">
                        {schedule.type}
                      </span>
                      <h6 className="mb-2 text-truncate">
                        {schedule.title}
                      </h6>
                      <div className="d-flex align-items-center flex-wrap">
                        <p className="fs-13 mb-1 me-2">
                          <i className="ti ti-calendar-event me-2" />
                          {formatDate(schedule.date)}
                        </p>
                        <p className="fs-13 mb-1">
                          <i className="ti ti-clock-hour-11 me-2" />
                          {schedule.startTime} - {schedule.endTime}
                        </p>
                      </div>
                      <div className="d-flex align-items-center justify-content-between border-top mt-2 pt-3">
                        <div className="avatar-list-stacked avatar-group-sm">
                          {schedule.participants.slice(0, 5).map((participant, idx) => (
                            <span key={idx} className="avatar avatar-rounded">
                              <ImageWithBasePath
                                className="border border-white"
                                src={participant.avatar}
                                alt="img"
                              />
                            </span>
                          ))}
                          {schedule.participants.length > 5 && (
                            <Link
                              className="avatar bg-primary avatar-rounded text-fixed-white fs-10 fw-medium"
                              to="#"
                            >
                              +{schedule.participants.length - 5}
                            </Link>
                          )}
                        </div>
                        <Link to="#" className="btn btn-primary btn-xs">
                          Join Meeting
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* /Schedules */}

            {/* Recent Activities */}
            <div className="col-xxl-4 col-xl-6 d-flex">
              <div className="card flex-fill">
                <div className="card-header pb-2 d-flex align-items-center justify-content-between flex-wrap">
                  <h5 className="mb-2">Recent Activities</h5>
                  <Link to="/activity" className="btn btn-light btn-md mb-2">
                    View All
                  </Link>
                </div>
                <div className="card-body">
                  {dashboardData.recentActivities?.slice(0, 6).map((activity, index) => (
                    <div key={activity._id} className="recent-item">
                      <div className="d-flex justify-content-between">
                        <div className="d-flex align-items-center w-100">
                          <Link to="#" className="avatar flex-shrink-0">
                            <ImageWithBasePath
                              src={activity.employeeAvatar}
                              className="rounded-circle"
                              alt="img"
                            />
                          </Link>
                          <div className="ms-2 flex-fill">
                            <div className="d-flex align-items-center justify-content-between">
                              <h6 className="fs-medium text-truncate">
                                <Link to="#">{activity.employeeName}</Link>
                              </h6>
                              <p className="fs-13">{formatTime(activity.createdAt)}</p>
                            </div>
                            <p className="fs-13">{activity.description}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* /Recent Activities */}

            {/* Birthdays */}
            <div className="col-xxl-4 col-xl-6 d-flex">
              <div className="card flex-fill">
                <div className="card-header pb-2 d-flex align-items-center justify-content-between flex-wrap">
                  <h5 className="mb-2">Birthdays</h5>
                  <Link to="#" className="btn btn-light btn-md mb-2">
                    View All
                  </Link>
                </div>
                <div className="card-body pb-1">
                  {dashboardData.birthdays?.today && dashboardData.birthdays.today.length > 0 && (
                    <>
                      <h6 className="mb-2">Today</h6>
                      {dashboardData.birthdays.today.map((person, index) => (
                        <div key={index} className="bg-light p-2 border border-dashed rounded-top mb-3">
                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center">
                              <Link to="#" className="avatar">
                                <ImageWithBasePath
                                  src={person.avatar}
                                  className="rounded-circle"
                                  alt="img"
                                />
                              </Link>
                              <div className="ms-2 overflow-hidden">
                                <h6 className="fs-medium">{person.name}</h6>
                                <p className="fs-13">{person.position}</p>
                              </div>
                            </div>
                            <Link to="#" className="btn btn-secondary btn-xs">
                              <i className="ti ti-cake me-1" />
                              Send
                            </Link>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {dashboardData.birthdays?.tomorrow && dashboardData.birthdays.tomorrow.length > 0 && (
                    <>
                      <h6 className="mb-2">Tomorrow</h6>
                      {dashboardData.birthdays.tomorrow.map((person, index) => (
                        <div key={index} className="bg-light p-2 border border-dashed rounded-top mb-3">
                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center">
                              <Link to="#" className="avatar">
                                <ImageWithBasePath
                                  src={person.avatar}
                                  className="rounded-circle"
                                  alt="img"
                                />
                              </Link>
                              <div className="ms-2 overflow-hidden">
                                <h6 className="fs-medium">
                                  <Link to="#">{person.name}</Link>
                                </h6>
                                <p className="fs-13">{person.position}</p>
                              </div>
                            </div>
                            <Link to="#" className="btn btn-secondary btn-xs">
                              <i className="ti ti-cake me-1" />
                              Send
                            </Link>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {dashboardData.birthdays?.upcoming && dashboardData.birthdays.upcoming.length > 0 && (
                    <>
                      <h6 className="mb-2">Upcoming</h6>
                      {dashboardData.birthdays.upcoming.slice(0, 2).map((person, index) => (
                        <div key={index} className="bg-light p-2 border border-dashed rounded-top mb-3">
                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center">
                              <span className="avatar">
                                <ImageWithBasePath
                                  src={person.avatar}
                                  className="rounded-circle"
                                  alt="img"
                                />
                              </span>
                              <div className="ms-2 overflow-hidden">
                                <h6 className="fs-medium">{person.name}</h6>
                                <p className="fs-13">{person.position}</p>
                              </div>
                            </div>
                            <Link to="#" className="btn btn-secondary btn-xs">
                              <i className="ti ti-cake me-1" />
                              Send
                            </Link>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
            {/* /Birthdays */}
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

      <ProjectModals onProjectCreated={() => {
        if (socket) {
          const currentYear = date.getFullYear();
          socket.emit("admin/dashboard/get-all-data", { year: currentYear });
        }
      }} />
      <RequestModals onLeaveRequestCreated={() => {
        if (socket) {
          const currentYear = date.getFullYear();
          socket.emit("admin/dashboard/get-all-data", { year: currentYear });
        }
      }} />
      <TodoModal onTodoAdded={() => {
        if (socket) {
          const currentYear = date.getFullYear();
          socket.emit("admin/dashboard/get-all-data", { year: currentYear });
        }
      }} />
    </>
  );
};

export default AdminDashboard;

