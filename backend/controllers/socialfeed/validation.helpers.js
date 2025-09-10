// Validation helpers for social feed data
export const validatePostData = (data) => {
  const errors = [];

  if (!data.content || !data.content.trim()) {
    errors.push('Post content is required');
  }

  if (data.content && data.content.trim().length > 10000) {
    errors.push('Post content is too long (max 10000 characters)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateCommentData = (data) => {
  const errors = [];

  if (!data.content || !data.content.trim()) {
    errors.push('Comment content is required');
  }

  if (data.content && data.content.trim().length > 2000) {
    errors.push('Comment is too long (max 2000 characters)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateReplyData = (data) => {
  const errors = [];

  if (!data.content || !data.content.trim()) {
    errors.push('Reply content is required');
  }

  if (data.content && data.content.trim().length > 1000) {
    errors.push('Reply is too long (max 1000 characters)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validatePostId = (postId) => {
  if (!postId) {
    return { isValid: false, error: 'Post ID is required' };
  }

  if (typeof postId !== 'string' || postId.trim().length === 0) {
    return { isValid: false, error: 'Invalid Post ID format' };
  }

  return { isValid: true };
};

export const validateCommentId = (commentId) => {
  if (!commentId) {
    return { isValid: false, error: 'Comment ID is required' };
  }

  if (typeof commentId !== 'string' || commentId.trim().length === 0) {
    return { isValid: false, error: 'Invalid Comment ID format' };
  }

  return { isValid: true };
};

export const validateUserId = (userId) => {
  if (!userId) {
    return { isValid: false, error: 'User ID is required' };
  }

  if (typeof userId !== 'string' || userId.trim().length === 0) {
    return { isValid: false, error: 'Invalid User ID format' };
  }

  return { isValid: true };
};

export const validatePagination = (query) => {
  const errors = [];
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 20;

  if (page < 1) {
    errors.push('Page must be greater than 0');
  }

  if (limit < 1 || limit > 100) {
    errors.push('Limit must be between 1 and 100');
  }

  return {
    isValid: errors.length === 0,
    errors,
    page,
    limit
  };
};
