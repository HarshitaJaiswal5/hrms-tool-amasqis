// Validation middleware for social feed endpoints
export const validateCompanyAccess = (req, res, next) => {
  try {
    const { companyId } = req.user.publicMetadata || {};

    if (!companyId) {
      console.warn(`Company ID not found for user ${req.user?.sub}`);
      return res.status(400).json({
        done: false,
        error: 'Company ID not found in user metadata'
      });
    }

    req.companyId = companyId;
    next();
  } catch (error) {
    console.error('Error in validateCompanyAccess:', error);
    res.status(500).json({
      done: false,
      error: 'Internal server error'
    });
  }
};

export const validateSocketAuth = (socket) => {
  if (!socket.userId) {
    console.error(`Socket ${socket.id} missing userId`);
    socket.emit('socialfeed:error', {
      done: false,
      error: 'Authentication required'
    });
    return false;
  }

  if (!socket.authenticated) {
    console.error(`Socket ${socket.id} not authenticated`);
    socket.emit('socialfeed:error', {
      done: false,
      error: 'Authentication required'
    });
    return false;
  }

  if (!socket.companyId) {
    console.error(`Socket ${socket.id} missing companyId`);
    socket.emit('socialfeed:error', {
      done: false,
      error: 'Company ID required for social feed'
    });
    return false;
  }

  return true;
};
