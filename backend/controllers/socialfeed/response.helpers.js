// Response helpers for social feed socket operations
export const createErrorResponse = (socket, event, error) => {
  const errorMessage = typeof error === 'string' ? error : error.message || 'An error occurred';
  console.error(`[${event}] Error for socket ${socket.id}:`, errorMessage);

  socket.emit(`${event}-response`, {
    done: false,
    error: errorMessage
  });
};

export const createSuccessResponse = (socket, event, data, message = 'Operation successful') => {
  console.log(`[${event}] Success for socket ${socket.id}:`, message);

  socket.emit(`${event}-response`, {
    done: true,
    data,
    message
  });
};

export const broadcastToCompany = (io, companyId, event, data, message = 'Update broadcasted') => {
  console.log(`Broadcasting ${event} to company ${companyId}:`, message);

  io.to(`socialfeed:${companyId}`).emit(event, {
    done: true,
    data,
    message
  });
};

export const createHttpErrorResponse = (res, statusCode = 400, error) => {
  const errorMessage = typeof error === 'string' ? error : error.message || 'An error occurred';
  console.error(`HTTP Error ${statusCode}:`, errorMessage);

  return res.status(statusCode).json({
    done: false,
    error: errorMessage
  });
};

export const createHttpSuccessResponse = (res, data, message = 'Operation successful', statusCode = 200) => {
  console.log(`HTTP Success ${statusCode}:`, message);

  return res.status(statusCode).json({
    done: true,
    data,
    message
  });
};
