import { SocialFeedService } from '../../services/socialfeed/socialFeed.services.js';
import { clerkClient, verifyToken } from '@clerk/express';
import dotenv from 'dotenv';
import { createHttpErrorResponse, createHttpSuccessResponse } from './response.helpers.js';
import { validatePostData, validateCommentData, validateReplyData, validatePostId, validateCommentId, validatePagination } from './validation.helpers.js';

dotenv.config();

export const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        done: false,
        error: 'No authorization token provided'
      });
    }

    const token = authHeader.substring(7);
    const verifiedToken = await verifyToken(token, {
      jwtKey: process.env.CLERK_JWT_KEY,
      authorizedParties: process.env.CLERK_AUTHORIZED_PARTIES?.split(',') || []
    });

    if (!verifiedToken) {
      return res.status(401).json({
        done: false,
        error: 'Invalid token'
      });
    }

    const user = await clerkClient.users.getUser(verifiedToken.sub);

    if (!user) {
      return res.status(401).json({
        done: false,
        error: 'User not found'
      });
    }

    const isDevelopment = process.env.NODE_ENV === "development" || process.env.NODE_ENV !== "production";

    let userMetadata = { ...user.publicMetadata };
    if (isDevelopment && !userMetadata.companyId) {
      userMetadata.companyId = "dev_company_123";
      console.log(`[Development] Setting default companyId for user ${user.id}`);
    }

    req.user = {
      sub: user.id,
      publicMetadata: userMetadata
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      done: false,
      error: 'Authentication failed'
    });
  }
};

export const socialFeedController = {
  getAllPosts: async (req, res) => {
    try {
      const { companyId } = req.user.publicMetadata || {};
      const { page = 1, limit = 20 } = req.query;

      if (!companyId) {
        return res.status(400).json({
          done: false,
          error: 'Company ID not found in user metadata'
        });
      }

      const result = await SocialFeedService.getAllPosts(companyId, parseInt(page), parseInt(limit));

      res.json({
        done: true,
        data: result.posts,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error fetching social feed posts:', error);
      res.status(500).json({
        done: false,
        error: error.message || 'Failed to fetch social feed posts'
      });
    }
  },

  getPostsByUser: async (req, res) => {
    try {
      const { companyId } = req.user.publicMetadata || {};
      const { userId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      if (!userId) {
        return res.status(400).json({
          done: false,
          error: 'User ID is required'
        });
      }

      if (!companyId) {
        return res.status(400).json({
          done: false,
          error: 'Company ID not found in user metadata'
        });
      }

      const result = await SocialFeedService.getPostsByUser(companyId, userId, parseInt(page), parseInt(limit));

      res.json({
        done: true,
        data: result.posts,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error fetching user posts:', error);
      res.status(500).json({
        done: false,
        error: error.message || 'Failed to fetch user posts'
      });
    }
  },

  createPost: async (req, res) => {
    try {
      const validation = validatePostData(req.body);
      if (!validation.isValid) {
        return createHttpErrorResponse(res, 400, validation.errors[0]);
      }

      const postData = {
        userId: req.user.sub,
        companyId: req.companyId,
        content: req.body.content.trim(),
        images: req.body.images || [],
        tags: req.body.tags || [],
        location: req.body.location || null,
        isPublic: req.body.isPublic ?? true
      };

      const newPost = await SocialFeedService.createPost(req.companyId, postData);
      return createHttpSuccessResponse(res, newPost, 'Post created successfully', 201);
    } catch (error) {
      console.error('Error creating post:', error);
      return createHttpErrorResponse(res, 500, error.message || 'Failed to create post');
    }
  },

  updatePost: async (req, res) => {
    try {
      const postIdValidation = validatePostId(req.params.postId);
      if (!postIdValidation.isValid) {
        return createHttpErrorResponse(res, 400, postIdValidation.error);
      }

      const validation = validatePostData(req.body);
      if (!validation.isValid) {
        return createHttpErrorResponse(res, 400, validation.errors[0]);
      }

      const updateData = {
        content: req.body.content.trim(),
        images: req.body.images || [],
        tags: req.body.tags || [],
        location: req.body.location || null,
        isPublic: req.body.isPublic,
        updatedAt: new Date()
      };

      const updatedPost = await SocialFeedService.updatePost(req.companyId, req.params.postId, req.user.sub, updateData);
      return createHttpSuccessResponse(res, updatedPost, 'Post updated successfully');
    } catch (error) {
      console.error('Error updating post:', error);
      return createHttpErrorResponse(res, 500, error.message || 'Failed to update post');
    }
  },

  deletePost: async (req, res) => {
    try {
      const postIdValidation = validatePostId(req.params.postId);
      if (!postIdValidation.isValid) {
        return createHttpErrorResponse(res, 400, postIdValidation.error);
      }

      const result = await SocialFeedService.deletePost(req.companyId, req.params.postId, req.user.sub);
      return createHttpSuccessResponse(res, null, result.message);
    } catch (error) {
      console.error('Error deleting post:', error);
      return createHttpErrorResponse(res, 500, error.message || 'Failed to delete post');
    }
  },

  toggleLike: async (req, res) => {
    try {
      const postIdValidation = validatePostId(req.params.postId);
      if (!postIdValidation.isValid) {
        return createHttpErrorResponse(res, 400, postIdValidation.error);
      }

      const updatedPost = await SocialFeedService.toggleLike(req.companyId, req.params.postId, req.user.sub);
      return createHttpSuccessResponse(res, updatedPost, 'Like updated successfully');
    } catch (error) {
      console.error('Error toggling like:', error);
      return createHttpErrorResponse(res, 500, error.message || 'Failed to toggle like');
    }
  },

  addComment: async (req, res) => {
    try {
      const postIdValidation = validatePostId(req.params.postId);
      if (!postIdValidation.isValid) {
        return createHttpErrorResponse(res, 400, postIdValidation.error);
      }

      const validation = validateCommentData(req.body);
      if (!validation.isValid) {
        return createHttpErrorResponse(res, 400, validation.errors[0]);
      }

      const updatedPost = await SocialFeedService.addComment(req.companyId, req.params.postId, req.user.sub, req.body.content.trim());
      return createHttpSuccessResponse(res, updatedPost, 'Comment added successfully');
    } catch (error) {
      console.error('Error adding comment:', error);
      return createHttpErrorResponse(res, 500, error.message || 'Failed to add comment');
    }
  },

  deleteComment: async (req, res) => {
    try {
      const postIdValidation = validatePostId(req.params.postId);
      if (!postIdValidation.isValid) {
        return createHttpErrorResponse(res, 400, postIdValidation.error);
      }

      const commentIdValidation = validateCommentId(req.params.commentId);
      if (!commentIdValidation.isValid) {
        return createHttpErrorResponse(res, 400, commentIdValidation.error);
      }

      const result = await SocialFeedService.deleteComment(req.companyId, req.params.postId, req.params.commentId, req.user.sub);
      return createHttpSuccessResponse(res, null, result.message);
    } catch (error) {
      console.error('Error deleting comment:', error);
      return createHttpErrorResponse(res, 500, error.message || 'Failed to delete comment');
    }
  },

  toggleBookmark: async (req, res) => {
    try {
      const postIdValidation = validatePostId(req.params.postId);
      if (!postIdValidation.isValid) {
        return createHttpErrorResponse(res, 400, postIdValidation.error);
      }

      const result = await SocialFeedService.toggleBookmark(req.companyId, req.params.postId, req.user.sub);
      return createHttpSuccessResponse(res, null, result.message);
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      return createHttpErrorResponse(res, 500, error.message || 'Failed to toggle bookmark');
    }
  },

  getTrendingHashtags: async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      if (limit < 1 || limit > 50) {
        return createHttpErrorResponse(res, 400, 'Limit must be between 1 and 50');
      }

      const hashtags = await SocialFeedService.getTrendingHashtags(req.companyId, limit);
      return createHttpSuccessResponse(res, hashtags);
    } catch (error) {
      console.error('Error fetching trending hashtags:', error);
      return createHttpErrorResponse(res, 500, error.message || 'Failed to fetch trending hashtags');
    }
  },

  getBookmarkedPosts: async (req, res) => {
    try {
      const pagination = validatePagination(req.query);
      if (!pagination.isValid) {
        return createHttpErrorResponse(res, 400, pagination.errors[0]);
      }

      const result = await SocialFeedService.getBookmarkedPosts(req.companyId, req.user.sub, pagination.page, pagination.limit);
      return createHttpSuccessResponse(res, {
        posts: result.posts,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error fetching bookmarked posts:', error);
      return createHttpErrorResponse(res, 500, error.message || 'Failed to fetch bookmarked posts');
    }
  },

  toggleSavePost: async (req, res) => {
    try {
      const postIdValidation = validatePostId(req.params.postId);
      if (!postIdValidation.isValid) {
        return createHttpErrorResponse(res, 400, postIdValidation.error);
      }

      const updatedPost = await SocialFeedService.toggleSavePost(req.companyId, req.params.postId, req.user.sub);
      return createHttpSuccessResponse(res, updatedPost, 'Post save status updated successfully');
    } catch (error) {
      console.error('Error toggling save post:', error);
      return createHttpErrorResponse(res, 500, error.message || 'Failed to toggle save post');
    }
  },

  getSavedPosts: async (req, res) => {
    try {
      const pagination = validatePagination(req.query);
      if (!pagination.isValid) {
        return createHttpErrorResponse(res, 400, pagination.errors[0]);
      }

      const savedPosts = await SocialFeedService.getSavedPosts(req.companyId, req.user.sub, pagination.page, pagination.limit);
      return createHttpSuccessResponse(res, {
        posts: savedPosts,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: savedPosts.length
        }
      });
    } catch (error) {
      console.error('Error fetching saved posts:', error);
      return createHttpErrorResponse(res, 500, error.message || 'Failed to fetch saved posts');
    }
  },

  getTrendingHashtags: async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const trendingHashtags = await SocialFeedService.getTrendingHashtags(req.companyId, limit);
      return createHttpSuccessResponse(res, trendingHashtags);
    } catch (error) {
      console.error('Error fetching trending hashtags:', error);
      return createHttpErrorResponse(res, 500, error.message || 'Failed to fetch trending hashtags');
    }
  },

  getSuggestedUsers: async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const suggestedUsers = await SocialFeedService.getSuggestedUsers(req.companyId, req.user.sub, limit);
      return createHttpSuccessResponse(res, suggestedUsers);
    } catch (error) {
      console.error('Error fetching suggested users:', error);
      return createHttpErrorResponse(res, 500, error.message || 'Failed to fetch suggested users');
    }
  },

  followUser: async (req, res) => {
    try {
      const { userId } = req.params;
      const result = await SocialFeedService.followUser(req.companyId, req.user.sub, userId);
      return createHttpSuccessResponse(res, result);
    } catch (error) {
      console.error('Error following user:', error);
      return createHttpErrorResponse(res, 400, error.message || 'Failed to follow user');
    }
  },

  unfollowUser: async (req, res) => {
    try {
      const { userId } = req.params;
      const result = await SocialFeedService.unfollowUser(req.companyId, req.user.sub, userId);
      return createHttpSuccessResponse(res, result);
    } catch (error) {
      console.error('Error unfollowing user:', error);
      return createHttpErrorResponse(res, 400, error.message || 'Failed to unfollow user');
    }
  },

  getFollowers: async (req, res) => {
    try {
      const pagination = validatePagination(req.query);
      if (!pagination.isValid) {
        return createHttpErrorResponse(res, 400, pagination.errors[0]);
      }

      const followers = await SocialFeedService.getFollowers(req.companyId, req.params.userId || req.user.sub, pagination.page, pagination.limit);
      return createHttpSuccessResponse(res, {
        followers,
        pagination: {
          page: pagination.page,
          limit: pagination.limit
        }
      });
    } catch (error) {
      console.error('Error fetching followers:', error);
      return createHttpErrorResponse(res, 500, error.message || 'Failed to fetch followers');
    }
  },

  getFollowing: async (req, res) => {
    try {
      const pagination = validatePagination(req.query);
      if (!pagination.isValid) {
        return createHttpErrorResponse(res, 400, pagination.errors[0]);
      }

      const following = await SocialFeedService.getFollowing(req.companyId, req.params.userId || req.user.sub, pagination.page, pagination.limit);
      return createHttpSuccessResponse(res, {
        following,
        pagination: {
          page: pagination.page,
          limit: pagination.limit
        }
      });
    } catch (error) {
      console.error('Error fetching following:', error);
      return createHttpErrorResponse(res, 500, error.message || 'Failed to fetch following');
    }
  },

  getAllFeeds: async (req, res) => {
    try {
      const pagination = validatePagination(req.query);
      if (!pagination.isValid) {
        return createHttpErrorResponse(res, 400, pagination.errors[0]);
      }

      const feeds = await SocialFeedService.getAllFeeds(req.companyId, pagination.page, pagination.limit);
      return createHttpSuccessResponse(res, {
        posts: feeds,
        pagination: {
          page: pagination.page,
          limit: pagination.limit
        }
      });
    } catch (error) {
      console.error('Error fetching all feeds:', error);
      return createHttpErrorResponse(res, 500, error.message || 'Failed to fetch feeds');
    }
  },

  getUserFeeds: async (req, res) => {
    try {
      const pagination = validatePagination(req.query);
      if (!pagination.isValid) {
        return createHttpErrorResponse(res, 400, pagination.errors[0]);
      }

      const feeds = await SocialFeedService.getUserFeeds(req.companyId, req.params.userId, pagination.page, pagination.limit);
      return createHttpSuccessResponse(res, {
        posts: feeds,
        pagination: {
          page: pagination.page,
          limit: pagination.limit
        }
      });
    } catch (error) {
      console.error('Error fetching user feeds:', error);
      return createHttpErrorResponse(res, 500, error.message || 'Failed to fetch user feeds');
    }
  },

  getFiles: async (req, res) => {
    try {
      const pagination = validatePagination(req.query);
      if (!pagination.isValid) {
        return createHttpErrorResponse(res, 400, pagination.errors[0]);
      }

      const files = await SocialFeedService.getFilesFromPosts(req.companyId, pagination.page, pagination.limit);
      return createHttpSuccessResponse(res, {
        posts: files,
        pagination: {
          page: pagination.page,
          limit: pagination.limit
        }
      });
    } catch (error) {
      console.error('Error fetching files:', error);
      return createHttpErrorResponse(res, 500, error.message || 'Failed to fetch files');
    }
  },

  searchPosts: async (req, res) => {
    try {
      if (!req.query.query || !req.query.query.trim()) {
        return createHttpErrorResponse(res, 400, 'Search query is required');
      }

      const pagination = validatePagination(req.query);
      if (!pagination.isValid) {
        return createHttpErrorResponse(res, 400, pagination.errors[0]);
      }

      const result = await SocialFeedService.searchPosts(req.companyId, req.query.query.trim(), pagination.page, pagination.limit);
      return createHttpSuccessResponse(res, {
        posts: result.posts,
        pagination: result.pagination,
        query: req.query.query.trim()
      });
    } catch (error) {
      console.error('Error searching posts:', error);
      return createHttpErrorResponse(res, 500, error.message || 'Failed to search posts');
    }
  },

  addReply: async (req, res) => {
    try { 
      const postIdValidation = validatePostId(req.params.postId);
      if (!postIdValidation.isValid) {
        return createHttpErrorResponse(res, 400, postIdValidation.error);
      }

      const commentIdValidation = validateCommentId(req.params.commentId);
      if (!commentIdValidation.isValid) {
        return createHttpErrorResponse(res, 400, commentIdValidation.error);
      }

      const validation = validateReplyData(req.body);
      if (!validation.isValid) {
        return createHttpErrorResponse(res, 400, validation.errors[0]);
      }

      const updatedPost = await SocialFeedService.addReply(req.companyId, req.params.postId, req.params.commentId, req.user.sub, req.body.content.trim());
      return createHttpSuccessResponse(res, updatedPost, 'Reply added successfully');
    } catch (error) {
      console.error('Error adding reply:', error);
      return createHttpErrorResponse(res, 500, error.message || 'Failed to add reply');
    }
  },

  toggleReplyLike: async (req, res) => {
    try {
      const postIdValidation = validatePostId(req.params.postId);
      if (!postIdValidation.isValid) {
        return createHttpErrorResponse(res, 400, postIdValidation.error);
      }

      const commentIdValidation = validateCommentId(req.params.commentId);
      if (!commentIdValidation.isValid) {
        return createHttpErrorResponse(res, 400, commentIdValidation.error);
      }

      const replyIdValidation = validateCommentId(req.params.replyId);
      if (!replyIdValidation.isValid) {
        return createHttpErrorResponse(res, 400, 'Reply ID is required');
      }

      const updatedPost = await SocialFeedService.toggleReplyLike(req.companyId, req.params.postId, req.params.commentId, req.params.replyId, req.user.sub);
      return createHttpSuccessResponse(res, updatedPost, 'Reply like toggled successfully');
    } catch (error) {
      console.error('Error toggling reply like:', error);
      return createHttpErrorResponse(res, 500, error.message || 'Failed to toggle reply like');
    }
  },

  getCommentReplies: async (req, res) => {
    try {
      const postIdValidation = validatePostId(req.params.postId);
      if (!postIdValidation.isValid) {
        return createHttpErrorResponse(res, 400, postIdValidation.error);
      }

      const commentIdValidation = validateCommentId(req.params.commentId);
      if (!commentIdValidation.isValid) {
        return createHttpErrorResponse(res, 400, commentIdValidation.error);
      }

      const pagination = validatePagination(req.query);
      if (!pagination.isValid) {
        return createHttpErrorResponse(res, 400, pagination.errors[0]);
      }

      const result = await SocialFeedService.getCommentReplies(
        req.companyId,
        req.params.postId,
        req.params.commentId,
        pagination.page,
        pagination.limit
      );

      return createHttpSuccessResponse(res, {
        replies: result.replies,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error getting comment replies:', error);
      return createHttpErrorResponse(res, 500, error.message || 'Failed to get comment replies');
    }
  },

  getUserProfile: async (req, res) => {
    try {
      const userId = req.params.userId || req.user.sub;

      const userProfile = await SocialFeedService.getUserProfile(req.companyId, userId);
      return createHttpSuccessResponse(res, userProfile);
    } catch (error) {
      console.error('Error getting user profile:', error);
      return createHttpErrorResponse(res, 500, error.message || 'Failed to get user profile');
    }
  },

  getTotalPostsCount: async (req, res) => {
    try {
      const totalPosts = await SocialFeedService.getTotalPostsCount(req.companyId);
      return createHttpSuccessResponse(res, { totalPosts });
    } catch (error) {
      console.error('Error getting total posts count:', error);
      return createHttpErrorResponse(res, 500, error.message || 'Failed to get total posts count');
    }
  },

  getTotalBookmarksCount: async (req, res) => {
    try {
      const totalBookmarks = await SocialFeedService.getTotalBookmarksCount(req.companyId);
      return createHttpSuccessResponse(res, { totalBookmarks });
    } catch (error) {
      console.error('Error getting total bookmarks count:', error);
      return createHttpErrorResponse(res, 500, error.message || 'Failed to get total bookmarks count');
    }
  },

  getCompanyEmployees: async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const employees = await SocialFeedService.getEmployeesWithPostCounts(req.companyId, limit);
      return createHttpSuccessResponse(res, employees);
    } catch (error) {
      console.error('Error getting company employees:', error);
      return createHttpErrorResponse(res, 500, error.message || 'Failed to get company employees');
    }
  },

  getTopPosters: async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 8;
      const finalLimit = Math.min(limit, 8);
      const topPosters = await SocialFeedService.getTopPosters(req.companyId, finalLimit);
      return createHttpSuccessResponse(res, topPosters);
    } catch (error) {
      console.error('Error getting top posters:', error);
      return createHttpErrorResponse(res, 500, error.message || 'Failed to get top posters');
    }
  },

  editPost: async (req, res) => {
    try {
      const { postId } = req.params;
      const updateData = req.body;

      validatePostId(postId);

      const updatedPost = await SocialFeedService.editPost(req.companyId, postId, req.user.sub, updateData);
      return createHttpSuccessResponse(res, updatedPost);
    } catch (error) {
      console.error('Error editing post:', error);
      return createHttpErrorResponse(res, 500, error.message || 'Failed to edit post');
    }
  },

  getTrendingHashtags: async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const finalLimit = Math.min(limit, 20); // Max 20 hashtags
      const includeAll = req.query.includeAll !== 'false';
      const trendingHashtags = await SocialFeedService.getTrendingHashtags(req.companyId, finalLimit, includeAll);
      return createHttpSuccessResponse(res, trendingHashtags);
    } catch (error) {
      console.error('Error getting trending hashtags:', error);
      return createHttpErrorResponse(res, 500, error.message || 'Failed to get trending hashtags');
    }
  }
};
