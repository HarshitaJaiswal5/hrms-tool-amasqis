import { SocialFeedService } from '../../services/socialfeed/socialFeed.services.js';
import { validateSocketAuth } from './validation.middleware.js';
import { broadcastToCompany, createErrorResponse, createSuccessResponse } from './response.helpers.js';
import { validatePostData, validateCommentData, validateReplyData, validatePostId, validateCommentId } from './validation.helpers.js';

const socialFeedSocketController = (socket, io) => {

  if (!validateSocketAuth(socket)) {
    return;
  }

  socket.join(`socialfeed:${socket.companyId}`);
  console.log(`User ${socket.userId} joined social feed room: socialfeed:${socket.companyId}`);

  socket.on("socialfeed:create-post", async (postData) => {
    try {
      const validation = validatePostData(postData);
      if (!validation.isValid) {
        createErrorResponse(socket, "socialfeed:create-post", validation.errors[0]);
        return;
      }

      const newPost = await SocialFeedService.createPost(socket.companyId, {
        userId: socket.userId,
        companyId: socket.companyId,
        content: postData.content.trim(),
        images: postData.images || [],
        tags: postData.tags || [],
        location: postData.location,
        isPublic: postData.isPublic ?? true
      });

      broadcastToCompany(io, socket.companyId, "socialfeed:newPost", newPost, "New post created");
      createSuccessResponse(socket, "socialfeed:create-post", newPost, "Post created successfully");

    } catch (error) {
      console.error("Error creating post:", error);
      createErrorResponse(socket, "socialfeed:create-post", error.message || "Failed to create post");
    }
  });

  socket.on("socialfeed:toggle-like", async (data) => {
    try {
      const postIdValidation = validatePostId(data.postId);
      if (!postIdValidation.isValid) {
        createErrorResponse(socket, "socialfeed:toggle-like", postIdValidation.error);
        return;
      }

      const updatedPost = await SocialFeedService.toggleLike(socket.companyId, data.postId, socket.userId);

      broadcastToCompany(io, socket.companyId, "socialfeed:postUpdate", updatedPost, "Post like updated");
      createSuccessResponse(socket, "socialfeed:toggle-like", updatedPost, "Like updated successfully");

    } catch (error) {
      console.error("Error toggling like:", error);
      createErrorResponse(socket, "socialfeed:toggle-like", error.message || "Failed to toggle like");
    }
  });

  socket.on("socialfeed:add-comment", async (data) => {
    try {
      const postIdValidation = validatePostId(data.postId);
      if (!postIdValidation.isValid) {
        createErrorResponse(socket, "socialfeed:add-comment", postIdValidation.error);
        return;
      }

      const validation = validateCommentData(data);
      if (!validation.isValid) {
        createErrorResponse(socket, "socialfeed:add-comment", validation.errors[0]);
        return;
      }

      const updatedPost = await SocialFeedService.addComment(socket.companyId, data.postId, socket.userId, data.content.trim());

      broadcastToCompany(io, socket.companyId, "socialfeed:postUpdate", updatedPost, "New comment added");
      createSuccessResponse(socket, "socialfeed:add-comment", updatedPost, "Comment added successfully");

    } catch (error) {
      console.error("Error adding comment:", error);
      createErrorResponse(socket, "socialfeed:add-comment", error.message || "Failed to add comment");
    }
  });

  socket.on("socialfeed:delete-post", async (data) => {
    try {
      const postIdValidation = validatePostId(data.postId);
      if (!postIdValidation.isValid) {
        createErrorResponse(socket, "socialfeed:delete-post", postIdValidation.error);
        return;
      }

      const result = await SocialFeedService.deletePost(socket.companyId, data.postId, socket.userId);

      broadcastToCompany(io, socket.companyId, "socialfeed:postDeleted", { postId: data.postId }, "Post deleted");
      createSuccessResponse(socket, "socialfeed:delete-post", result, "Post deleted successfully");

    } catch (error) {
      console.error("Error deleting post:", error);
      createErrorResponse(socket, "socialfeed:delete-post", error.message || "Failed to delete post");
    }
  });

  socket.on("socialfeed:delete-comment", async (data) => {
    try {
      const postIdValidation = validatePostId(data.postId);
      if (!postIdValidation.isValid) {
        createErrorResponse(socket, "socialfeed:delete-comment", postIdValidation.error);
        return;
      }

      const commentIdValidation = validateCommentId(data.commentId);
      if (!commentIdValidation.isValid) {
        createErrorResponse(socket, "socialfeed:delete-comment", commentIdValidation.error);
        return;
      }

      const result = await SocialFeedService.deleteComment(socket.companyId, data.postId, data.commentId, socket.userId);

      broadcastToCompany(io, socket.companyId, "socialfeed:postUpdate", result.updatedPost, "Comment deleted");
      createSuccessResponse(socket, "socialfeed:delete-comment", result, "Comment deleted successfully");

    } catch (error) {
      console.error("Error deleting comment:", error);
      createErrorResponse(socket, "socialfeed:delete-comment", error.message || "Failed to delete comment");
    }
  });

  socket.on("socialfeed:toggle-bookmark", async (data) => {
    try {
      const postIdValidation = validatePostId(data.postId);
      if (!postIdValidation.isValid) {
        createErrorResponse(socket, "socialfeed:toggle-bookmark", postIdValidation.error);
        return;
      }

      const result = await SocialFeedService.toggleBookmark(socket.companyId, data.postId, socket.userId);
      createSuccessResponse(socket, "socialfeed:toggle-bookmark", result, "Bookmark updated successfully");

    } catch (error) {
      console.error("Error toggling bookmark:", error);
      createErrorResponse(socket, "socialfeed:toggle-bookmark", error.message || "Failed to toggle bookmark");
    }
  });

  socket.on("socialfeed:add-reply", async (data) => {
    console.log(`[socialfeed:add-reply] Received data:`, data);

    try {
      const postIdValidation = validatePostId(data.postId);
      if (!postIdValidation.isValid) {
        createErrorResponse(socket, "socialfeed:add-reply", postIdValidation.error);
        return;
      }

      const commentIdValidation = validateCommentId(data.commentId);
      if (!commentIdValidation.isValid) {
        console.error(`[socialfeed:add-reply] Comment ID validation failed:`, {
          commentId: data.commentId,
          validation: commentIdValidation
        });
        createErrorResponse(socket, "socialfeed:add-reply", commentIdValidation.error);
        return;
      }

      const validation = validateReplyData(data);
      if (!validation.isValid) {
        createErrorResponse(socket, "socialfeed:add-reply", validation.errors[0]);
        return;
      }

      const updatedPost = await SocialFeedService.addReply(socket.companyId, data.postId, data.commentId, socket.userId, data.content.trim());

      broadcastToCompany(io, socket.companyId, "socialfeed:postUpdate", updatedPost, "New reply added");
      createSuccessResponse(socket, "socialfeed:add-reply", updatedPost, "Reply added successfully");

    } catch (error) {
      console.error("Error adding reply:", error);
      createErrorResponse(socket, "socialfeed:add-reply", error.message || "Failed to add reply");
    }
  });

  socket.on("socialfeed:toggle-comment-like", async (data) => {
    try {
      const postIdValidation = validatePostId(data.postId);
      if (!postIdValidation.isValid) {
        createErrorResponse(socket, "socialfeed:toggle-comment-like", postIdValidation.error);
        return;
      }

      const commentIdValidation = validateCommentId(data.commentId);
      if (!commentIdValidation.isValid) {
        createErrorResponse(socket, "socialfeed:toggle-comment-like", commentIdValidation.error);
        return;
      }

      const updatedPost = await SocialFeedService.toggleCommentLike(socket.companyId, data.postId, data.commentId, socket.userId);

      broadcastToCompany(io, socket.companyId, "socialfeed:postUpdate", updatedPost, "Comment like updated");
      createSuccessResponse(socket, "socialfeed:toggle-comment-like", updatedPost, "Comment like updated successfully");

    } catch (error) {
      console.error("Error toggling comment like:", error);
      createErrorResponse(socket, "socialfeed:toggle-comment-like", error.message || "Failed to toggle comment like");
    }
  });

  socket.on("socialfeed:toggle-save-post", async (data) => {
    try {
      const postIdValidation = validatePostId(data.postId);
      if (!postIdValidation.isValid) {
        createErrorResponse(socket, "socialfeed:toggle-save-post", postIdValidation.error);
        return;
      }

      const updatedPost = await SocialFeedService.toggleSavePost(socket.companyId, data.postId, socket.userId);

      broadcastToCompany(io, socket.companyId, "socialfeed:postUpdate", updatedPost, "Post save status updated");
      createSuccessResponse(socket, "socialfeed:toggle-save-post", updatedPost, "Post save status updated successfully");

    } catch (error) {
      console.error("Error toggling save post:", error);
      createErrorResponse(socket, "socialfeed:toggle-save-post", error.message || "Failed to toggle save post");
    }
  });

  socket.on("socialfeed:toggle-reply-like", async (data) => {
    try {
      const postIdValidation = validatePostId(data.postId);
      if (!postIdValidation.isValid) {
        createErrorResponse(socket, "socialfeed:toggle-reply-like", postIdValidation.error);
        return;
      }

      const commentIdValidation = validateCommentId(data.commentId);
      if (!commentIdValidation.isValid) {
        createErrorResponse(socket, "socialfeed:toggle-reply-like", commentIdValidation.error);
        return;
      }

      const replyIdValidation = validateCommentId(data.replyId);
      if (!replyIdValidation.isValid) {
        createErrorResponse(socket, "socialfeed:toggle-reply-like", "Reply ID is required");
        return;
      }

      const updatedPost = await SocialFeedService.toggleReplyLike(socket.companyId, data.postId, data.commentId, data.replyId, socket.userId);

      broadcastToCompany(io, socket.companyId, "socialfeed:postUpdate", updatedPost, "Reply like updated");
      createSuccessResponse(socket, "socialfeed:toggle-reply-like", updatedPost, "Reply like updated successfully");

    } catch (error) {
      console.error("Error toggling reply like:", error);
      createErrorResponse(socket, "socialfeed:toggle-reply-like", error.message || "Failed to toggle reply like");
    }
  });

  socket.on("disconnect", () => {
    console.log(`User ${socket.id} disconnected from social feed`);
    if (socket.companyId) {
      socket.leave(`socialfeed:${socket.companyId}`);
    }
  });
};

export default socialFeedSocketController;
