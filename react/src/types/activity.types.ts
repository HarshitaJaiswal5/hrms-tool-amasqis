// Activity-related TypeScript interfaces and types

export interface Activity {
  _id: string;
  title: string;
  activityType: 'Meeting' | 'Calls' | 'Tasks' | 'Email';
  dueDate: string;
  owner: string;
  description: string;
  status: 'pending' | 'completed' | 'overdue';
  createdAt: string;
  updatedAt: string;
  reminder?: string;
  reminderType?: string;
  guests?: string;
  companyId: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface ActivityFilters {
  activityType?: string | string[];
  owner?: string | string[];
  startDate?: string;
  endDate?: string;
  status?: string;
}

export interface ActivityStats {
  total: number;
  pending: number;
  completed: number;
  overdue: number;
  typeDistribution: Array<{
    _id: string;
    count: number;
  }>;
}

export interface ActivityFormData {
  title: string;
  activityType: string;
  dueDate: any; // dayjs object
  dueTime: string;
  reminder: string;
  reminderType: string;
  owner: string;
  guests: string;
  description: string;
}

// Socket.IO Event Types
export interface ActivityCreateRequest {
  title: string;
  activityType: string;
  dueDate: string;
  owner: string;
  description: string;
  reminder?: string;
  reminderType?: string;
  guests?: string;
}

export interface ActivityUpdateRequest {
  activityId: string;
  update: Partial<ActivityCreateRequest>;
}

export interface ActivityDeleteRequest {
  activityId: string;
}

export interface ActivityResponse {
  done: boolean;
  data?: Activity | Activity[] | ActivityStats | string[];
  error?: string;
}

export interface ActivityExportResponse {
  done: boolean;
  data?: {
    pdfUrl?: string;
    excelUrl?: string;
    pdfPath?: string;
    excelPath?: string;
  };
  error?: string;
}

// Socket.IO Event Names
export const ACTIVITY_SOCKET_EVENTS = {
  // Client to Server
  CREATE: 'activity:create',
  GET_ALL: 'activity:getAll',
  GET_BY_ID: 'activity:getById',
  UPDATE: 'activity:update',
  DELETE: 'activity:delete',
  GET_STATS: 'activity:getStats',
  GET_OWNERS: 'activity:getOwners',
  GET_ALL_DATA: 'activity:getAllData',
  EXPORT_PDF: 'activity/export-pdf',
  EXPORT_EXCEL: 'activity/export-excel',
  
  // Server to Client (Responses)
  CREATE_RESPONSE: 'activity:create-response',
  GET_ALL_RESPONSE: 'activity:getAll-response',
  GET_BY_ID_RESPONSE: 'activity:getById-response',
  UPDATE_RESPONSE: 'activity:update-response',
  DELETE_RESPONSE: 'activity:delete-response',
  GET_STATS_RESPONSE: 'activity:getStats-response',
  GET_OWNERS_RESPONSE: 'activity:getOwners-response',
  GET_ALL_DATA_RESPONSE: 'activity:getAllData-response',
  EXPORT_PDF_RESPONSE: 'activity/export-pdf-response',
  EXPORT_EXCEL_RESPONSE: 'activity/export-excel-response',
  
  // Real-time Broadcast Events
  ACTIVITY_CREATED: 'activity:activity-created',
  ACTIVITY_UPDATED: 'activity:activity-updated',
  ACTIVITY_DELETED: 'activity:activity-deleted',
} as const;

// Activity Type Options
export const ACTIVITY_TYPES = [
  'Meeting',
  'Calls', 
  'Tasks',
  'Email'
] as const;

export type ActivityType = typeof ACTIVITY_TYPES[number];

// Status Options
export const ACTIVITY_STATUSES = [
  'pending',
  'completed', 
  'overdue'
] as const;

export type ActivityStatus = typeof ACTIVITY_STATUSES[number];

// Sort Options
export const SORT_OPTIONS = [
  'recent',
  'asc',
  'desc',
  'last7days',
  'lastmonth'
] as const;

export type SortOption = typeof SORT_OPTIONS[number]; 