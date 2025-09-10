import leadServices from '../../services/lead/lead.services.js';

const leadController = (socket, io) => {
  const validateAccess = (socket) => {
    if (!socket.user) {
      throw new Error('Unauthorized: No user found');
    }
    if (!socket.companyId) {
      throw new Error('Unauthorized: Company ID missing');
    }
    // Ensure the user belongs to the same company
    if (socket.userMetadata?.companyId !== socket.companyId) {
      throw new Error('Unauthorized: Company ID mismatch');
    }
    // Allow specific roles to access leads dashboard
    const allowedRoles = ['admin', 'hr', 'leads'];
    if (!allowedRoles.includes(socket.role)) {
      throw new Error('Forbidden: Insufficient role to access leads dashboard');
    }
    return socket.companyId;
  };

  socket.on('lead/dashboard/get-all-data', async (data = {}) => {
    console.log("[LeadDashboard] Received dashboard request", data);
    console.log("[LeadDashboard] Socket user metadata:", socket.userMetadata);
    console.log("[LeadDashboard] Socket companyId:", socket.companyId);
    try {
      const companyId = validateAccess(socket);
      const filter = data.filter || 'week';
      const dateRange = data.dateRange || null;
      const newLeadsFilter = data.newLeadsFilter || 'week';
      const newLeadsDashboardFilter = data.newLeadsDashboardFilter || 'week';
      const pipelineYear = data.pipelineYear || null;
      const lostLeadsReasonFilter = data.lostLeadsReasonFilter || 'thisMonth';
      const leadsByCompaniesFilter = data.leadsByCompaniesFilter || 'thisMonth';
      const leadsBySourceFilter = data.leadsBySourceFilter || 'thisMonth';
      const topCountriesFilter = data.topCountriesFilter || 'thisMonth';
      console.log(`[LeadDashboard] Fetching for companyId=${companyId}, filter=${filter}, dateRange=`, dateRange, `newLeadsFilter=${newLeadsFilter}, newLeadsDashboardFilter=${newLeadsDashboardFilter}, pipelineYear=${pipelineYear}`);
      
      console.log("[LeadDashboard] Calling leadServices.getDashboardData...");
      const dashboardData = await leadServices.getDashboardData(
        companyId, filter, dateRange, newLeadsFilter, newLeadsDashboardFilter, pipelineYear, lostLeadsReasonFilter, leadsByCompaniesFilter, leadsBySourceFilter, topCountriesFilter
      );
      console.log("[LeadDashboard] Service returned data:", dashboardData);
      
      if (!dashboardData) {
        throw new Error('No dashboard data returned');
      }
      
      console.log("[LeadDashboard] Emitting response to client...");
      socket.emit('lead/dashboard/get-all-data-response', { done: true, data: dashboardData });
      console.log("[LeadDashboard] Response emitted successfully");
    } catch (error) {
      console.error('[LeadDashboard] Controller error:', error);
      socket.emit('lead/dashboard/get-all-data-response', { done: false, error: error.message });
    }
  });
};

export default leadController;

