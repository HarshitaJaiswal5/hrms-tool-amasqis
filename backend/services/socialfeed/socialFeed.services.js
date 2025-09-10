import { getTenantCollections } from '../../config/db.js';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { ObjectId } from 'mongodb';
import { extractHashtags } from '../../utils/hashtagUtils.js';

export class SocialFeedService {
  static enrichComment(comment, userMap) {
    const commentUser = userMap[comment.userId];
    let enrichedComment = { ...comment };

    if (!commentUser) {
      const fallbackUsername = comment.userId && comment.userId.includes ? (comment.userId.includes('user_') ? comment.userId.replace('user_', '') : comment.userId) : 'Unknown';
      enrichedComment.user = {
        id: comment.userId,
        firstName: fallbackUsername,
        lastName: '',
        imageUrl: null,
        email: null
      };
    } else {
      enrichedComment.user = commentUser;
    }

    if (comment.likes && comment.likes.length > 0) {
      enrichedComment.likes = comment.likes.map((like) => {
        const likeUser = userMap[like.userId];
        if (!likeUser) {
          const fallbackUsername = like.userId && like.userId.includes ? (like.userId.includes('user_') ? like.userId.replace('user_', '') : like.userId) : 'Unknown';
          return {
            ...like,
            user: {
              id: like.userId,
              firstName: fallbackUsername,
              lastName: '',
              imageUrl: null,
              email: null
            }
          };
        }
        return {
          ...like,
          user: likeUser
        };
      });
    }

    if (comment.replies && comment.replies.length > 0) {
      enrichedComment.replies = comment.replies.map(reply => this.enrichComment(reply, userMap));
    }

    return enrichedComment;
  }

  static async enrichPostsWithUserData(posts) {
    try {
      const rawUserIds = [
        ...posts.map(post => post.userId),
        ...posts.flatMap(post => post.likes?.map(like => like.userId) || []),
        ...posts.flatMap(post => post.comments?.map(comment => comment.userId) || []),
        ...posts.flatMap(post => post.comments?.flatMap(comment => comment.replies?.map(reply => reply.userId) || []) || []),
        ...posts.flatMap(post => post.comments?.flatMap(comment => comment.replies?.flatMap(reply => reply.likes?.map(like => like.userId) || []) || []) || []),
        ...posts.flatMap(post => post.shares?.map(share => share.userId) || []),
        ...posts.flatMap(post => post.bookmarks?.map(bookmark => bookmark.userId) || [])
      ];

      const userIds = [...new Set(rawUserIds.filter(userId => userId && typeof userId === 'string' && userId.trim().length > 0))]; // Filter out null, undefined, and empty userIds

      const userPromises = userIds.map(async (userId) => {
        try {
          console.log(`Fetching user data for ${userId}`);
          const user = await clerkClient.users.getUser(userId);
          return {
            id: userId,
            firstName: user.firstName || user.primaryEmailAddress?.emailAddress?.split('@')[0] || 'User',
            lastName: user.lastName || '',
            imageUrl: user.imageUrl || null,
            email: user.primaryEmailAddress?.emailAddress || null,
            publicMetadata: user.publicMetadata || {}
          };
        } catch (error) {
          console.error(`Failed to fetch user ${userId}:`, error.message);
          const fallbackUsername = userId.includes('user_') ? userId.replace('user_', '') : userId;

          return {
            id: userId,
            firstName: fallbackUsername,
            lastName: '',
            imageUrl: null,
            email: null,
            publicMetadata: {}
          };
        }
      });

      const users = await Promise.all(userPromises);
      const userMap = Object.fromEntries(users.map(user => [user.id, user]));

      return posts.map(post => {
        const userData = userMap[post.userId];
        if (!userData) {
          const fallbackUsername = post.userId && post.userId.includes ? (post.userId.includes('user_') ? post.userId.replace('user_', '') : post.userId) : 'Unknown';
          return {
            ...post,
            user: {
              id: post.userId,
              firstName: fallbackUsername,
              lastName: '',
              imageUrl: null,
              email: null,
              publicMetadata: {}
            }
          };
        }

        return {
          ...post,
          user: userData,
          likes: post.likes?.map(like => {
            const likeUser = userMap[like.userId];
            if (!likeUser) {
              const fallbackUsername = like.userId && like.userId.includes ? (like.userId.includes('user_') ? like.userId.replace('user_', '') : like.userId) : 'Unknown';
              return {
                ...like,
                user: {
                  id: like.userId,
                  firstName: fallbackUsername,
                  lastName: '',
                  imageUrl: null,
                  email: null
                }
              };
            }
            return {
              ...like,
              user: likeUser
            };
          }) || [],
          comments: post.comments?.map(comment => this.enrichComment(comment, userMap)) || [],
          shares: post.shares?.map(share => {
            const shareUser = userMap[share.userId];
            if (!shareUser) {
              const fallbackUsername = share.userId && share.userId.includes ? (share.userId.includes('user_') ? share.userId.replace('user_', '') : share.userId) : 'Unknown';
              return {
                ...share,
                user: {
                  id: share.userId,
                  firstName: fallbackUsername,
                  lastName: '',
                  imageUrl: null,
                  email: null
                }
              };
            }
            return {
              ...share,
              user: shareUser
            };
          }) || [],
          bookmarks: post.bookmarks?.map(bookmark => {
            const bookmarkUser = userMap[bookmark.userId];
            if (!bookmarkUser) {
              const fallbackUsername = bookmark.userId && bookmark.userId.includes ? (bookmark.userId.includes('user_') ? bookmark.userId.replace('user_', '') : bookmark.userId) : 'Unknown';
              return {
                ...bookmark,
                user: {
                  id: bookmark.userId,
                  firstName: fallbackUsername,
                  lastName: '',
                  imageUrl: null,
                  email: null
                }
              };
            }
            return {
              ...bookmark,
              user: bookmarkUser
            };
          }) || []
      }});
    } catch (error) {
      console.error('Error enriching posts with user data:', error);
      return posts;
    }
  }

  static async getPostById(companyId, postId) {
    try {
      const collections = getTenantCollections(companyId);
      const post = await collections.socialFeeds.findOne({ _id: new ObjectId(postId) });

      if (!post) {
        throw new Error('Post not found');
      }

      const enrichedPosts = await this.enrichPostsWithUserData([post]);
      return enrichedPosts[0];
    } catch (error) {
      throw new Error(`Failed to get post: ${error.message}`);
    }
  }

  static async getAllPosts(companyId, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      const collections = getTenantCollections(companyId);

      const posts = await collections.socialFeeds
        .find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      const total = await collections.socialFeeds.countDocuments({});
      const enrichedPosts = await this.enrichPostsWithUserData(posts);

      return {
        posts: enrichedPosts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Failed to fetch social feed posts: ${error.message}`);
    }
  }

  static async getPostsByUser(companyId, userId, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      const collections = getTenantCollections(companyId);

      const posts = await collections.socialFeeds
        .find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      const total = await collections.socialFeeds.countDocuments({ userId });

      const enrichedPosts = await this.enrichPostsWithUserData(posts);

      return {
        posts: enrichedPosts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Failed to fetch user posts: ${error.message}`);
    }
  }

  static async createPost(companyId, postData) {
    try {
      console.log('Creating post with data:', {
        companyId,
        userId: postData.userId,
        content: postData.content,
        imagesCount: postData.images ? postData.images.length : 0,
        images: postData.images
      });

      const collections = getTenantCollections(companyId);

      const postToInsert = {
        ...postData,
        createdAt: new Date(),
        updatedAt: new Date(),
        likes: postData.likes || [],
        comments: postData.comments || [],
        shares: postData.shares || [],
        bookmarks: postData.bookmarks || []
      };

      const result = await collections.socialFeeds.insertOne(postToInsert);
      const post = await collections.socialFeeds.findOne({ _id: result.insertedId });

      console.log('Post retrieved from database:', {
        id: post._id,
        content: post.content,
        imagesCount: post.images ? post.images.length : 0,
        images: post.images
      });

      // Process hashtags from post content
      if (postData.content) {
        await this.processHashtags(postData.content, postData.userId, companyId, result.insertedId);
      }

      const enrichedPost = await this.enrichPostsWithUserData([post]);
      console.log('Enriched post for return:', {
        id: enrichedPost[0]._id,
        content: enrichedPost[0].content,
        imagesCount: enrichedPost[0].images ? enrichedPost[0].images.length : 0,
        images: enrichedPost[0].images
      });
      return enrichedPost[0];
    } catch (error) {
      throw new Error(`Failed to create post: ${error.message}`);
    }
  }

  static async updatePost(companyId, postId, userId, updateData) {
    try {
      const collections = getTenantCollections(companyId);
      const post = await collections.socialFeeds.findOne({
        _id: new ObjectId(postId),
        userId: userId
      });

      if (!post) {
        throw new Error('Post not found or unauthorized');
      }

      const updateResult = await collections.socialFeeds.updateOne(
        { _id: new ObjectId(postId), userId: userId },
        {
          $set: {
            ...updateData,
            updatedAt: new Date()
          }
        }
      );

      if (updateResult.modifiedCount === 0) {
        throw new Error('Failed to update post');
      }

      // Update hashtags if content changed
      if (updateData.content) {
        await this.updatePostHashtags(postId, updateData.content, userId, companyId);
      }

      const updatedPost = await collections.socialFeeds.findOne({ _id: new ObjectId(postId) });
      const enrichedPost = await this.enrichPostsWithUserData([updatedPost]);
      return enrichedPost[0];
    } catch (error) {
      throw new Error(`Failed to update post: ${error.message}`);
    }
  }

  static async deletePost(companyId, postId, userId) {
    try {
      const collections = getTenantCollections(companyId);
      const deleteResult = await collections.socialFeeds.deleteOne({
        _id: new ObjectId(postId),
        userId: userId
      });

      if (deleteResult.deletedCount === 0) {
        throw new Error('Post not found or unauthorized');
      }

      // Remove hashtags associated with this post
      await this.removePostHashtags(postId, companyId);

      return { success: true, message: 'Post deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete post: ${error.message}`);
    }
  }

  static async toggleCommentLike(companyId, postId, commentId, userId) {
    try {
      const collections = getTenantCollections(companyId);
      const post = await collections.socialFeeds.findOne({
        _id: new ObjectId(postId),
        'comments._id': new ObjectId(commentId)
      });

      if (!post) {
        throw new Error('Post or comment not found');
      }

      // Find the comment index
      const commentIndex = post.comments.findIndex(
        comment => comment._id && comment._id.toString() === commentId
      );

      if (commentIndex === -1) {
        throw new Error('Comment not found');
      }

      const comment = post.comments[commentIndex];
      const existingLikeIndex = comment.likes ? comment.likes.findIndex(like => like.userId === userId) : -1;

      let updateOperation;
      if (existingLikeIndex !== -1) {
        updateOperation = {
          $pull: { [`comments.${commentIndex}.likes`]: { userId: userId } }
        };
      } else {
        updateOperation = {
          $push: { [`comments.${commentIndex}.likes`]: { userId: userId, createdAt: new Date() } }
        };
      }

      const updateResult = await collections.socialFeeds.updateOne(
        {
          _id: new ObjectId(postId),
          'comments._id': new ObjectId(commentId)
        },
        updateOperation
      );

      if (updateResult.modifiedCount === 0) {
        throw new Error('Failed to update comment like');
      }

      const updatedPost = await collections.socialFeeds.findOne({ _id: new ObjectId(postId) });
      const enrichedPost = await this.enrichPostsWithUserData([updatedPost]);

      return enrichedPost[0];
    } catch (error) {
      throw new Error(`Failed to toggle comment like: ${error.message}`);
    }
  }

  static async toggleSavePost(companyId, postId, userId) {
    try {
      const collections = getTenantCollections(companyId);
      const post = await collections.socialFeeds.findOne({ _id: new ObjectId(postId) });

      if (!post) {
        throw new Error('Post not found');
      }

      const existingSaveIndex = post.savedBy ? post.savedBy.findIndex(save => save.userId === userId) : -1;

      let updateOperation;
      if (existingSaveIndex !== -1) {
        updateOperation = {
          $pull: { savedBy: { userId: userId } }
        };
      } else {
        updateOperation = {
          $push: { savedBy: { userId: userId, savedAt: new Date() } }
        };
      }

      const updateResult = await collections.socialFeeds.updateOne(
        { _id: new ObjectId(postId) },
        updateOperation
      );

      if (updateResult.modifiedCount === 0) {
        throw new Error('Failed to update post save status');
      }

      const updatedPost = await collections.socialFeeds.findOne({ _id: new ObjectId(postId) });
      const enrichedPost = await this.enrichPostsWithUserData([updatedPost]);

      return enrichedPost[0];
    } catch (error) {
      throw new Error(`Failed to toggle save post: ${error.message}`);
    }
  }

  static async getTrendingHashtags(companyId, limit = 10) {
    try {
      const collections = getTenantCollections(companyId);

      const hashtagStats = await collections.socialFeeds.aggregate([
        {
          $match: {
            tags: { $exists: true, $ne: [] },
            isPublic: true
          }
        },
        {
          $unwind: "$tags"
        },
        {
          $group: {
            _id: "$tags",
            count: { $sum: 1 },
            lastUsed: { $max: "$createdAt" }
          }
        },
        {
          $sort: { count: -1, lastUsed: -1 }
        },
        {
          $limit: limit
        }
      ]).toArray();

      return hashtagStats.map(stat => ({
        tag: stat._id,
        count: stat.count,
        lastUsed: stat.lastUsed
      }));
    } catch (error) {
      console.error('Error getting trending hashtags:', error);
      return [];
    }
  }

  static async getSuggestedUsers(companyId, currentUserId, limit = 10) {
    try {
      const collections = getTenantCollections(companyId);
      const recentUsers = await collections.socialFeeds.aggregate([
        {
          $match: {
            userId: { $ne: currentUserId },
            isPublic: true
          }
        },
        {
          $group: {
            _id: "$userId",
            postCount: { $sum: 1 },
            lastPost: { $max: "$createdAt" }
          }
        },
        {
          $sort: { lastPost: -1, postCount: -1 }
        },
        {
          $limit: limit
        }
      ]).toArray();

      // Get user details from Clerk
      const userIds = recentUsers.map(user => user._id);
      const userDetails = await this.getUserDetails(userIds);

      return recentUsers.map(user => ({
        userId: user._id,
        postCount: user.postCount,
        lastPost: user.lastPost,
        ...userDetails.find(u => u.id === user._id)
      }));
    } catch (error) {
      console.error('Error getting suggested users:', error);
      return [];
    }
  }

  static async getUserDetails(userIds) {
    try {
      const userDetails = [];

      for (const userId of userIds) {
        try {
          const user = await clerkClient.users.getUser(userId);
          userDetails.push({
            id: user.id,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            imageUrl: user.imageUrl || '',
            username: user.username || '',
            publicMetadata: user.publicMetadata || {}
          });
        } catch (error) {
          console.warn(`Failed to get user details for ${userId}:`, error);
          userDetails.push({
            id: userId,
            firstName: 'Unknown',
            lastName: 'User',
            imageUrl: '',
            username: 'unknown',
            publicMetadata: {}
          });
        }
      }

      return userDetails;
    } catch (error) {
      console.error('Error getting user details:', error);
      return [];
    }
  }

  static async followUser(companyId, followerId, followingId) {
    try {
      const collections = getTenantCollections(companyId);

      if (followerId === followingId) {
        throw new Error('Cannot follow yourself');
      }

      const existingFollow = await collections.follows.findOne({
        followerId,
        followingId
      });

      if (existingFollow) {
        throw new Error('Already following this user');
      }

      const followData = {
        followerId,
        followingId,
        createdAt: new Date()
      };

      const result = await collections.follows.insertOne(followData);
      return { success: true, followId: result.insertedId };
    } catch (error) {
      console.error('Error following user:', error);
      throw error;
    }
  }

  static async unfollowUser(companyId, followerId, followingId) {
    try {
      const collections = getTenantCollections(companyId);

      const result = await collections.follows.deleteOne({
        followerId,
        followingId
      });

      if (result.deletedCount === 0) {
        throw new Error('Follow relationship not found');
      }

      return { success: true };
    } catch (error) {
      console.error('Error unfollowing user:', error);
      throw error;
    }
  }

  static async getFollowers(companyId, userId, page = 1, limit = 20) {
    try {
      const collections = getTenantCollections(companyId);
      const skip = (page - 1) * limit;

      const followers = await collections.follows
        .find({ followingId: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      const followerIds = followers.map(f => f.followerId);
      const userDetails = await this.getUserDetails(followerIds);

      return userDetails.map(user => ({
        ...user,
        followedAt: followers.find(f => f.followerId === user.id)?.createdAt
      }));
    } catch (error) {
      console.error('Error getting followers:', error);
      return [];
    }
  }

  static async getFollowing(companyId, userId, page = 1, limit = 20) {
    try {
      const collections = getTenantCollections(companyId);
      const skip = (page - 1) * limit;

      const following = await collections.follows
        .find({ followerId: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      const followingIds = following.map(f => f.followingId);
      const userDetails = await this.getUserDetails(followingIds);

      return userDetails.map(user => ({
        ...user,
        followedAt: following.find(f => f.followingId === user.id)?.createdAt
      }));
    } catch (error) {
      console.error('Error getting following:', error);
      return [];
    }
  }

  static async getAllFeeds(companyId, page = 1, limit = 20) {
    try {
      const collections = getTenantCollections(companyId);
      const skip = (page - 1) * limit;

      const posts = await collections.socialFeeds
        .find({ isPublic: true })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      return await this.enrichPostsWithUserData(posts);
    } catch (error) {
      console.error('Error getting all feeds:', error);
      throw error;
    }
  }

  static async getUserFeeds(companyId, userId, page = 1, limit = 20) {
    try {
      const collections = getTenantCollections(companyId);
      const skip = (page - 1) * limit;

      const posts = await collections.socialFeeds
        .find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      return await this.enrichPostsWithUserData(posts);
    } catch (error) {
      console.error('Error getting user feeds:', error);
      throw error;
    }
  }

  static async getFilesFromPosts(companyId, page = 1, limit = 20) {
    try {
      const collections = getTenantCollections(companyId);
      const skip = (page - 1) * limit;

      // Get posts that have images or files
      const postsWithFiles = await collections.socialFeeds
        .aggregate([
          {
            $match: {
              $or: [
                { images: { $exists: true, $ne: [] } },
                { attachments: { $exists: true, $ne: [] } }
              ]
            }
          },
          {
            $project: {
              _id: 1,
              content: 1,
              userId: 1,
              images: 1,
              attachments: 1,
              createdAt: 1,
              updatedAt: 1
            }
          },
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit }
        ])
        .toArray();

      return await this.enrichPostsWithUserData(postsWithFiles);
    } catch (error) {
      console.error('Error getting files from posts:', error);
      throw error;
    }
  }

  static async getSavedPosts(companyId, userId, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      const collections = getTenantCollections(companyId);
      const savedPosts = await collections.socialFeeds
        .find({
          'savedBy.userId': userId
        })
        .toArray();

      savedPosts.sort((a, b) => {
        const aSave = a.savedBy.find(save => save.userId === userId);
        const bSave = b.savedBy.find(save => save.userId === userId);
        return new Date(bSave.savedAt) - new Date(aSave.savedAt);
      });

      const paginatedPosts = savedPosts.slice(skip, skip + limit);
      const enrichedPosts = await this.enrichPostsWithUserData(paginatedPosts);

      return enrichedPosts;
    } catch (error) {
      throw new Error(`Failed to get saved posts: ${error.message}`);
    }
  }

  static async toggleLike(companyId, postId, userId) {
    try {
      const collections = getTenantCollections(companyId);
      const post = await collections.socialFeeds.findOne({ _id: new ObjectId(postId) });

      if (!post) {
        throw new Error('Post not found');
      }

      const existingLikeIndex = post.likes.findIndex(like => like.userId === userId);

      let updateOperation;
      if (existingLikeIndex !== -1) {
        updateOperation = {
          $pull: { likes: { userId: userId } }
        };
      } else {
        updateOperation = {
          $push: { likes: { userId: userId, createdAt: new Date() } }
        };
      }

      const updateResult = await collections.socialFeeds.updateOne(
        { _id: new ObjectId(postId) },
        updateOperation
      );

      if (updateResult.modifiedCount === 0) {
        throw new Error('Failed to update like');
      }

      const updatedPost = await collections.socialFeeds.findOne({ _id: new ObjectId(postId) });
      const enrichedPost = await this.enrichPostsWithUserData([updatedPost]);
      return enrichedPost[0];
    } catch (error) {
      throw new Error(`Failed to toggle like: ${error.message}`);
    }
  }

  static async addComment(companyId, postId, userId, content) {
    try {
      const collections = getTenantCollections(companyId);
      const post = await collections.socialFeeds.findOne({ _id: new ObjectId(postId) });

      if (!post) {
        throw new Error('Post not found');
      }

      const commentData = {
        _id: new ObjectId(),
        userId,
        content,
        createdAt: new Date(),
        likes: [],
        replies: []
      };

      const updateResult = await collections.socialFeeds.updateOne(
        { _id: new ObjectId(postId) },
        {
          $push: { comments: commentData },
          $set: { updatedAt: new Date() }
        }
      );

      if (updateResult.modifiedCount === 0) {
        throw new Error('Failed to add comment');
      }

      const updatedPost = await collections.socialFeeds.findOne({ _id: new ObjectId(postId) });
      const enrichedPost = await this.enrichPostsWithUserData([updatedPost]);
      return enrichedPost[0];
    } catch (error) {
      throw new Error(`Failed to add comment: ${error.message}`);
    }
  }

  static async deleteComment(companyId, postId, commentId, userId) {
    try {
      const collections = getTenantCollections(companyId);
      const post = await collections.socialFeeds.findOne({ _id: new ObjectId(postId) });

      if (!post) {
        throw new Error('Post not found');
      }

      const commentIndex = post.comments.findIndex(
        comment => comment._id && comment._id.toString() === commentId && comment.userId === userId
      );

      if (commentIndex === -1) {
        throw new Error('Comment not found or unauthorized');
      }

      const updateResult = await collections.socialFeeds.updateOne(
        { _id: new ObjectId(postId) },
        {
          $pull: { comments: { _id: new ObjectId(commentId), userId: userId } },
          $set: { updatedAt: new Date() }
        }
      );

      if (updateResult.modifiedCount === 0) {
        throw new Error('Failed to delete comment');
      }

      return { success: true, message: 'Comment deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete comment: ${error.message}`);
    }
  }

  static async toggleBookmark(companyId, postId, userId) {
    try {
      const collections = getTenantCollections(companyId);
      const post = await collections.socialFeeds.findOne({ _id: new ObjectId(postId) });

      if (!post) {
        throw new Error('Post not found');
      }

      const existingBookmarkIndex = post.bookmarks.findIndex(bookmark => bookmark.userId === userId);

      let updateOperation;
      if (existingBookmarkIndex !== -1) {
        updateOperation = {
          $pull: { bookmarks: { userId: userId } }
        };
      } else {
        updateOperation = {
          $push: { bookmarks: { userId: userId, createdAt: new Date() } }
        };
      }

      const updateResult = await collections.socialFeeds.updateOne(
        { _id: new ObjectId(postId) },
        updateOperation
      );

      if (updateResult.modifiedCount === 0) {
        throw new Error('Failed to update bookmark');
      }

      return { success: true, message: 'Bookmark updated successfully' };
    } catch (error) {
      throw new Error(`Failed to toggle bookmark: ${error.message}`);
    }
  }

  static async getTrendingHashtags(companyId, limit = 10) {
    try {
      const collections = getTenantCollections(companyId);

      const pipeline = [
        { $unwind: '$tags' },
        {
          $group: {
            _id: '$tags',
            count: { $sum: 1 },
            lastUsed: { $max: '$createdAt' }
          }
        },
        {
          $sort: {
            count: -1,
            lastUsed: -1
          }
        },
        { $limit: limit },
        {
          $project: {
            hashtag: '$_id',
            count: 1,
            lastUsed: 1,
            _id: 0
          }
        }
      ];

      const result = await collections.socialFeeds.aggregate(pipeline).toArray();
      return result;
    } catch (error) {
      throw new Error(`Failed to get trending hashtags: ${error.message}`);
    }
  }

  static async getBookmarkedPosts(companyId, userId, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      const collections = getTenantCollections(companyId);

      const posts = await collections.socialFeeds
        .find({ 'bookmarks.userId': userId })
        .sort({ 'bookmarks.createdAt': -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      const total = await collections.socialFeeds.countDocuments({ 'bookmarks.userId': userId });
      const enrichedPosts = await this.enrichPostsWithUserData(posts);

      return {
        posts: enrichedPosts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Failed to fetch bookmarked posts: ${error.message}`);
    }
  }

  static async searchPosts(companyId, query, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      const collections = getTenantCollections(companyId);

      const searchRegex = new RegExp(query, 'i');

      const posts = await collections.socialFeeds
        .find({
          $or: [
            { content: searchRegex },
            { tags: searchRegex }
          ]
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      const total = await collections.socialFeeds.countDocuments({
        $or: [
          { content: searchRegex },
          { tags: searchRegex }
        ]
      });

      const enrichedPosts = await this.enrichPostsWithUserData(posts);

      return {
        posts: enrichedPosts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Failed to search posts: ${error.message}`);
    }
  }

  static async addReply(companyId, postId, commentId, userId, content) {
    try {
      const collections = getTenantCollections(companyId);

      const reply = {
        _id: new ObjectId(),
        userId,
        content,
        createdAt: new Date(),
        likes: [],
        replies: []
      };

      const result = await collections.socialFeeds.updateOne(
        {
          _id: new ObjectId(postId),
          'comments._id': new ObjectId(commentId)
        },
        {
          $push: { 'comments.$.replies': reply },
          $set: { updatedAt: new Date() }
        }
      );

      if (result.modifiedCount === 0) {
        throw new Error('Comment not found or reply could not be added');
      }

      const updatedPost = await collections.socialFeeds.findOne({ _id: new ObjectId(postId) });
      const enrichedPost = await this.enrichPostsWithUserData([updatedPost]);

      return enrichedPost[0];
    } catch (error) {
      throw new Error(`Failed to add reply: ${error.message}`);
    }
  }

  static async toggleReplyLike(companyId, postId, commentId, replyId, userId) {
    try {
      const collections = getTenantCollections(companyId);
      const post = await collections.socialFeeds.findOne({
        _id: new ObjectId(postId),
        'comments._id': new ObjectId(commentId),
        'comments.replies._id': new ObjectId(replyId)
      });

      if (!post) {
        throw new Error('Reply not found');
      }

      const comment = post.comments.find(c => c._id.toString() === commentId);
      const reply = comment.replies.find(r => r._id.toString() === replyId);

      const hasLiked = reply.likes.some(like => like.userId === userId);

      let updateOperation;
      if (hasLiked) {
        updateOperation = {
          $pull: { 'comments.$[comment].replies.$[reply].likes': { userId } }
        };
      } else {
        updateOperation = {
          $push: { 'comments.$[comment].replies.$[reply].likes': { userId, createdAt: new Date() } }
        };
      }

      const result = await collections.socialFeeds.updateOne(
        {
          _id: new ObjectId(postId),
          'comments._id': new ObjectId(commentId),
          'comments.replies._id': new ObjectId(replyId)
        },
        updateOperation,
        {
          arrayFilters: [
            { 'comment._id': new ObjectId(commentId) },
            { 'reply._id': new ObjectId(replyId) }
          ]
        }
      );

      if (result.modifiedCount === 0) {
        throw new Error('Failed to toggle reply like');
      }

      const updatedPost = await collections.socialFeeds.findOne({ _id: new ObjectId(postId) });
      const enrichedPost = await this.enrichPostsWithUserData([updatedPost]);

      return enrichedPost[0];
    } catch (error) {
      throw new Error(`Failed to toggle reply like: ${error.message}`);
    }
  }

  static async getCommentReplies(companyId, postId, commentId, page = 1, limit = 10) {
    try {
      const collections = getTenantCollections(companyId);

      const post = await collections.socialFeeds.findOne({
        _id: new ObjectId(postId),
        'comments._id': new ObjectId(commentId)
      });

      if (!post) {
        throw new Error('Post or comment not found');
      }

      const comment = post.comments.find(c => c._id.toString() === commentId);
      const replies = comment.replies || [];
      const sortedReplies = replies.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedReplies = sortedReplies.slice(startIndex, endIndex);
      const enrichedReplies = paginatedReplies.map(reply => this.enrichComment(reply, {}));

      return {
        replies: enrichedReplies,
        pagination: {
          page,
          limit,
          total: replies.length,
          pages: Math.ceil(replies.length / limit)
        }
      };
    } catch (error) {
      throw new Error(`Failed to get comment replies: ${error.message}`);
    }
  }

  static async getUserProfile(companyId, userId) {
    try {
      const collections = getTenantCollections(companyId);
      const followersCount = await collections.follows.countDocuments({ followingId: userId });
      const followingCount = await collections.follows.countDocuments({ followerId: userId });
      const postsCount = await collections.socialFeeds.countDocuments({
        userId,
        companyId
      });

      let userDetails = {
        id: userId,
        firstName: 'Unknown',
        lastName: 'User',
        imageUrl: null,
        username: 'user',
        publicMetadata: {}
      };

      try {
        const clerkUser = await clerkClient.users.getUser(userId);
        userDetails = {
          id: userId,
          firstName: clerkUser.firstName || '',
          lastName: clerkUser.lastName || '',
          imageUrl: clerkUser.imageUrl || null,
          username: clerkUser.username || '',
          publicMetadata: clerkUser.publicMetadata || {}
        };
      } catch (clerkError) {
        console.warn(`Failed to fetch user details from Clerk for ${userId}:`, clerkError.message);
      }

      return {
        userId,
        name: `${userDetails.firstName} ${userDetails.lastName}`.trim() || 'User',
        username: `@${userDetails.username || userDetails.firstName?.toLowerCase() || 'user'}`,
        avatar: userDetails.imageUrl || 'assets/img/users/user-11.jpg',
        avatarIsExternal: !!userDetails.imageUrl,
        followers: followersCount,
        following: followingCount,
        posts: postsCount,
        publicMetadata: userDetails.publicMetadata
      };
    } catch (error) {
      throw new Error(`Failed to get user profile: ${error.message}`);
    }
  }

  static async getTotalPostsCount(companyId) {
    try {
      const collections = getTenantCollections(companyId);
      const totalPostsWithCompanyId = await collections.socialFeeds.countDocuments({ companyId });
      const totalPostsAll = await collections.socialFeeds.countDocuments({});

      // TEMPORARY: If no posts with companyId filter, return all posts
      if (totalPostsWithCompanyId === 0 && totalPostsAll > 0) {
        return totalPostsAll;
      }

      return totalPostsWithCompanyId || totalPostsAll;
    } catch (error) {
      console.error('Error getting total posts count:', error);
      console.error('Error details:', error.message);
      return 0;
    }
  }

  static async getTotalBookmarksCount(companyId) {
    try {
      const collections = getTenantCollections(companyId);
      const totalBookmarks = await collections.socialFeeds.aggregate([
        {
          $match: {
            companyId,
            savedBy: { $exists: true, $ne: [] }
          }
        },
        {
          $project: {
            bookmarkCount: { $size: "$savedBy" }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$bookmarkCount" }
          }
        }
      ]).toArray();

      return totalBookmarks.length > 0 ? totalBookmarks[0].total : 0;
    } catch (error) {
      console.error('Error getting total bookmarks count:', error);
      return 0;
    }
  }

  static async getCompanyEmployees(companyId, limit = 10) {
    try {
      const collections = getTenantCollections(companyId);
      const employees = await collections.employees
        .find({})
        .project({
          _id: 1,
          name: 1,
          email: 1,
          avatar: 1,
          role: 1,
          department: 1,
          designation: 1,
          joiningDate: 1,
          firstName: 1,
          lastName: 1
        })
        .limit(limit)
        .toArray();

      return employees.map(employee => {
        const name = employee.name ||
                    `${employee.firstName || ''} ${employee.lastName || ''}`.trim() ||
                    `User ${employee._id.toString().slice(-4)}`;

        return {
          employeeId: employee._id.toString(),
          name: name,
          email: employee.email || '',
          avatar: employee.avatar || null,
          role: employee.role || 'Employee',
          department: employee.department || 'General',
          designation: employee.designation || '',
          joiningDate: employee.joiningDate,
          postCount: 0
        };
      });
    } catch (error) {
      console.error('Error getting company employees:', error);
      return [];
    }
  }

  static async getEmployeesWithPostCounts(companyId, limit = 10) {
    try {
      const employees = await this.getCompanyEmployees(companyId, limit);

      if (employees.length === 0) {
        const collections = getTenantCollections(companyId);
        const posts = await collections.socialFeeds.find({}).limit(50).toArray();

        if (posts.length === 0) {
          return [];
        }

        const userIds = [...new Set(posts.map(post => post.userId))];
        const fallbackUsers = [];
        for (const userId of userIds.slice(0, limit)) {
          try {
            const clerkUser = await clerkClient.users.getUser(userId);
            const postCount = posts.filter(post => post.userId === userId).length;

            fallbackUsers.push({
              employeeId: userId,
              name: clerkUser.firstName && clerkUser.lastName
                ? `${clerkUser.firstName} ${clerkUser.lastName}`.trim()
                : clerkUser.firstName || clerkUser.username || `User ${userId.slice(-4)}`,
              email: clerkUser.primaryEmailAddress?.emailAddress || '',
              avatar: clerkUser.imageUrl || null,
              role: 'User',
              department: 'General',
              designation: '',
              joiningDate: null,
              postCount: postCount
            });
          } catch (clerkError) {
            console.warn(`Failed to get Clerk user ${userId}:`, clerkError.message);
            const postCount = posts.filter(post => post.userId === userId).length;
            fallbackUsers.push({
              employeeId: userId,
              name: `User ${userId.slice(-4)}`,
              email: '',
              avatar: null,
              role: 'User',
              department: 'General',
              designation: '',
              joiningDate: null,
              postCount: postCount
            });
          }
        }

        return fallbackUsers.sort((a, b) => b.postCount - a.postCount);
      }

      const postCounts = await Promise.all(
        employees.map(async (employee) => {
          const collections = getTenantCollections(companyId);
          const count = await collections.socialFeeds.countDocuments({
            userId: employee.employeeId
          });
          return count;
        })
      );

      const employeesWithCounts = employees.map((employee, index) => ({
        ...employee,
        postCount: postCounts[index]
      })).sort((a, b) => b.postCount - a.postCount);

      return employeesWithCounts;

    } catch (error) {
      console.error('Error getting employees with post counts:', error);
      return [];
    }
  }

  static async getTopPosters(companyId, limit = 8) {
    try {
      const collections = getTenantCollections(companyId);
      const topPosters = await collections.socialFeeds.aggregate([
        {
          $match: {
            companyId,
            isPublic: true
          }
        },
        {
          $group: {
            _id: "$userId",
            postCount: { $sum: 1 },
            lastPostDate: { $max: "$createdAt" }
          }
        },
        {
          $match: {
            postCount: { $gte: 1 },
            _id: { $ne: null }
          }
        },
        {
          $sort: {
            postCount: -1,
            lastPostDate: -1
          }
        },
        {
          $limit: limit
        }
      ]).toArray();

      if (topPosters.length === 0) {
        return [];
      }

      const topPostersWithDetails = [];
      for (const poster of topPosters) {
        try {
          const clerkUser = await clerkClient.users.getUser(poster._id);
          topPostersWithDetails.push({
            userId: poster._id,
            name: clerkUser.firstName && clerkUser.lastName
              ? `${clerkUser.firstName} ${clerkUser.lastName}`.trim()
              : clerkUser.firstName || clerkUser.username || `User ${poster._id.slice(-4)}`,
            avatar: clerkUser.imageUrl || null,
            postCount: poster.postCount,
            lastPostDate: poster.lastPostDate
          });
        } catch (clerkError) {
          console.warn(`Failed to get Clerk user ${poster._id}:`, clerkError.message);
          topPostersWithDetails.push({
            userId: poster._id,
            name: `User ${poster._id.slice(-4)}`,
            avatar: null,
            postCount: poster.postCount,
            lastPostDate: poster.lastPostDate
          });
        }
      }

      console.log(`[getTopPosters] Returning ${topPostersWithDetails.length} top posters with details`);
      return topPostersWithDetails;

    } catch (error) {
      console.error('Error getting top posters:', error);
      return [];
    }
  }

  static async processHashtags(content, userId, companyId, postId) {
    try {
      const hashtags = extractHashtags(content);
      console.log(`[processHashtags] Extracted hashtags:`, hashtags);

      if (hashtags.length === 0) return;

      const collections = getTenantCollections(companyId);
      const bulkOps = hashtags.map(tag => ({
        updateOne: {
          filter: { tag, companyId },
          update: {
            $inc: { count: 1 },
            $set: {
              lastUsed: new Date(),
              updatedAt: new Date()
            },
            $push: {
              posts: {
                postId,
                userId,
                usedAt: new Date()
              }
            }
          },
          upsert: true
        }
      }));

      const result = await collections.hashtags.bulkWrite(bulkOps);
      console.log(`[processHashtags] Updated ${result.modifiedCount} existing hashtags, inserted ${result.upsertedCount} new hashtags`);
    } catch (error) {
      console.error('[processHashtags] Error processing hashtags:', error);
    }
  }

  static async getTrendingHashtags(companyId, limit = 10, includeAll = true) {
    try {
      console.log(`[getTrendingHashtags] Getting ${limit} trending hashtags for company: ${companyId}`);

      const collections = getTenantCollections(companyId);
      const trendingHashtags = await collections.hashtags
        .find({ companyId, count: { $gt: 1 } })
        .sort({ count: -1, lastUsed: -1 })
        .limit(limit)
        .project({ tag: 1, count: 1, lastUsed: 1 })
        .toArray();

      if (trendingHashtags.length > 0) {
        return trendingHashtags.map(hashtag => ({
          tag: hashtag.tag,
          count: hashtag.count,
          lastUsed: hashtag.lastUsed
        }));
      }

      if (includeAll) {
        const allHashtags = await collections.hashtags
          .find({ companyId })
          .sort({ lastUsed: -1, count: -1 })
          .limit(limit)
          .project({ tag: 1, count: 1, lastUsed: 1 })
          .toArray();

        return allHashtags.map(hashtag => ({
          tag: hashtag.tag,
          count: hashtag.count,
          lastUsed: hashtag.lastUsed
        }));
      }

      return [];
    } catch (error) {
      console.error('[getTrendingHashtags] Error:', error);
      return [];
    }
  }

  static async removePostHashtags(postId, companyId) {
    try {
      console.log(`[removePostHashtags] Removing hashtags for post: ${postId}`);

      const collections = getTenantCollections(companyId);
      const updateResult = await collections.hashtags.updateMany(
        { companyId, 'posts.postId': new ObjectId(postId) },
        {
          $inc: { count: -1 },
          $pull: { posts: { postId: new ObjectId(postId) } },
          $set: { lastUsed: new Date(), updatedAt: new Date() }
        }
      );

      await collections.hashtags.deleteMany({
        companyId,
        count: { $lte: 0 }
      });

      console.log(`[removePostHashtags] Updated ${updateResult.modifiedCount} hashtags`);
    } catch (error) {
      console.error('[removePostHashtags] Error:', error);
    }
  }

  static async editPost(companyId, postId, userId, updateData) {
    try {
      const collections = getTenantCollections(companyId);
      const originalPost = await collections.socialFeeds.findOne({
        _id: new ObjectId(postId),
        userId: userId
      });

      if (!originalPost) {
        throw new Error('Post not found or unauthorized');
      }

      const updateResult = await collections.socialFeeds.updateOne(
        { _id: new ObjectId(postId), userId: userId },
        {
          $set: {
            ...updateData,
            updatedAt: new Date()
          }
        }
      );

      if (updateResult.modifiedCount === 0) {
        throw new Error('Failed to update post');
      }

      if (updateData.content && updateData.content !== originalPost.content) {
        await this.updatePostHashtags(postId, updateData.content, userId, companyId);
      }

      const updatedPost = await collections.socialFeeds.findOne({ _id: new ObjectId(postId) });
      const enrichedPost = await this.enrichPostsWithUserData([updatedPost]);

      return enrichedPost[0];
    } catch (error) {
      throw new Error(`Failed to edit post: ${error.message}`);
    }
  }

  static async updatePostHashtags(postId, content, userId, companyId) {
    try {
      await this.removePostHashtags(postId, companyId);
      await this.processHashtags(content, userId, companyId, new ObjectId(postId));
    } catch (error) {
      console.error('[updatePostHashtags] Error:', error);
    }
  }
}
