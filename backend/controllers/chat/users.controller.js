import { clerkClient } from '@clerk/express';

export class ChatUsersController {
  constructor(socket, io) {
    this.socket = socket;
    this.io = io;
    this.companyId = socket.companyId;
    this.userId = socket.user.sub;
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // Get company users for chat
    this.socket.on('get_company_users', this.getCompanyUsers.bind(this));
  }

  async getCompanyUsers(data) {
    try {
      if (!this.socket.checkRateLimit()) {
        this.socket.emit('error', { message: 'Rate limit exceeded' });
        return;
      }

      const { limit = 50, skip = 0, searchTerm = '' } = data;

      // Get all users in the company from Clerk
      const userList = await clerkClient.users.getUserList({
        limit: limit + 10, // Get a few extra to account for filtering
        offset: skip
      });

      // Filter users by company ID and exclude current user
      const companyUsers = userList.data
        .filter(user => {
          const userCompanyId = user.publicMetadata?.companyId;
          const hasValidRole = user.publicMetadata?.role && 
                             ['admin', 'hr', 'employee'].includes(user.publicMetadata.role);
          
          return userCompanyId === this.companyId && 
                 user.id !== this.userId && 
                 hasValidRole;
        })
        .filter(user => {
          if (!searchTerm) return true;
          
          const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
          const email = user.emailAddresses[0]?.emailAddress || '';
          
          return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 email.toLowerCase().includes(searchTerm.toLowerCase());
        })
        .slice(0, limit) // Limit to requested number
        .map(user => ({
          userId: user.id,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 
                user.emailAddresses[0]?.emailAddress,
          avatar: user.imageUrl,
          role: user.publicMetadata?.role || 'employee',
          email: user.emailAddresses[0]?.emailAddress,
          isOnline: false, // Will be updated by socket presence
          lastSeen: new Date()
        }));

      this.socket.emit('company_users_list', {
        users: companyUsers,
        hasMore: companyUsers.length === limit
      });

    } catch (error) {
      console.error('Error in getCompanyUsers:', error);
      this.socket.emit('error', { message: 'Failed to get company users' });
    }
  }
}

export default ChatUsersController;

