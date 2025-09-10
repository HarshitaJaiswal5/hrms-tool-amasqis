import React, { useState } from "react";
import { Link } from "react-router-dom";
import { all_routes } from "../../router/all_routes";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";
import ReactApexChart from "react-apexcharts";
import { Nullable } from "primereact/ts-helpers";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import dayjs from "dayjs";
import PredefinedDateRanges from "../../../core/common/datePicker";
import CollapseHeader from "../../../core/common/collapse-header/collapse-header";
import { useEffect } from "react";
import { useSocket } from "../../../SocketContext";

// Type definitions for dashboard data arrays
interface CompanyLead {
  name: string;
  value: number;
  status: string;
}
interface SourceLead {
  name: string;
  count: number;
}
interface CountryLead {
  name: string;
  leads: number;
}

interface DateRange {
  start: string;
  end: string;
}

const LeadsDasboard = () => {
  const routes = all_routes;
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0"); // Month is zero-based, so we add 1
  const day = String(today.getDate()).padStart(2, "0");
  const formattedDate = `${month}-${day}-${year}`;
  const defaultValue = dayjs(formattedDate);
  const [date, setDate] = useState<Nullable<Date>>(null);
  const socket = useSocket();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [dataReceived, setDataReceived] = useState(false);
  const [requestTimedOut, setRequestTimedOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<'week' | 'month' | 'year'>('week');
  
  // Add date range state
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(1970, 0, 1).toISOString(), // All Time default
    end: new Date().toISOString()
  });

  // Add new leads filter state
  const [newLeadsFilter, setNewLeadsFilter] = useState<'week' | 'month' | 'year'>('week');
  
  // Add new leads dashboard filter state
  const [newLeadsDashboardFilter, setNewLeadsDashboardFilter] = useState<'week' | 'month' | 'year'>('week');

  const [revenue_income, setRevenueIncome] = useState<any>({
    chart: {
      height: 230,
      type: 'bar',
      stacked: false, // Changed to false since we only have one series now
      toolbar: {
        show: false,
      }
    },
    colors: ['#FF6F28'], // Only one color needed for single series
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
        borderRadiusWhenStacked: 'all',
        horizontal: false,
        endingShape: 'rounded'
      },
    },
    series: [{
      name: 'Income',
      data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] // Will be updated dynamically
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
      min: 0,
      max: 100,
      labels: {
        offsetX: -15,
        style: {
          colors: '#6B7280',
          fontSize: '13px',
        },
        formatter: function (value: number) {
          return value + "K"; // Updated format to match new data structure
        }
      }
    },
    grid: {
      borderColor: 'transparent',
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
    tooltip: {
      y: {
        formatter: function (val: number) {
          return val + "K" // Updated format to match new data structure
        }
      }
    },
    fill: {
      opacity: 1
    },
  });
  const [heat_chart, setHeatChart] = useState<any>({
    chart: {
      type: 'heatmap',
      height: 300,
    },
    xaxis: {
      type: 'category',
      labels: {
        style: {
          colors: '#6B7280',
          fontSize: '12px',
        }
      }
    },
    colors: [
      "#9CA3AF",
      "#F37438",
      "#9CA3AF",
      "#F37438",
      "#9CA3AF",
      "#F37438",
    ],
    series: [
      {
        name: "0",
        data: [{
          x: 'Mon',
          y: 22
        },
        {
          x: 'Tue',
          y: 29
        },
        {
          x: 'Wed',
          y: 13
        },
        {
          x: 'Thu',
          y: 32
        },
        {
          x: 'Fri',
          y: 32
        },
        {
          x: 'Sat',
          y: 32
        },
        {
          x: 'Sun',
          y: 32
        },
        ]
      },
      {
        name: "20",
        data: [{
          x: 'Mon',
          y: 22,
          color: '#ff5722'
        },
        {
          x: 'Tue',
          y: 29
        },
        {
          x: 'Wed',
          y: 13
        },
        {
          x: 'Thu',
          y: 32
        },
        {
          x: 'Fri',
          y: 32
        },
        {
          x: 'Sat',
          y: 32
        },
        {
          x: 'Sun',
          y: 32
        },
        ]
      },
      {
        name: "40",
        data: [{
          x: 'Mon',
          y: 22
        },
        {
          x: 'Tue',
          y: 29
        },
        {
          x: 'Wed',
          y: 13
        },
        {
          x: 'Thu',
          y: 32
        },
        {
          x: 'Fri',
          y: 32
        },
        {
          x: 'Sat',
          y: 32
        },
        {
          x: 'Sun',
          y: 32
        },
        ]
      },
      {
        name: "60",
        data: [{
          x: 'Mon',
          y: 0
        },
        {
          x: 'Tue',
          y: 29
        },
        {
          x: 'Wed',
          y: 13
        },
        {
          x: 'Thu',
          y: 32
        },
        {
          x: 'Fri',
          y: 0
        },
        {
          x: 'Sat',
          y: 0
        },
        {
          x: 'Sun',
          y: 32
        },
        ]
      },
      {
        name: "80",
        data: [{
          x: 'Mon',
          y: 0
        },
        {
          x: 'Tue',
          y: 20
        },
        {
          x: 'Wed',
          y: 13
        },
        {
          x: 'Thu',
          y: 32
        },
        {
          x: 'Fri',
          y: 0
        },
        {
          x: 'Sat',
          y: 0
        },
        {
          x: 'Sun',
          y: 32
        },
        ]
      },
      {
        name: "120",
        data: [{
          x: 'Mon',
          y: 0
        },
        {
          x: 'Tue',
          y: 0
        },
        {
          x: 'Wed',
          y: 75
        },
        {
          x: 'Thu',
          y: 0
        },
        {
          x: 'Fri',
          y: 0
        },
        {
          x: 'Sat',
          y: 0
        },
        {
          x: 'Sun',
          y: 0
        },
        ]
      },
    ]
  });
  const [leads_stage, setLeadsStage] = useState<any>({
    chart: {
      height: 355,
      type: 'bar',
              stacked: false,
      toolbar: {
        show: false,
      }
    },
          colors: ['#DC3545'], // Red color for lost leads
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
        borderRadiusWhenStacked: 'all',
        horizontal: false,
        endingShape: 'rounded'
      },
    },
    series: [{
        name: 'Lost Leads',
        data: [0, 0, 0, 0] // Will be updated dynamically
    }],
    xaxis: {
      categories: ['Competitor', 'Budget', 'Unresponsive', 'Timing'],
      labels: {
        style: {
          colors: '#6B7280',
          fontSize: '9px',
        }
      }
    },
    yaxis: {
      labels: {
        offsetX: -15,
        style: {
          colors: '#6B7280',
          fontSize: '10px',
        }
      }
    },
    grid: {
      borderColor: '#E5E7EB',
      strokeDashArray: 5
    },
    legend: {
      show: false
    },
    dataLabels: {
      enabled: false // Disable data labels
    },
    fill: {
      opacity: 1
    },
  });
  const [donutchart2, setDonutChart2] = useState<any>({
    series: [25, 30, 10, 35], // Will be updated dynamically
    chart: {
      type: 'donut',
      height: 185,
    },
    labels: ['Paid', 'Google', 'Referrals', 'Campaigns'], // Will be updated dynamically
    colors: ['#FFC107', '#0C4B5E', '#AB47BC', '#FD3995'],
    plotOptions: {
      pie: {
        donut: {
          size: '60%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total',
              fontSize: '16px',
              fontWeight: 600,
              color: '#263238',
              formatter: function (w: any) {
                try {
                  if (w.globals && w.globals.seriesTotals && Array.isArray(w.globals.seriesTotals)) {
                    const total = w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
                    return total.toString();
                  }
                  return '0';
                } catch (error) {
                  console.error("[LeadDashboard] Error in formatter:", error);
                  return '0';
                }
              }
            }
          }
        }
      }
    },
    legend: {
      show: false,
    },
    dataLabels: {
      enabled: false
    }
  });
  const [donutchart3, setDonutChart3] = useState<any>({
    series: [15, 10, 5, 10, 60], // Will be updated dynamically
    chart: {
      type: 'donut',
      height: 167,
    },
    labels: ['Paid', 'Google', 'Referrals', 'Campaigns', 'Other'], // Will be updated dynamically
    colors: ['#F26522', '#FFC107', '#E70D0D', '#1B84FF', '#0C4B5E'],
    plotOptions: {
      pie: {
        donut: {
          size: '60%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Leads',
              formatter: function (w: any) {
                try {
                  if (w.globals && w.globals.seriesTotals && Array.isArray(w.globals.seriesTotals)) {
                    return w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
                  }
                  return 0;
                } catch (error) {
                  console.error("[LeadDashboard] Error in formatter:", error);
                  return 0;
                }
              }
            }
          }
        }
      }
    },
    dataLabels: {
      enabled: false
    },
    legend: {
      show: false,
    },
    label: {
      show: false,
    }
  });

  const currentYear = new Date().getFullYear();
  const [selectedPipelineYear, setSelectedPipelineYear] = useState<number>(currentYear);

  // 1. Add state at the top of the component:
  const [lostLeadsReasonFilter, setLostLeadsReasonFilter] = useState<'thisMonth' | 'thisWeek' | 'lastWeek'>('thisMonth');

  // Add state for Leads By Companies filter
  const [leadsByCompaniesFilter, setLeadsByCompaniesFilter] = useState<'thisMonth' | 'thisWeek' | 'lastWeek'>('thisMonth');

  // Add state for Leads by Source filter
  const [leadsBySourceFilter, setLeadsBySourceFilter] = useState<'thisMonth' | 'thisWeek' | 'lastWeek'>('thisMonth');

  // Add handler for Leads by Source filter
  const handleLeadsBySourceFilterChange = (filter: 'thisMonth' | 'thisWeek' | 'lastWeek') => {
    console.log("[LeadDashboard] Leads by Source filter changed to:", filter);
    console.log("[LeadDashboard] Previous filter was:", leadsBySourceFilter);
    setLeadsBySourceFilter(filter);
    console.log("[LeadDashboard] Filter state updated, should trigger data fetch");
    
    // Force immediate data fetch for debugging
    if (socket && (socket as any).connected) {
      console.log("[LeadDashboard] Emitting immediate data fetch for leadsBySource");
      (socket as any).emit("lead/dashboard/get-all-data", { 
        filter, 
        dateRange, 
        newLeadsFilter, 
        newLeadsDashboardFilter, 
        pipelineYear: selectedPipelineYear, 
        lostLeadsReasonFilter,
        leadsByCompaniesFilter,
        leadsBySourceFilter: filter, // Use the new filter immediately
        topCountriesFilter
      });
    }
  };

  // Add state for Top Countries filter
  const [topCountriesFilter, setTopCountriesFilter] = useState<'thisMonth' | 'thisWeek' | 'lastWeek'>('thisMonth');

  // Add handler for Top Countries filter
  const handleTopCountriesFilterChange = (filter: 'thisMonth' | 'thisWeek' | 'lastWeek') => {
    console.log("[LeadDashboard] Top Countries filter changed to:", filter);
    setTopCountriesFilter(filter);
    
    // Force immediate data fetch for debugging
    if (socket && (socket as any).connected) {
      console.log("[LeadDashboard] Emitting immediate data fetch for topCountries");
      (socket as any).emit("lead/dashboard/get-all-data", { 
        filter, 
        dateRange, 
        newLeadsFilter, 
        newLeadsDashboardFilter, 
        pipelineYear: selectedPipelineYear, 
        lostLeadsReasonFilter,
        leadsByCompaniesFilter,
        leadsBySourceFilter,
        topCountriesFilter: filter // Use the new filter immediately
      });
    }
  };

  // Add country-to-flag mapping system
  const countryToFlagMap: { [key: string]: string } = {
    // Major countries with their flag emojis
    'United States': '🇺🇸',
    'USA': '🇺🇸',
    'US': '🇺🇸',
    'India': '🇮🇳',
    'China': '🇨🇳',
    'United Kingdom': '🇬🇧',
    'UK': '🇬🇧',
    'Germany': '🇩🇪',
    'France': '🇫🇷',
    'Canada': '🇨🇦',
    'Australia': '🇦🇺',
    'Japan': '🇯🇵',
    'South Korea': '🇰🇷',
    'Brazil': '🇧🇷',
    'Russia': '🇷🇺',
    'Italy': '🇮🇹',
    'Spain': '🇪🇸',
    'Netherlands': '🇳🇱',
    'Switzerland': '🇨🇭',
    'Sweden': '🇸🇪',
    'Norway': '🇳🇴',
    'Denmark': '🇩🇰',
    'Finland': '🇫🇮',
    'Singapore': '🇸🇬',
    'UAE': '🇦🇪',
    'United Arab Emirates': '🇦🇪',
    'Saudi Arabia': '🇸🇦',
    'Qatar': '🇶🇦',
    'Kuwait': '🇰🇼',
    'Oman': '🇴🇲',
    'Bahrain': '🇧🇭',
    'Mexico': '🇲🇽',
    'Argentina': '🇦🇷',
    'Chile': '🇨🇱',
    'Colombia': '🇨🇴',
    'Peru': '🇵🇪',
    'Venezuela': '🇻🇪',
    'South Africa': '🇿🇦',
    'Egypt': '🇪🇬',
    'Nigeria': '🇳🇬',
    'Kenya': '🇰🇪',
    'Ghana': '🇬🇭',
    'Morocco': '🇲🇦',
    'Tunisia': '🇹🇳',
    'Algeria': '🇩🇿',
    'Turkey': '🇹🇷',
    'Israel': '🇮🇱',
    'Iran': '🇮🇷',
    'Iraq': '🇮🇶',
    'Pakistan': '🇵🇰',
    'Bangladesh': '🇧🇩',
    'Sri Lanka': '🇱🇰',
    'Nepal': '🇳🇵',
    'Bhutan': '🇧🇹',
    'Myanmar': '🇲🇲',
    'Thailand': '🇹🇭',
    'Vietnam': '🇻🇳',
    'Malaysia': '🇲🇾',
    'Indonesia': '🇮🇩',
    'Philippines': '🇵🇭',
    'Taiwan': '🇹🇼',
    'Hong Kong': '🇭🇰',
    'New Zealand': '🇳🇿',
    'Ireland': '🇮🇪',
    'Belgium': '🇧🇪',
    'Austria': '🇦🇹',
    'Poland': '🇵🇱',
    'Czech Republic': '🇨🇿',
    'Hungary': '🇭🇺',
    'Romania': '🇷🇴',
    'Bulgaria': '🇧🇬',
    'Greece': '🇬🇷',
    'Portugal': '🇵🇹',
    'Croatia': '🇭🇷',
    'Slovenia': '🇸🇮',
    'Slovakia': '🇸🇰',
    'Estonia': '🇪🇪',
    'Latvia': '🇱🇻',
    'Lithuania': '🇱🇹',
    'Luxembourg': '🇱🇺',
    'Iceland': '🇮🇸',
    'Malta': '🇲🇹',
    'Cyprus': '🇨🇾',
    'Ukraine': '🇺🇦',
    'Belarus': '🇧🇾',
    'Moldova': '🇲🇩',
    'Georgia': '🇬🇪',
    'Armenia': '🇦🇲',
    'Azerbaijan': '🇦🇿',
    'Kazakhstan': '🇰🇿',
    'Uzbekistan': '🇺🇿',
    'Kyrgyzstan': '🇰🇬',
    'Tajikistan': '🇹🇯',
    'Turkmenistan': '🇹🇲',
    'Mongolia': '🇲🇳',
    'North Korea': '🇰🇵',
    'Maldives': '🇲🇻',
    'Brunei': '🇧🇳',
    'Cambodia': '🇰🇭',
    'Laos': '🇱🇦',
    'East Timor': '🇹🇱',
    'Papua New Guinea': '🇵🇬',
    'Fiji': '🇫🇯',
    'Solomon Islands': '🇸🇧',
    'Vanuatu': '🇻🇺',
    'New Caledonia': '🇳🇨',
    'French Polynesia': '🇵🇫',
    'Samoa': '🇼🇸',
    'Tonga': '🇹🇴',
    'Kiribati': '🇰🇮',
    'Tuvalu': '🇹🇻',
    'Nauru': '🇳🇷',
    'Palau': '🇵🇼',
    'Micronesia': '🇫🇲',
    'Marshall Islands': '🇲🇭',
    'Cook Islands': '🇨🇰',
    'Niue': '🇳🇺',
    'Tokelau': '🇹🇰',
    'American Samoa': '🇦🇸',
    'Guam': '🇬🇺',
    'Northern Mariana Islands': '🇲🇵',
    'Puerto Rico': '🇵🇷',
    'U.S. Virgin Islands': '🇻🇮',
    'British Virgin Islands': '🇻🇬',
    'Anguilla': '🇦🇮',
    'Montserrat': '🇲🇸',
    'Cayman Islands': '🇰🇾',
    'Turks and Caicos Islands': '🇹🇨',
    'Bermuda': '🇧🇲',
    'Greenland': '🇬🇱',
    'Faroe Islands': '🇫🇴',
    'Isle of Man': '🇮🇲',
    'Jersey': '🇯🇪',
    'Guernsey': '🇬🇬',
    'Gibraltar': '🇬🇮',
    'Andorra': '🇦🇩',
    'Monaco': '🇲🇨',
    'Liechtenstein': '🇱🇮',
    'San Marino': '🇸🇲',
    'Vatican City': '🇻🇦',
    'Holy See': '🇻🇦',
    'Federated States of Micronesia': '🇫🇲'
  };

  // Function to get flag for a country
  const getCountryFlag = (countryName: string): string => {
    if (!countryName) return '🌍'; // Default world flag
    
    // Try exact match first
    if (countryToFlagMap[countryName]) {
      return countryToFlagMap[countryName];
    }
    
    // Try case-insensitive match
    const normalizedCountry = countryName.toLowerCase();
    for (const [country, flag] of Object.entries(countryToFlagMap)) {
      if (country.toLowerCase() === normalizedCountry) {
        return flag;
      }
    }
    
    // Try partial match for common variations
    if (normalizedCountry.includes('united states') || normalizedCountry.includes('usa') || normalizedCountry.includes('us')) {
      return '🇺🇸';
    }
    if (normalizedCountry.includes('united kingdom') || normalizedCountry.includes('uk') || normalizedCountry.includes('britain')) {
      return '🇬🇧';
    }
    if (normalizedCountry.includes('united arab emirates') || normalizedCountry.includes('uae')) {
      return '🇦🇪';
    }
    
    return '🌍'; // Default world flag for unknown countries
  };

  useEffect(() => {
    if (!socket) {
      console.log("[LeadDashboard] Socket not available yet");
      return;
    }

    console.log("[LeadDashboard] Socket available, setting up listeners");

    // Handler for dashboard data response
    const handleDashboardResponse = (response: any) => {
      console.log("[LeadDashboard] Received response:", response);
      setRequestTimedOut(false);
      
      if (response.done) {
        // Ensure data is properly structured
        const data = response.data || {};
        
        console.log("[LeadDashboard] Full dashboard data:", data);
        console.log("[LeadDashboard] newLeadsDashboardData:", data.newLeadsDashboardData);
        
        // Validate arrays to prevent push errors
        if (data.newLeadsDashboardData && !Array.isArray(data.newLeadsDashboardData)) {
          console.warn("[LeadDashboard] newLeadsDashboardData is not an array:", data.newLeadsDashboardData);
          data.newLeadsDashboardData = [];
        }
        
        if (data.leadsBySource && !Array.isArray(data.leadsBySource)) {
          console.warn("[LeadDashboard] leadsBySource is not an array:", data.leadsBySource);
          data.leadsBySource = [];
        }
        
        if (data.topCountries && !Array.isArray(data.topCountries)) {
          console.warn("[LeadDashboard] topCountries is not an array:", data.topCountries);
          data.topCountries = [];
        }
        
        setDashboardData(data);
        setDataReceived(true);
        setErrorMessage(null);
        console.log("[LeadDashboard] Dashboard data set successfully");
      } else {
        console.error("Lead dashboard error:", response.error);
        setErrorMessage(response.error || 'Failed to load dashboard');
        // Gracefully show no data instead of infinite loading
        const emptyData = {
          totalLeads: 0,
          newLeads: 0,
          lostLeads: 0,
          totalCustomers: 0,
          pipelineStages: {
            Contacted: 0,
            Opportunity: 0,
            'Not Contacted': 0,
            Closed: 0,
            Lost: 0,
            monthlyData: {
              contacted: new Array(12).fill(0),
              opportunity: new Array(12).fill(0),
              notContacted: new Array(12).fill(0),
              closed: new Array(12).fill(0),
              lost: new Array(12).fill(0),
              closedIncome: new Array(12).fill(0)
            }
          },
          lostLeadsByReason: { 'No Data': 0 },
          leadsByCompanies: [],
          leadsBySource: [{ name: 'No Data', count: 0 }],
          topCountries: [{ name: 'No Data', leads: 0 }],
          recentLeads: [],
          recentActivities: [],
          leadOwners: [],
          leadTasks: [],
          leadJobApplications: [],
          leadClients: [],
          newLeadsDashboardData: []
        } as any;
        setDashboardData(emptyData);
        setDataReceived(true);
      }
    };

    // Always listen for the response
    (socket as any).on("lead/dashboard/get-all-data-response", handleDashboardResponse);

    // Only emit if socket is actually connected
    if ((socket as any).connected) {
      // Set a timeout to avoid infinite spinner if server never responds
      setRequestTimedOut(false);
      const timer = setTimeout(() => {
        console.warn('[LeadDashboard] Request timed out');
        setRequestTimedOut(true);
        setDataReceived(true);
        setDashboardData({
          lostLeadsByReason: { 'No Data': 0 },
          leadsBySource: [{ name: 'No Data', count: 0 }],
          topCountries: [{ name: 'No Data', leads: 0 }],
          pipelineStages: { Contacted: 0, Opportunity: 0, 'Not Contacted': 0, Closed: 0, Lost: 0, monthlyData: { contacted: Array(12).fill(0), opportunity: Array(12).fill(0), notContacted: Array(12).fill(0), closed: Array(12).fill(0), lost: Array(12).fill(0), closedIncome: Array(12).fill(0) } },
        });
        setErrorMessage('No response from server. Please try again.');
      }, 7000);

      (socket as any).emit("lead/dashboard/get-all-data", { 
        filter, 
        dateRange, 
        newLeadsFilter, 
        newLeadsDashboardFilter, 
        pipelineYear: selectedPipelineYear, 
        lostLeadsReasonFilter,
        leadsByCompaniesFilter,
        leadsBySourceFilter,
        topCountriesFilter
      });

      // Clear timer when a response is received or on cleanup
      (socket as any).once("lead/dashboard/get-all-data-response", () => clearTimeout(timer));
    } else {
      // Wait for connect event, then emit
      const onConnect = () => {
        (socket as any).emit("lead/dashboard/get-all-data", { 
          filter, 
          dateRange, 
          newLeadsFilter, 
          newLeadsDashboardFilter, 
          pipelineYear: selectedPipelineYear, 
          lostLeadsReasonFilter,
          leadsByCompaniesFilter,
          leadsBySourceFilter,
          topCountriesFilter
        });
      };
      (socket as any).on("connect", onConnect);

      // Clean up the connect listener
      return () => {
        (socket as any).off("lead/dashboard/get-all-data-response", handleDashboardResponse);
        (socket as any).off("connect", onConnect);
      };
    }

    // Clean up the response listener
    return () => {
      (socket as any).off("lead/dashboard/get-all-data-response", handleDashboardResponse);
    };
  }, [socket, filter, dateRange, newLeadsFilter, newLeadsDashboardFilter, selectedPipelineYear, lostLeadsReasonFilter, leadsByCompaniesFilter, leadsBySourceFilter, topCountriesFilter]);

  // Update heat chart when new leads dashboard data changes
  useEffect(() => {
    console.log("[LeadDashboard] New Leads Dashboard useEffect triggered");
    console.log("[LeadDashboard] dashboardData:", dashboardData);
    console.log("[LeadDashboard] dashboardData?.newLeadsDashboardData:", dashboardData?.newLeadsDashboardData);
    console.log("[LeadDashboard] newLeadsDashboardFilter:", newLeadsDashboardFilter);
    
          if (dashboardData?.newLeadsDashboardData && Array.isArray(dashboardData.newLeadsDashboardData) && dashboardData.newLeadsDashboardData.length > 0) {
        console.log("[LeadDashboard] New leads dashboard data:", dashboardData.newLeadsDashboardData);
        
        // Debug: Log the actual data structure
        console.log("[LeadDashboard] Data structure check:");
        dashboardData.newLeadsDashboardData.forEach((item: any, index: number) => {
          console.log(`  ${index + 1}. x: "${item.x}", y: ${item.y}`);
        });
      
      // Determine the data format based on the filter
      const isWeekFilter = newLeadsDashboardFilter === 'week';
      const isMonthFilter = newLeadsDashboardFilter === 'month';
      const isYearFilter = newLeadsDashboardFilter === 'year';
      
      if (isWeekFilter) {
        // For week filter: show days of the week
        const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        
        // Get the actual data values
        const dataValues = weekdays.map((day) => {
          const dayDataItem = dashboardData.newLeadsDashboardData.find((item: any) => item.x === day);
          return dayDataItem ? dayDataItem.y : 0;
        });
        
        // Calculate max value for scaling
        const maxValue = Math.max(...dataValues, 1);
        
        // Create dynamic ranges based on the data
        const ranges = [0, Math.ceil(maxValue * 0.2), Math.ceil(maxValue * 0.4), Math.ceil(maxValue * 0.6), Math.ceil(maxValue * 0.8), Math.ceil(maxValue)];
        
        const series: any[] = [];
        
        ranges.forEach((range) => {
          const seriesData = weekdays.map((day, index) => {
            const value = dataValues[index];
            // Only show data if it falls within this range
            return {
              x: day,
              y: value >= range ? value : 0
            };
          });
          
          series.push({
            name: range.toString(),
            data: seriesData
          });
        });
        
        console.log("[LeadDashboard] Setting heat chart with series (week):", series);
        setHeatChart((prev: any) => ({
          ...prev,
          xaxis: {
            ...prev.xaxis,
            categories: weekdays, // Explicitly set all weekdays
            labels: {
              ...prev.xaxis?.labels,
              style: {
                colors: '#6B7280',
                fontSize: '12px',
              }
            }
          },
          series: series
        }));
        
      } else if (isMonthFilter) {
        // For month filter: show weeks of the month
        const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'];
        
        // Get the actual data values
        const dataValues = weeks.map((week) => {
          const weekDataItem = dashboardData.newLeadsDashboardData.find((item: any) => item.x === week);
          return weekDataItem ? weekDataItem.y : 0;
        });
        
        // Calculate max value for scaling
        const maxValue = Math.max(...dataValues, 1);
        
        // Create dynamic ranges based on the data
        const ranges = [0, Math.ceil(maxValue * 0.2), Math.ceil(maxValue * 0.4), Math.ceil(maxValue * 0.6), Math.ceil(maxValue * 0.8), Math.ceil(maxValue)];
        
        const series: any[] = [];
        
        ranges.forEach((range) => {
          const seriesData = weeks.map((week, index) => {
            const value = dataValues[index];
            // Only show data if it falls within this range
            return {
              x: week,
              y: value >= range ? value : 0
            };
          });
          
          series.push({
            name: range.toString(),
            data: seriesData
          });
        });
        
        console.log("[LeadDashboard] Setting heat chart with series (month):", series);
        setHeatChart((prev: any) => ({
          ...prev,
          xaxis: {
            ...prev.xaxis,
            categories: weeks, // Explicitly set all weeks
            labels: {
              ...prev.xaxis?.labels,
              style: {
                colors: '#6B7280',
                fontSize: '12px',
              }
            }
          },
          series: series
        }));
        
      } else if (isYearFilter) {
        // For year filter: show months of the year
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        console.log("[LeadDashboard] Year filter - Available data:", dashboardData.newLeadsDashboardData);
        console.log("[LeadDashboard] Year filter - Looking for months:", months);
        
        // Get the actual data values
        const dataValues = months.map((month) => {
          const monthDataItem = dashboardData.newLeadsDashboardData.find((item: any) => item.x === month);
          const value = monthDataItem ? monthDataItem.y : 0;
          console.log(`[LeadDashboard] Month ${month}: ${value} leads`);
          return value;
        });
        
        // Calculate max value for scaling
        const maxValue = Math.max(...dataValues, 1);
        
        // Create dynamic ranges based on the data
        const ranges = [0, Math.ceil(maxValue * 0.2), Math.ceil(maxValue * 0.4), Math.ceil(maxValue * 0.6), Math.ceil(maxValue * 0.8), Math.ceil(maxValue)];
        
        const series: any[] = [];
        
        ranges.forEach((range) => {
          const seriesData = months.map((month, index) => {
            const value = dataValues[index];
            // Only show data if it falls within this range
            return {
              x: month,
              y: value >= range ? value : 0
            };
          });
          
          series.push({
            name: range.toString(),
            data: seriesData
          });
        });
        
        console.log("[LeadDashboard] Setting heat chart with series (year):", series);
        console.log("[LeadDashboard] Year filter - Final data values:", dataValues);
        console.log("[LeadDashboard] Year filter - Chart categories:", months);
        setHeatChart((prev: any) => ({
          ...prev,
          xaxis: {
            ...prev.xaxis,
            categories: months, // Explicitly set all months
            labels: {
              ...prev.xaxis?.labels,
              style: {
                colors: '#6B7280',
                fontSize: '12px',
              }
            }
          },
          series: series
        }));
      }
      
    } else {
      console.log("[LeadDashboard] No newLeadsDashboardData available, showing no data");
      // Show no data instead of hardcoded fallback
      setHeatChart((prev: any) => ({
        ...prev,
        series: [
          {
            name: "0",
            data: [{
              x: 'Mon',
              y: 0
            },
            {
              x: 'Tue',
              y: 0
            },
            {
              x: 'Wed',
              y: 0
            },
            {
              x: 'Thu',
              y: 0
            },
            {
              x: 'Fri',
              y: 0
            },
            {
              x: 'Sat',
              y: 0
            },
            {
              x: 'Sun',
              y: 0
            }]
          }
        ]
      }));
    }
  }, [dashboardData?.newLeadsDashboardData, newLeadsDashboardFilter]);

  // Update chart data when dashboard data changes
  useEffect(() => {
    console.log("[LeadDashboard] Pipeline stages useEffect triggered");
    console.log("[LeadDashboard] dashboardData:", dashboardData);
    
    if (dashboardData?.pipelineStages) {
      console.log("[LeadDashboard] Pipeline stages data:", dashboardData.pipelineStages);
      console.log("[LeadDashboard] Monthly data:", dashboardData.pipelineStages.monthlyData);
      
      // Use actual monthly data if available, otherwise fallback to repeating totals
      let incomeData: number[] = [];

      if (dashboardData.pipelineStages.monthlyData && dashboardData.pipelineStages.monthlyData.closedIncome) {
        // Use actual monthly income data from closed leads
        const monthlyData = dashboardData.pipelineStages.monthlyData;
        incomeData = monthlyData.closedIncome || Array(12).fill(0);
        
        console.log("[LeadDashboard] Using monthly income data for pipeline:", { 
          monthlyData: monthlyData,
          closedIncome: monthlyData.closedIncome,
          incomeData: incomeData 
        });
      } else {
        // Fallback to repeating totals (old behavior)
        const closed = dashboardData.pipelineStages.Closed || 0;
        incomeData = Array(12).fill(closed); // Fallback to repeating closed leads count
        
        console.log("[LeadDashboard] Using fallback data for pipeline:", { 
          closed: closed,
          incomeData: incomeData 
        });
      }

      console.log("[LeadDashboard] Final income data for chart:", incomeData);

      // Use actual income data from MongoDB
      setRevenueIncome((prev: any) => {
        const newConfig = {
          ...prev,
          series: [
            { name: 'Income', data: incomeData } // Use actual data from MongoDB
          ],
          yaxis: {
            min: 0,
            max: Math.max(...incomeData, 100), // Adjust max dynamically based on data
            labels: {
              offsetX: -15,
              style: {
                colors: '#6B7280',
                fontSize: '13px',
              },
              formatter: function (value: number) {
                return value + "K"; // Append 'K' for thousands
              }
            }
          },
          tooltip: {
            y: {
              formatter: function (val: number) {
                return val + "K";
              }
            }
          }
        };
        
        console.log("[LeadDashboard] Updated chart config with actual data:", newConfig);
        return newConfig;
      });
    } else {
      console.log("[LeadDashboard] No pipeline stages data available");
    }
  }, [dashboardData?.pipelineStages]);

      // Update Lost Leads By Reason chart when dashboard data changes
    useEffect(() => {
      console.log("[LeadDashboard] Lost Leads By Reason useEffect triggered");
      console.log("[LeadDashboard] dashboardData?.lostLeadsByReason:", dashboardData?.lostLeadsByReason);
      
      try {
        if (dashboardData?.lostLeadsByReason && Object.keys(dashboardData.lostLeadsByReason).length > 0) {
          
          // Check if we have "No Data" indicator
          if (dashboardData.lostLeadsByReason["No Data"] !== undefined) {
            console.log("[LeadDashboard] No data for lost leads by reason, showing no data chart");
            setLeadsStage((prev: any) => ({
              ...prev,
              series: [{
                name: 'Lost Leads',
                data: [0, 0, 0, 0]
              }],
              xaxis: {
                ...prev.xaxis,
                categories: ['No Data', '', '', '']
              }
            }));
            return;
          }
          
          // Get dynamic categories from the data
          const categories = Object.keys(dashboardData.lostLeadsByReason).filter(key => key !== "No Data");
          const values = categories.map(category => dashboardData.lostLeadsByReason[category] || 0);
          
          console.log("[LeadDashboard] Lost leads categories:", categories);
          console.log("[LeadDashboard] Lost leads values:", values);
          
          // Ensure we have valid data
          if (categories.length > 0 && values.length > 0 && values.every(val => typeof val === 'number')) {
            console.log("[LeadDashboard] Setting valid lost leads chart data:", { categories, values });
            setLeadsStage((prev: any) => ({
              ...prev,
              series: [{
                name: 'Lost Leads',
                data: [...values]
              }],
              xaxis: {
                ...prev.xaxis,
                categories: [...categories]
              }
            }));
          } else {
            console.log("[LeadDashboard] Invalid lost leads data, showing no data");
            setLeadsStage((prev: any) => ({
              ...prev,
              series: [{
                name: 'Lost Leads',
                data: [0, 0, 0, 0]
              }],
              xaxis: {
                ...prev.xaxis,
                categories: ['No Data', '', '', '']
              }
            }));
          }
        } else {
          console.log("[LeadDashboard] No lost leads data available, showing no data");
          setLeadsStage((prev: any) => ({
            ...prev,
            series: [{
              name: 'Lost Leads',
              data: [0, 0, 0, 0]
            }],
            xaxis: {
              ...prev.xaxis,
              categories: ['No Data', '', '', '']
            }
          }));
        }
      } catch (error) {
        console.error("[LeadDashboard] Error updating lost leads chart:", error);
        setLeadsStage((prev: any) => ({
          ...prev,
          series: [{
            name: 'Lost Leads',
            data: [0, 0, 0, 0]
          }],
          xaxis: {
            ...prev.xaxis,
            categories: ['No Data', '', '', '']
          }
        }));
      }
    }, [dashboardData?.lostLeadsByReason]);

  // Update the donut chart to be dynamic
  useEffect(() => {
    console.log("[LeadDashboard] leadsBySource useEffect triggered");
    console.log("[LeadDashboard] dashboardData?.leadsBySource:", dashboardData?.leadsBySource);
    console.log("[LeadDashboard] Array.isArray check:", Array.isArray(dashboardData?.leadsBySource));
    console.log("[LeadDashboard] Length check:", dashboardData?.leadsBySource?.length);
    
    try {
      if (dashboardData?.leadsBySource && Array.isArray(dashboardData.leadsBySource) && dashboardData.leadsBySource.length > 0) {
        console.log("[LeadDashboard] Updating donut chart with leadsBySource data:", dashboardData.leadsBySource);
        
        const sources = dashboardData.leadsBySource;
        const labels = sources.map((source: any) => source.name || 'Unknown').filter(Boolean);
        const series = sources.map((source: any) => {
          const count = parseInt(source.count) || 0;
          return isNaN(count) ? 0 : count;
        });
        
        console.log("[LeadDashboard] Donut chart labels:", labels);
        console.log("[LeadDashboard] Donut chart series:", series);
        
                         // Ensure both arrays are valid
        if (labels.length > 0 && series.length > 0 && series.every((val: any) => typeof val === 'number')) {
          console.log("[LeadDashboard] Setting valid chart data:", { series, labels });
          setDonutChart2((prev: any) => ({
            ...prev,
            series: [...series], // Create a new array to avoid reference issues
            labels: [...labels]  // Create a new array to avoid reference issues
          }));
        } else {
          console.log("[LeadDashboard] Invalid data, showing no data");
          setDonutChart2((prev: any) => ({
            ...prev,
            series: [0],
            labels: ['No Data']
          }));
        }
      } else {
        console.log("[LeadDashboard] No leadsBySource data available for donut chart");
        console.log("[LeadDashboard] Showing no data");
        
        // Set no data
        setDonutChart2((prev: any) => ({
          ...prev,
          series: [0],
          labels: ['No Data']
        }));
      }
    } catch (error) {
      console.error("[LeadDashboard] Error updating donut chart:", error);
      // Set no data
      setDonutChart2((prev: any) => ({
        ...prev,
        series: [0],
        labels: ['No Data']
      }));
    }
  }, [dashboardData?.leadsBySource]);

  // Debug: Log leadsByCompanies data changes
  useEffect(() => {
    if (dashboardData?.leadsByCompanies) {
      console.log("[LeadDashboard] leadsByCompanies data updated successfully");
    }
  }, [dashboardData?.leadsByCompanies, leadsByCompaniesFilter]);

  // Add useEffect to update donut chart when dashboard data changes
  useEffect(() => {
    console.log("[LeadDashboard] Top Countries useEffect triggered");
    console.log("[LeadDashboard] dashboardData?.topCountries:", dashboardData?.topCountries);
    console.log("[LeadDashboard] Array.isArray check:", Array.isArray(dashboardData?.topCountries));
    console.log("[LeadDashboard] Length check:", dashboardData?.topCountries?.length);
    
    try {
      if (dashboardData?.topCountries && Array.isArray(dashboardData.topCountries) && dashboardData.topCountries.length > 0) {
        const countries = dashboardData.topCountries;
        console.log("[LeadDashboard] Processing top countries data:", countries);
        
        // Check if we have "No Data" indicator
        const hasNoData = countries.some((country: any) => country.name === "No Data");
        
        if (hasNoData) {
          console.log("[LeadDashboard] No data for top countries, showing no data chart");
          setDonutChart3((prev: any) => ({
            ...prev,
            series: [0],
            labels: ['No Data']
          }));
          return;
        }
        
        const labels = countries.map((country: any) => country.name || 'Unknown').filter(Boolean);
        const series = countries.map((country: any) => {
          const leads = parseInt(country.leads) || 0;
          return isNaN(leads) ? 0 : leads;
        });
        
        console.log("[LeadDashboard] Top countries labels:", labels);
        console.log("[LeadDashboard] Top countries series:", series);
        
        // Ensure both arrays are valid
        if (labels.length > 0 && series.length > 0 && series.every((val: any) => typeof val === 'number')) {
          console.log("[LeadDashboard] Setting valid top countries chart data:", { series, labels });
          setDonutChart3((prev: any) => ({
            ...prev,
            series: [...series], // Create a new array to avoid reference issues
            labels: [...labels]  // Create a new array to avoid reference issues
          }));
        } else {
          console.log("[LeadDashboard] Invalid top countries data, showing no data");
          setDonutChart3((prev: any) => ({
            ...prev,
            series: [0],
            labels: ['No Data']
          }));
        }
      } else {
        console.log("[LeadDashboard] No top countries data available, showing no data");
        setDonutChart3((prev: any) => ({
          ...prev,
          series: [0],
          labels: ['No Data']
        }));
      }
    } catch (error) {
      console.error("[LeadDashboard] Error updating top countries chart:", error);
      setDonutChart3((prev: any) => ({
        ...prev,
        series: [0],
        labels: ['No Data']
      }));
    }
  }, [dashboardData?.topCountries]);

  // Dropdown handler
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter(e.target.value as 'week' | 'month' | 'year');
  };

  // Date range change handler
  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
  };

  // New leads filter change handler
  const handleNewLeadsFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    console.log("[LeadDashboard] New leads filter changed:", e.target.value);
    setNewLeadsFilter(e.target.value as 'week' | 'month' | 'year');
  };

  const handleNewLeadsDashboardFilterChange = (filter: 'week' | 'month' | 'year') => {
    console.log("[LeadDashboard] New Leads Dashboard filter changed to:", filter);
    setNewLeadsDashboardFilter(filter);
    
    // Force immediate data fetch for debugging
    if (socket && (socket as any).connected) {
      console.log("[LeadDashboard] Emitting immediate data fetch for newLeadsDashboard");
      (socket as any).emit("lead/dashboard/get-all-data", { 
        filter, 
        dateRange, 
        newLeadsFilter, 
        newLeadsDashboardFilter: filter, // Use the new filter immediately
        pipelineYear: selectedPipelineYear, 
        lostLeadsReasonFilter,
        leadsByCompaniesFilter,
        leadsBySourceFilter,
        topCountriesFilter
      });
    }
  };

  // Add handler for Leads By Companies filter
  const handleLeadsByCompaniesFilterChange = (filter: 'thisMonth' | 'thisWeek' | 'lastWeek') => {
    console.log("[LeadDashboard] Leads By Companies filter changed to:", filter);
    setLeadsByCompaniesFilter(filter);
  };

  // 2. Add handler:
  const handleLostLeadsReasonFilterChange = (filter: 'thisMonth' | 'thisWeek' | 'lastWeek') => {
    console.log("[LeadDashboard] Lost Leads Reason filter changed to:", filter);
    setLostLeadsReasonFilter(filter);
    
    // Force immediate data fetch for debugging
    if (socket && (socket as any).connected) {
      console.log("[LeadDashboard] Emitting immediate data fetch for lostLeadsReason");
      (socket as any).emit("lead/dashboard/get-all-data", { 
        filter, 
        dateRange, 
        newLeadsFilter, 
        newLeadsDashboardFilter, 
        pipelineYear: selectedPipelineYear, 
        lostLeadsReasonFilter: filter, // Use the new filter immediately
        leadsByCompaniesFilter,
        leadsBySourceFilter,
        topCountriesFilter
      });
    }
  };

  return (
    <>
      {/* Page Wrapper */}
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Leads Dashboard</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">Dashboard</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Leads Dashboard
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
                    Export
                  </Link>
                  <ul className="dropdown-menu  dropdown-menu-end p-3">
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                      >
                        <i className="ti ti-file-type-pdf me-1" />
                        Export as PDF
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                      >
                        <i className="ti ti-file-type-xls me-1" />
                        Export as Excel{" "}
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="input-icon mb-2 position-relative">
                <PredefinedDateRanges 
                  onChange={handleDateRangeChange}
                  value={dateRange}
                />
              </div>
              <div className="ms-2 head-icons">
                <CollapseHeader />
              </div>
            </div>
          </div>
          {/* /Breadcrumb */}
          <div className="row">
            <div className="col-xl-3 col-md-6">
              <div className="card position-relative">
                <div className="card-body">
                  <div className="d-flex align-items-center mb-3">
                    <div className="avatar avatar-md br-10 icon-rotate bg-primary flex-shrink-0">
                      <span className="d-flex align-items-center">
                        <i className="ti ti-delta text-white fs-16" />
                      </span>
                    </div>
                    <div className="ms-3">
                      <p className="fw-medium text-truncate mb-1">
                        Total No of Leads
                      </p>
                      <h5>{dashboardData?.totalLeads || 0}</h5>
                    </div>
                  </div>
                  <div className="progress progress-xs mb-2">
                    <div
                      className="progress-bar bg-primary"
                      role="progressbar"
                      style={{ width: "40%" }}
                    />
                  </div>
                  <p className="fw-medium fs-13 mb-0">
                    {/* <span className="text-danger fs-12">
                      <i className="ti ti-arrow-wave-right-up me-1" />
                      -4.01%{" "}
                    </span>{" "}
                    from last week */}
                  </p>
                  <span className="position-absolute top-0 end-0">
                    <ImageWithBasePath src="assets/img/bg/card-bg-04.png" alt="Img" />
                  </span>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-md-6">
              <div className="card position-relative">
                <div className="card-body">
                  <div className="d-flex align-items-center mb-3">
                    <div className="avatar avatar-md br-10 icon-rotate bg-secondary flex-shrink-0">
                      <span className="d-flex align-items-center">
                        <i className="ti ti-currency text-white fs-16" />
                      </span>
                    </div>
                    <div className="ms-3">
                      <p className="fw-medium text-truncate mb-1">
                        No of New Leads
                      </p>
                      <h5>{dashboardData?.newLeads || 0}</h5>
                    </div>
                  </div>
                  <div className="progress progress-xs mb-2">
                    <div
                      className="progress-bar bg-secondary"
                      role="progressbar"
                      style={{ width: "40%" }}
                    />
                  </div>
                  <span className="position-absolute top-0 end-0">
                    <ImageWithBasePath src="assets/img/bg/card-bg-04.png" alt="Img" />
                  </span>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-md-6">
              <div className="card position-relative">
                <div className="card-body">
                  <div className="d-flex align-items-center mb-3">
                    <div className="avatar avatar-md br-10 icon-rotate bg-danger flex-shrink-0">
                      <span className="d-flex align-items-center">
                        <i className="ti ti-stairs-up text-white fs-16" />
                      </span>
                    </div>
                    <div className="ms-3">
                      <p className="fw-medium text-truncate mb-1">
                        No of Lost Leads
                      </p>
                      <h5>{dashboardData?.lostLeads || 0}</h5>
                    </div>
                  </div>
                  <div className="progress progress-xs mb-2">
                    <div
                      className="progress-bar bg-pink"
                      role="progressbar"
                      style={{ width: "40%" }}
                    />
                  </div>
                  <p className="fw-medium fs-13 mb-0">
                    {/* <span className="text-success fs-12">
                      <i className="ti ti-arrow-wave-right-up me-1" />
                      +55%{" "}
                    </span>{" "}
                    from last week */}
                  </p>
                  <span className="position-absolute top-0 end-0">
                    <ImageWithBasePath src="assets/img/bg/card-bg-04.png" alt="Img" />
                  </span>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-md-6">
              <div className="card position-relative">
                <div className="card-body">
                  <div className="d-flex align-items-center mb-3">
                    <div className="avatar avatar-md br-10 icon-rotate bg-purple flex-shrink-0">
                      <span className="d-flex align-items-center">
                        <i className="ti ti-users-group text-white fs-16" />
                      </span>
                    </div>
                    <div className="ms-3">
                      <p className="fw-medium text-truncate mb-1">
                        No of Total Customers
                      </p>
                      <h5>{dashboardData?.totalCustomers || 0}</h5>
                    </div>
                  </div>
                  <div className="progress progress-xs mb-2">
                    <div
                      className="progress-bar bg-purple"
                      role="progressbar"
                      style={{ width: "40%" }}
                    />
                  </div>
                  <p className="fw-medium fs-13 mb-0">
                    {/* <span className="text-success fs-12">
                      <i className="ti ti-arrow-wave-right-up me-1" />
                      +55%{" "}
                    </span>{" "}
                    from last week */}
                  </p>
                  <span className="position-absolute top-0 end-0">
                    <ImageWithBasePath src="assets/img/bg/card-bg-04.png" alt="Img" />
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-xl-8 d-flex">
              <div className="card flex-fill">
                <div className="card-header">
                  <div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2">
                    <h5>Pipeline Stages</h5>
                    <div className="dropdown">
                      <button
                        className="btn btn-white border btn-sm d-inline-flex align-items-center dropdown-toggle"
                        type="button"
                        id="pipelineYearDropdown"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                      >
                        <i className="ti ti-calendar me-1" />
                        {selectedPipelineYear}
                      </button>
                      <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="pipelineYearDropdown">
                        {[currentYear, currentYear - 1, currentYear - 2].map(year => (
                                                  <li key={year}>
                          <button
                            className={`dropdown-item${selectedPipelineYear === year ? ' active' : ''}`}
                            onClick={() => setSelectedPipelineYear(year)}
                          >
                            {year}
                          </button>
                        </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="card-body pb-0">
                  <div className="row g-2 justify-content-center mb-3">
                    <div className="col-md col-sm-4 col-6">
                      <div className="border rounded p-2">
                        <p className="mb-1">
                          <i className="ti ti-point-filled text-primary" />
                          Contacted
                        </p>
                        <h6>{dashboardData?.pipelineStages?.Contacted || 0}</h6>
                      </div>
                    </div>
                    <div className="col-md col-sm-4 col-6">
                      <div className="border rounded p-2">
                        <p className="mb-1">
                          <i className="ti ti-point-filled text-primary" />
                          Opportunity
                        </p>
                        <h6>{dashboardData?.pipelineStages?.Opportunity || 0}</h6>
                      </div>
                    </div>
                    <div className="col-md col-sm-4 col-6">
                      <div className="border rounded p-2">
                        <p className="mb-1">
                          <i className="ti ti-point-filled text-primary" />
                          Not Contacted
                        </p>
                        <h6>{dashboardData?.pipelineStages?.['Not Contacted'] || 0}</h6>
                      </div>
                    </div>
                    <div className="col-md col-sm-4 col-6">
                      <div className="border rounded p-2">
                        <p className="mb-1">
                          <i className="ti ti-point-filled text-primary" />
                          Closed
                        </p>
                        <h6>{dashboardData?.pipelineStages?.Closed || 0}</h6>
                      </div>
                    </div>
                    <div className="col-md col-sm-4 col-6">
                      <div className="border rounded p-2">
                        <p className="mb-1">
                          <i className="ti ti-point-filled text-primary" />
                          Lost
                        </p>
                        <h6>{dashboardData?.pipelineStages?.Lost || 0}</h6>
                      </div>
                    </div>
                  </div>
                  <ReactApexChart
                    key={`revenue-income-${Date.now()}`}
                    id="revenue-income"
                    options={revenue_income}
                    series={revenue_income.series}
                    type="bar"
                    height={230}
                  />
                </div>
              </div>
            </div>
            <div className="col-xl-4 d-flex">
              <div className="card flex-fill">
                <div className="card-header">
                  <div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2">
                    <h5>New Leads</h5>
                    <div className="dropdown">
                      <Link
                        to="#"
                        className="btn btn-white border btn-sm d-inline-flex align-items-center"
                        data-bs-toggle="dropdown"
                      >
                        <i className="ti ti-calendar me-1" />
                        {newLeadsDashboardFilter === 'week' ? 'This Week' : 
                         newLeadsDashboardFilter === 'month' ? 'This Month' : 'This Year'}
                      </Link>
                      <ul className="dropdown-menu  dropdown-menu-end p-3">
                        <li>
                          <Link
                            to="#"
                            className="dropdown-item rounded-1"
                            onClick={() => handleNewLeadsDashboardFilterChange('week')}
                          >
                            This Week
                          </Link>
                        </li>
                        <li>
                          <Link
                            to="#"
                            className="dropdown-item rounded-1"
                            onClick={() => handleNewLeadsDashboardFilterChange('month')}
                          >
                            This Month
                          </Link>
                        </li>
                        <li>
                          <Link
                            to="#"
                            className="dropdown-item rounded-1"
                            onClick={() => handleNewLeadsDashboardFilterChange('year')}
                          >
                            This Year
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="card-body pb-0">
                  <ReactApexChart
                    id="heat_chart"
                    key={`heat_chart-${newLeadsDashboardFilter}-${JSON.stringify(dashboardData?.newLeadsDashboardData || [])}`}
                    options={heat_chart}
                    series={heat_chart.series}
                    type="heatmap"
                    height={300}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-xl-4 d-flex">
              <div className="card flex-fill">
                <div className="card-header">
                  <div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2">
                    <h5>Lost Leads By Reason</h5>
                    <div className="dropdown">
                      <Link
                        to="#"
                        className="btn btn-white border-0 dropdown-toggle btn-sm d-inline-flex align-items-center"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                      >
                        {lostLeadsReasonFilter === 'thisMonth'
                          ? 'This Month'
                          : lostLeadsReasonFilter === 'thisWeek'
                          ? 'This Week'
                          : 'Last Week'}
                      </Link>
                      <ul className="dropdown-menu dropdown-menu-end p-3">
                        <li>
                          <Link to="#" className="dropdown-item rounded-1" onClick={() => handleLostLeadsReasonFilterChange('thisMonth')}>
                            This Month
                          </Link>
                        </li>
                        <li>
                          <Link to="#" className="dropdown-item rounded-1" onClick={() => handleLostLeadsReasonFilterChange('thisWeek')}>
                            This Week
                          </Link>
                        </li>
                        <li>
                          <Link to="#" className="dropdown-item rounded-1" onClick={() => handleLostLeadsReasonFilterChange('lastWeek')}>
                            Last Week
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="card-body py-0">
                  <div>
                    {dashboardData?.lostLeadsByReason && Object.keys(dashboardData.lostLeadsByReason).length > 0 ? (
                       (() => {
                         // Check if we have "No Data" indicator
                         const hasNoData = dashboardData.lostLeadsByReason["No Data"] !== undefined;
                         
                         if (hasNoData) {
                           return (
                             <div className="d-flex align-items-center justify-content-center" style={{ height: '355px' }}>
                               <div className="text-center">
                                 <p className="text-muted mb-0">No Data Available</p>
                                 <p className="text-muted mb-0">No lost leads found for the selected time period</p>
                               </div>
                             </div>
                           );
                         }
                         
                         return (
                    <ReactApexChart
                      id="leads_stage"
                      key={`leads_stage-${JSON.stringify(dashboardData.lostLeadsByReason)}`}
                      options={leads_stage}
                      series={leads_stage.series}
                      type="bar"
                      height={355}
                    />
                         );
                       })()
                     ) : (
                       dataReceived ? (
                         <div className="d-flex align-items-center justify-content-center" style={{ height: '355px' }}>
                           <div className="text-center">
                             <p className="text-muted mb-0">No Data Available</p>
                             <p className="text-muted mb-0">No lost leads found for the selected time period</p>
                           </div>
                         </div>
                       ) : (
                         <div className="d-flex align-items-center justify-content-center" style={{ height: '355px' }}>
                           <div className="text-center">
                             <div className="spinner-border text-primary" role="status">
                               <span className="visually-hidden">Loading...</span>
                             </div>
                             <p className="mt-2 text-muted">Loading Lost Leads Data...</p>
                           </div>
                         </div>
                       )
                     )}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-4 d-flex">
              <div className="card flex-fill">
                <div className="card-header">
                  <div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2">
                    <h5>Leads By Companies</h5>
                    <div className="dropdown">
                      <Link
                        to="#"
                        className="btn btn-white border btn-sm d-inline-flex align-items-center"
                        data-bs-toggle="dropdown"
                      >
                        <i className="ti ti-calendar me-1" />
                        {leadsByCompaniesFilter === 'thisMonth'
                          ? 'This Month'
                          : leadsByCompaniesFilter === 'thisWeek'
                          ? 'This Week'
                          : 'Last Week'}
                      </Link>
                      <ul className="dropdown-menu dropdown-menu-end p-3">
                        <li>
                          <Link to="#" className="dropdown-item rounded-1" onClick={() => handleLeadsByCompaniesFilterChange('thisMonth')}>
                            This Month
                          </Link>
                        </li>
                        <li>
                          <Link to="#" className="dropdown-item rounded-1" onClick={() => handleLeadsByCompaniesFilterChange('thisWeek')}>
                            This Week
                          </Link>
                        </li>
                        <li>
                          <Link to="#" className="dropdown-item rounded-1" onClick={() => handleLeadsByCompaniesFilterChange('lastWeek')}>
                            Last Week
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  <div>
                    {dashboardData?.leadsByCompanies && dashboardData.leadsByCompanies.length > 0 ? (
                      dashboardData.leadsByCompanies.map((company: any, index: number) => (
                        <div key={index} className="border border-dashed bg-transparent-light rounded p-2 mb-2">
                      <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center">
                          <Link
                            to="#"
                            className="avatar avatar-md rounded-circle bg-gray-100 flex-shrink-0 me-2"
                          >
                            <ImageWithBasePath
                                  src={`assets/img/company/company-${24 + index}.svg`}
                              className="w-auto h-auto"
                              alt="Img"
                            />
                          </Link>
                          <div>
                                <h6 className="fw-medium mb-1">{company.name || 'Unknown Company'}</h6>
                                <p className="text-truncate">Value : ${company.value || 0}</p>
                          </div>
                        </div>
                            <span className={`badge d-inline-flex align-items-center ${
                              company.status === 'Closed' ? 'badge-success' :
                              company.status === 'Contacted' ? 'badge-secondary' :
                              company.status === 'Lost' ? 'badge-danger' :
                              company.status === 'Opportunity' ? 'badge-warning' :
                              'badge-purple'
                            }`}>
                          <i className="ti ti-point-filled me-1" />
                              {company.status || 'Not Contacted'}
                        </span>
                      </div>
                    </div>
                      ))
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-muted mb-0">No company data available</p>
                          </div>
                    )}
                        </div>
                </div>
              </div>
            </div>
            <div className="col-xl-4 d-flex">
              <div className="card flex-fill">
                <div className="card-header">
                  <div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2">
                    <h5>Leads by Source</h5>
                    <div className="dropdown">
                      <Link
                        to="#"
                        className="btn btn-white border btn-sm d-inline-flex align-items-center"
                        data-bs-toggle="dropdown"
                      >
                        <i className="ti ti-calendar me-1" />
                        {leadsBySourceFilter === 'thisMonth'
                          ? 'This Month'
                          : leadsBySourceFilter === 'thisWeek'
                          ? 'This Week'
                          : 'Last Week'}
                      </Link>
                      <ul className="dropdown-menu dropdown-menu-end p-3">
                        <li>
                          <Link to="#" className="dropdown-item rounded-1" onClick={() => handleLeadsBySourceFilterChange('thisMonth')}>
                            This Month
                          </Link>
                        </li>
                        <li>
                          <Link to="#" className="dropdown-item rounded-1" onClick={() => handleLeadsBySourceFilterChange('thisWeek')}>
                            This Week
                          </Link>
                        </li>
                        <li>
                          <Link to="#" className="dropdown-item rounded-1" onClick={() => handleLeadsBySourceFilterChange('lastWeek')}>
                            Last Week
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="card-body">
                                    {donutchart2.series && 
                   donutchart2.labels && 
                   Array.isArray(donutchart2.series) && 
                   Array.isArray(donutchart2.labels) &&
                   donutchart2.series.length > 0 && 
                   donutchart2.labels.length > 0 &&
                   donutchart2.series.every((val: any) => typeof val === 'number') ? (
                  <ReactApexChart
                    id="donut-chart-2"
                     key={`donut-chart-2-${Date.now()}`}
                    options={donutchart2}
                    series={donutchart2.series}
                    type="donut"
                    height={185}
                  />
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-muted mb-0">No Data Available</p>
                      <p className="text-muted mb-0">No leads found for the selected time period</p>
                    </div>
                  )}
                  <div>
                    <h6 className="mb-3">Status</h6>
                    {dashboardData?.leadsBySource && Array.isArray(dashboardData.leadsBySource) && dashboardData.leadsBySource.length > 0 ? (
                      (() => {
                        console.log("[LeadDashboard] Rendering leadsBySource status section with data:", dashboardData.leadsBySource);
                        
                        // Check if we have "No Data" indicator
                        const hasNoData = dashboardData.leadsBySource.some((source: any) => source.name === "No Data");
                        
                        if (hasNoData) {
                          return (
                            <div className="text-center py-2">
                              <p className="text-muted mb-0">No Data Available</p>
                              <p className="text-muted mb-0">No leads found for the selected time period</p>
                    </div>
                          );
                        }
                        
                        return dashboardData.leadsBySource.map((source: any, index: number) => {
                          const colors = ['text-secondary', 'text-warning', 'text-pink', 'text-purple', 'text-success', 'text-info'];
                          const colorClass = colors[index % colors.length];
                          const totalLeads = dashboardData.leadsBySource.reduce((sum: number, s: any) => sum + s.count, 0);
                          const percentage = totalLeads > 0 ? Math.round((source.count / totalLeads) * 100) : 0;
                          
                          console.log("[LeadDashboard] Source:", source.name, "Count:", source.count, "Percentage:", percentage + "%");
                          
                          return (
                            <div key={index} className="d-flex align-items-center justify-content-between mb-2">
                      <p className="f-13 mb-0">
                                <i className={`ti ti-circle-filled ${colorClass} me-1`} />
                                {source.name}
                      </p>
                              <p className="f-13 fw-medium text-gray-9">{percentage}%</p>
                    </div>
                          );
                        });
                      })()
                    ) : (
                      <div className="text-center py-2">
                        <p className="text-muted mb-0">No Data Available</p>
                        <p className="text-muted mb-0">No leads found for the selected time period</p>
                    </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-xl-4 d-flex">
              <div className="card flex-fill">
                <div className="card-header">
                  <div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2">
                    <h5>Recent Follow Up</h5>
                    <div>
                      <Link to="#" className="btn btn-light btn-sm px-3">
                        View All
                      </Link>
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between mb-4">
                    <div className="d-flex align-items-center">
                      <Link
                        to="#"
                        className="avatar flex-shrink-0"
                      >
                        <ImageWithBasePath
                          src="assets/img/users/user-27.jpg"
                          className="rounded-circle border border-2"
                          alt="img"
                        />
                      </Link>
                      <div className="ms-2">
                        <h6 className="fs-14 fw-medium text-truncate mb-1">
                          <Link to="#">Alexander Jermai</Link>
                        </h6>
                        <p className="fs-13">UI/UX Designer</p>
                      </div>
                    </div>
                    <div className="d-flex align-items-center">
                      <Link to="#" className="btn btn-light btn-icon btn-sm">
                        <i className="ti ti-mail-bolt fs-16" />
                      </Link>
                    </div>
                  </div>
                  <div className="d-flex align-items-center justify-content-between mb-4">
                    <div className="d-flex align-items-center">
                      <Link
                        to="#"
                        className="avatar flex-shrink-0"
                      >
                        <ImageWithBasePath
                          src="assets/img/users/user-42.jpg"
                          className="rounded-circle border border-2"
                          alt="img"
                        />
                      </Link>
                      <div className="ms-2">
                        <h6 className="fs-14 fw-medium text-truncate mb-1">
                          <Link to="#">Doglas Martini</Link>
                        </h6>
                        <p className="fs-13">Product Designer</p>
                      </div>
                    </div>
                    <div className="d-flex align-items-center">
                      <Link to="#" className="btn btn-light btn-icon btn-sm">
                        <i className="ti ti-phone-x fs-16" />
                      </Link>
                    </div>
                  </div>
                  <div className="d-flex align-items-center justify-content-between mb-4">
                    <div className="d-flex align-items-center">
                      <Link
                        to="#"
                        className="avatar flex-shrink-0"
                      >
                        <ImageWithBasePath
                          src="assets/img/users/user-43.jpg"
                          className="rounded-circle border border-2"
                          alt="img"
                        />
                      </Link>
                      <div className="ms-2">
                        <h6 className="fs-14 fw-medium text-truncate mb-1">
                          <Link to="#">Daniel Esbella</Link>
                        </h6>
                        <p className="fs-13">Project Manager</p>
                      </div>
                    </div>
                    <div className="d-flex align-items-center">
                      <Link to="#" className="btn btn-light btn-icon btn-sm">
                        <i className="ti ti-mail-bolt fs-16" />
                      </Link>
                    </div>
                  </div>
                  <div className="d-flex align-items-center justify-content-between mb-4">
                    <div className="d-flex align-items-center">
                      <Link
                        to="#"
                        className="avatar flex-shrink-0"
                      >
                        <ImageWithBasePath
                          src="assets/img/users/user-11.jpg"
                          className="rounded-circle border border-2"
                          alt="img"
                        />
                      </Link>
                      <div className="ms-2">
                        <h6 className="fs-14 fw-medium text-truncate mb-1">
                          <Link to="#">Daniel Esbella</Link>
                        </h6>
                        <p className="fs-13">Team Lead</p>
                      </div>
                    </div>
                    <div className="d-flex align-items-center">
                      <Link to="#" className="btn btn-light btn-icon btn-sm">
                        <i className="ti ti-brand-hipchat fs-16" />
                      </Link>
                    </div>
                  </div>
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                      <Link
                        to="#"
                        className="avatar flex-shrink-0"
                      >
                        <ImageWithBasePath
                          src="assets/img/users/user-45.jpg"
                          className="rounded-circle border border-2"
                          alt="img"
                        />
                      </Link>
                      <div className="ms-2">
                        <h6 className="fs-14 fw-medium text-truncate mb-1">
                          <Link to="#">Doglas Martini</Link>
                        </h6>
                        <p className="fs-13">Team Lead</p>
                      </div>
                    </div>
                    <div className="d-flex align-items-center">
                      <Link to="#" className="btn btn-light btn-icon btn-sm">
                        <i className="ti ti-brand-hipchat fs-16" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-4 d-flex">
              <div className="card flex-fill">
                <div className="card-header">
                  <div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2">
                    <h5>Recent Activities</h5>
                    <div>
                      <Link to="activity.html" className="btn btn-sm btn-light px-3">
                        View All
                      </Link>
                    </div>
                  </div>
                </div>
                <div className="card-body schedule-timeline activity-timeline">
                  <div className="d-flex align-items-start">
                    <div className="avatar avatar-md avatar-rounded bg-success flex-shrink-0">
                      <i className="ti ti-phone fs-20" />
                    </div>
                    <div className="flex-fill ps-3 pb-4 timeline-flow">
                      <p className="fw-medium text-gray-9 mb-1">
                        <Link to="activity.html">
                          Drain responded to your appointment schedule question.
                        </Link>
                      </p>
                      <span>09:25 PM</span>
                    </div>
                  </div>
                  <div className="d-flex align-items-start">
                    <div className="avatar avatar-md avatar-rounded bg-info flex-shrink-0">
                      <i className="ti ti-message-circle-2 fs-20" />
                    </div>
                    <div className="flex-fill ps-3 pb-4 timeline-flow">
                      <p className="fw-medium text-gray-9 mb-1">
                        <Link to="activity.html">You sent 1 Message to the James.</Link>
                      </p>
                      <span>10:25 PM</span>
                    </div>
                  </div>
                  <div className="d-flex align-items-start">
                    <div className="avatar avatar-md avatar-rounded bg-success flex-shrink-0">
                      <i className="ti ti-phone fs-20" />
                    </div>
                    <div className="flex-fill ps-3 pb-4 timeline-flow">
                      <p className="fw-medium text-gray-9 mb-1">
                        <Link to="activity.html">
                          Denwar responded to your appointment on 25 Jan 2025, 08:15
                          PM
                        </Link>
                      </p>
                      <span>09:25 PM</span>
                    </div>
                  </div>
                  <div className="d-flex align-items-start">
                    <div className="avatar avatar-md avatar-rounded bg-purple flex-shrink-0">
                      <i className="ti ti-user-circle fs-20" />
                    </div>
                    <div className="flex-fill ps-3 timeline-flow">
                      <p className="fw-medium text-gray-9 mb-1">
                        <Link
                          to="activity.html"
                          className="d-flex align-items-center"
                        >
                          Meeting With{" "}
                          <ImageWithBasePath
                            src="assets/img/users/user-58.jpg"
                            className="avatar avatar-sm rounded-circle mx-2"
                            alt="Img"
                          />
                          Abraham
                        </Link>
                      </p>
                      <span>09:25 PM</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-4 d-flex">
              <div className="card flex-fill">
                <div className="card-header">
                  <div className="d-flex align-items-center justify-content-between flex-wrap">
                    <h5>Notifications</h5>
                    <div>
                      <Link to="#" className="btn btn-light btn-sm px-3">
                        View All
                      </Link>
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  <div className="d-flex align-items-start mb-4">
                    <Link to="#" className="avatar flex-shrink-0">
                      <ImageWithBasePath
                        src="assets/img/users/user-27.jpg"
                        className="rounded-circle border border-2"
                        alt="img"
                      />
                    </Link>
                    <div className="ms-2">
                      <h6 className="fs-14 fw-medium text-truncate mb-1">
                        Lex Murphy requested access to UNIX{" "}
                      </h6>
                      <p className="fs-13 mb-2">Today at 9:42 AM</p>
                      <div className="d-flex align-items-center">
                        <Link
                          to="#"
                          className="avatar avatar-sm border flex-shrink-0 me-2"
                        >
                          <ImageWithBasePath
                            src="assets/img/social/pdf-icon.svg"
                            className="w-auto h-auto"
                            alt="Img"
                          />
                        </Link>
                        <h6 className="fw-normal">
                          <Link to="#">EY_review.pdf</Link>
                        </h6>
                      </div>
                    </div>
                  </div>
                  <div className="d-flex align-items-start mb-4">
                    <Link to="#" className="avatar flex-shrink-0">
                      <ImageWithBasePath
                        src="assets/img/users/user-28.jpg"
                        className="rounded-circle border border-2"
                        alt="img"
                      />
                    </Link>
                    <div className="ms-2">
                      <h6 className="fs-14 fw-medium text-truncate mb-1">
                        Lex Murphy requested access to UNIX{" "}
                      </h6>
                      <p className="fs-13 mb-0">Today at 10:00 AM</p>
                    </div>
                  </div>
                  <div className="d-flex align-items-start mb-4">
                    <Link to="#" className="avatar flex-shrink-0">
                      <ImageWithBasePath
                        src="assets/img/users/user-29.jpg"
                        className="rounded-circle border border-2"
                        alt="img"
                      />
                    </Link>
                    <div className="ms-2">
                      <h6 className="fs-14 fw-medium text-truncate mb-1">
                        Lex Murphy requested access to UNIX{" "}
                      </h6>
                      <p className="fs-13 mb-2">Today at 10:50 AM</p>
                      <div className="d-flex align-items-center">
                        <Link to="#" className="btn btn-primary btn-sm me-2">
                          Approve
                        </Link>
                        <Link to="#" className="btn btn-outline-primary btn-sm">
                          Decline
                        </Link>
                      </div>
                    </div>
                  </div>
                  <div className="d-flex align-items-start">
                    <Link to="#" className="avatar flex-shrink-0">
                      <ImageWithBasePath
                        src="assets/img/users/user-33.jpg"
                        className="rounded-circle border border-2"
                        alt="img"
                      />
                    </Link>
                    <div className="ms-2">
                      <h6 className="fs-14 fw-medium text-truncate mb-1">
                        Lex Murphy requested access to UNIX{" "}
                      </h6>
                      <p className="fs-13 mb-0">Today at 05:00 PM</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-xl-5 d-flex">
              <div className="card flex-fill">
                <div className="card-header">
                  <div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2">
                    <h5>Top Countries</h5>
                    <div className="dropdown">
                      <Link
                        to="#"
                        className="btn btn-white border-0 dropdown-toggle btn-sm d-inline-flex align-items-center"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                      >
                        {topCountriesFilter === 'thisMonth'
                          ? 'This Month'
                          : topCountriesFilter === 'thisWeek'
                          ? 'This Week'
                          : 'Last Week'}
                      </Link>
                      <ul className="dropdown-menu dropdown-menu-end p-3">
                        <li>
                          <Link to="#" className="dropdown-item rounded-1" onClick={() => handleTopCountriesFilterChange('thisMonth')}>
                            This Month
                          </Link>
                        </li>
                        <li>
                          <Link to="#" className="dropdown-item rounded-1" onClick={() => handleTopCountriesFilterChange('thisWeek')}>
                            This Week
                          </Link>
                        </li>
                        <li>
                          <Link to="#" className="dropdown-item rounded-1" onClick={() => handleTopCountriesFilterChange('lastWeek')}>
                            Last Week
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  <div className="row align-items-center">
                    <div className="col-xxl-5 col-sm-6">
                      <div className="pe-3 border-end">
                        {dashboardData?.topCountries && dashboardData.topCountries.length > 0 ? (
                          (() => {
                            // Check if we have "No Data" indicator
                            const hasNoData = dashboardData.topCountries.some((country: any) => country.name === "No Data");
                            
                            if (hasNoData) {
                              return (
                                <div className="text-center py-4">
                                  <p className="text-muted mb-0">No Data Available</p>
                                  <p className="text-muted mb-0">No leads found for the selected time period</p>
                          </div>
                              );
                            }
                            
                            return dashboardData.topCountries.map((country: any, idx: number) => {
                              const colors = ['text-primary', 'text-secondary', 'text-info', 'text-danger', 'text-warning'];
                              const colorClass = colors[idx % colors.length];
                              const countryFlag = getCountryFlag(country.name);
                              
                              return (
                                <div key={idx} className="d-flex align-items-center mb-4">
                          <span className="me-2">
                                  <i className={`ti ti-point-filled ${colorClass} fs-16`} />
                          </span>
                          <Link
                            to="countries.html"
                                  className="avatar rounded-circle flex-shrink-0 border border-2 d-flex align-items-center justify-content-center"
                                  style={{ width: '40px', height: '40px', fontSize: '20px' }}
                                >
                                  {countryFlag}
                          </Link>
                          <div className="ms-2">
                            <h6 className="fw-medium text-truncate mb-1">
                                    <Link to="countries.html">{country.name || 'Unknown Country'}</Link>
                            </h6>
                                  <span className="fs-13 text-truncate">Leads : {country.leads || 0}</span>
                          </div>
                        </div>
                              );
                            });
                          })()
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-muted mb-0">No Data Available</p>
                            <p className="text-muted mb-0">No leads found for the selected time period</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="col-xxl-7 col-sm-6">
                      {donutchart3.series && 
                       donutchart3.labels && 
                       Array.isArray(donutchart3.series) && 
                       Array.isArray(donutchart3.labels) &&
                       donutchart3.series.length > 0 && 
                       donutchart3.labels.length > 0 &&
                       donutchart3.series.every((val: any) => typeof val === 'number') ? (
                      <ReactApexChart
                        id="donut-chart-3"
                          key={`donut-chart-3-${Date.now()}`}
                        options={donutchart3}
                        series={donutchart3.series}
                        type="donut"
                        height={167}
                      />
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-muted mb-0">No Data Available</p>
                          <p className="text-muted mb-0">No leads found for the selected time period</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-7 d-flex">
              <div className="card flex-fill">
                <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-2">
                  <h5>Recent Leads</h5>
                  <div className="d-flex align-items-center">
                    <div>
                      <Link to="leads.html" className="btn btn-sm btn-light px-3">
                        View All
                      </Link>
                    </div>
                  </div>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-nowrap dashboard-table mb-0">
                      <thead>
                        <tr>
                          <th>Lead Name</th>
                          <th>Company Name</th>
                          <th>Stage</th>
                          <th>Created Date</th>
                          <th>Lead Owner</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardData?.recentLeads && dashboardData.recentLeads.length > 0 ? (
                          dashboardData.recentLeads.map((lead: any, index: number) => {
                            // Format the date
                            const createdDate = lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('en-GB') : 'N/A';
                            
                            // Get badge class based on stage
                            const getBadgeClass = (stage: string) => {
                              switch (stage?.toLowerCase()) {
                                case 'closed':
                                  return 'badge-success';
                                case 'contacted':
                                  return 'badge-secondary';
                                case 'lost':
                                  return 'badge-danger';
                                case 'opportunity':
                                  return 'badge-warning';
                                case 'not contacted':
                                  return 'badge-purple';
                                default:
                                  return 'badge-secondary';
                              }
                            };
                            
                            return (
                              <tr key={index}>
                          <td>
                            <h6 className="fw-medium">
                                    <Link to="leads-details.html">{lead.name || 'Unknown Lead'}</Link>
                            </h6>
                          </td>
                          <td>
                            <div className="d-flex align-items-center file-name-icon">
                              <Link
                                to="company-details.html"
                                className="avatar border rounded-circle"
                              >
                                <ImageWithBasePath
                                        src={`assets/img/company/company-${String(index + 1).padStart(2, '0')}.svg`}
                                  className="img-fluid"
                                  alt="img"
                                />
                              </Link>
                              <div className="ms-2">
                                <h6 className="fw-medium">
                                  <Link to="company-details.html">
                                          {lead.company || 'Unknown Company'}
                                  </Link>
                                </h6>
                              </div>
                            </div>
                          </td>
                          <td>
                                  <span className={`badge ${getBadgeClass(lead.stage)} d-inline-flex align-items-center`}>
                              <i className="ti ti-point-filled me-1" />
                                    {lead.stage || 'Not Contacted'}
                            </span>
                          </td>
                                <td>{createdDate}</td>
                                <td>{lead.owner || 'Unknown'}</td>
                        </tr>
                            );
                          })
                        ) : (
                          dataReceived ? (
                            <tr>
                              <td colSpan={5} className="text-center py-4">
                                <div className="text-muted">No Recent Leads Available</div>
                              </td>
                            </tr>
                          ) : (
                            <tr>
                              <td colSpan={5} className="text-center py-4">
                                <div className="d-flex align-items-center justify-content-center">
                                  <div className="text-center">
                                    <div className="spinner-border text-primary" role="status">
                                      <span className="visually-hidden">Loading...</span>
                                    </div>
                                    <p className="mt-2 text-muted">Loading Recent Leads...</p>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
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

  );
};

export default LeadsDasboard;
