import { getTenantCollections } from '../../config/db.js';
import { ObjectId } from 'mongodb';

export class ChatService {
  constructor(companyId) {
    this.companyId = companyId;
    this.collections = getTenantCollections(companyId);
  }

  // Create a new conversation
  async createConversation(participants, isGroup = false, groupName = null) {
    try {
      const conversation = {
        participants: participants.map(p => ({
          userId: p.userId,
          name: p.name,
          avatar: p.avatar || null,
          role: p.role,
          isOnline: false,
          lastSeen: new Date()
        })),
        companyId: this.companyId,
        lastMessage: null,
        isGroup,
        groupName,
        groupDescription: null,
        groupAvatar: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await this.collections.conversations.insertOne(conversation);
      return { success: true, conversationId: result.insertedId, conversation };
    } catch (error) {
      console.error('Error creating conversation:', error);
      return { success: false, error: error.message };
    }
  }

  // Get or create conversation between two users
  async getOrCreateConversation(user1Id, user1Data, user2Id, user2Data) {
    try {
      // Check if conversation already exists
      const existingConversation = await this.collections.conversations.findOne({
        companyId: this.companyId,
        'participants.userId': { $all: [user1Id, user2Id] },
        isGroup: false,
        isActive: true
      });

      if (existingConversation) {
        return { success: true, conversation: existingConversation };
      }

      // Create new conversation
      const participants = [
        {
          userId: user1Id,
          name: user1Data.name,
          avatar: user1Data.avatar,
          role: user1Data.role
        },
        {
          userId: user2Id,
          name: user2Data.name,
          avatar: user2Data.avatar,
          role: user2Data.role
        }
      ];

      return await this.createConversation(participants, false);
    } catch (error) {
      console.error('Error getting or creating conversation:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user's conversations
  async getUserConversations(userId, limit = 50, skip = 0) {
    try {
      const conversations = await this.collections.conversations
        .find({
          companyId: this.companyId,
          'participants.userId': userId,
          isActive: true
        })
        .sort({ updatedAt: -1 })
        .limit(limit)
        .skip(skip)
        .toArray();

      return { success: true, conversations };
    } catch (error) {
      console.error('Error getting user conversations:', error);
      return { success: false, error: error.message };
    }
  }

  // Send a message
  async sendMessage(conversationId, senderId, senderData, content, type = 'text', fileData = null) {
    try {
      const message = {
        conversationId: new ObjectId(conversationId),
        senderId,
        senderName: senderData.name,
        senderAvatar: senderData.avatar,
        content,
        type,
        fileUrl: fileData?.url || null,
        fileName: fileData?.name || null,
        fileSize: fileData?.size || null,
        metadata: fileData?.metadata || {},
        isEdited: false,
        isDeleted: false,
        replyTo: null,
        reactions: [],
        readBy: [{ userId: senderId, readAt: new Date() }],
        companyId: this.companyId,
        createdAt: new Date()
      };

      const result = await this.collections.messages.insertOne(message);

      // Update conversation's last message
      await this.collections.conversations.updateOne(
        { _id: new ObjectId(conversationId) },
        {
          $set: {
            lastMessage: {
              content,
              senderId,
              senderName: senderData.name,
              timestamp: new Date(),
              type
            },
            updatedAt: new Date()
          }
        }
      );

      return { success: true, messageId: result.insertedId, message };
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, error: error.message };
    }
  }

  // Get messages for a conversation
  async getConversationMessages(conversationId, limit = 50, skip = 0) {
    try {
      const messages = await this.collections.messages
        .find({
          conversationId: new ObjectId(conversationId),
          isDeleted: false
        })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .toArray();

      return { success: true, messages: messages.reverse() };
    } catch (error) {
      console.error('Error getting conversation messages:', error);
      return { success: false, error: error.message };
    }
  }

  // Mark messages as read
  async markMessagesAsRead(conversationId, userId) {
    try {
      await this.collections.messages.updateMany(
        {
          conversationId: new ObjectId(conversationId),
          senderId: { $ne: userId },
          'readBy.userId': { $ne: userId }
        },
        {
          $push: {
            readBy: {
              userId,
              readAt: new Date()
            }
          }
        }
      );

      return { success: true };
    } catch (error) {
      console.error('Error marking messages as read:', error);
      return { success: false, error: error.message };
    }
  }

  // Get unread message count for user
  async getUnreadMessageCount(userId) {
    try {
      const conversations = await this.collections.conversations
        .find({
          companyId: this.companyId,
          'participants.userId': userId,
          isActive: true
        })
        .toArray();

      let totalUnread = 0;
      for (const conversation of conversations) {
        const unreadCount = await this.collections.messages.countDocuments({
          conversationId: conversation._id,
          senderId: { $ne: userId },
          'readBy.userId': { $ne: userId },
          isDeleted: false
        });
        totalUnread += unreadCount;
      }

      return { success: true, unreadCount: totalUnread };
    } catch (error) {
      console.error('Error getting unread message count:', error);
      return { success: false, error: error.message };
    }
  }

  // Search conversations and messages
  async searchChats(userId, searchTerm, limit = 20) {
    try {
      // Search conversations by other participant name or group name
      const conversations = await this.collections.conversations
        .aggregate([
          { $match: { companyId: this.companyId, isActive: true, 'participants.userId': userId } },
          { $addFields: { otherParticipants: { $filter: { input: '$participants', as: 'p', cond: { $ne: ['$$p.userId', userId] } } } } },
          { $addFields: { otherNames: { $map: { input: '$otherParticipants', as: 'op', in: '$$op.name' } } } },
          { $match: { $or: [ { otherNames: { $elemMatch: { $regex: searchTerm, $options: 'i' } } }, { groupName: { $regex: searchTerm, $options: 'i' } } ] } },
          { $limit: limit }
        ])
        .toArray();

      // Search messages
      const messages = await this.collections.messages
        .find({
          companyId: this.companyId,
          content: { $regex: searchTerm, $options: 'i' },
          isDeleted: false
        })
        .project({ content: 1, conversationId: 1, createdAt: 1 })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();

      return { success: true, conversations, messages };
    } catch (error) {
      console.error('Error searching chats:', error);
      return { success: false, error: error.message };
    }
  }

  // Update user online status
  async updateUserOnlineStatus(userId, isOnline) {
    try {
      await this.collections.conversations.updateMany(
        {
          companyId: this.companyId,
          'participants.userId': userId
        },
        {
          $set: {
            'participants.$.isOnline': isOnline,
            'participants.$.lastSeen': new Date()
          }
        }
      );

      return { success: true };
    } catch (error) {
      console.error('Error updating user online status:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete conversation
  async deleteConversation(conversationId, userId) {
    try {
      // Check if user is participant
      const conversation = await this.collections.conversations.findOne({
        _id: new ObjectId(conversationId),
        'participants.userId': userId
      });

      if (!conversation) {
        return { success: false, error: 'Conversation not found or access denied' };
      }

      // Mark as inactive instead of deleting
      await this.collections.conversations.updateOne(
        { _id: new ObjectId(conversationId) },
        { $set: { isActive: false, updatedAt: new Date() } }
      );

      return { success: true };
    } catch (error) {
      console.error('Error deleting conversation:', error);
      return { success: false, error: error.message };
    }
  }

  // Update participant flags (mute, block, disappearing)
  async updateParticipantSettings(conversationId, userId, updates) {
    try {
      await this.collections.conversations.updateOne(
        { _id: new ObjectId(conversationId), companyId: this.companyId },
        {
          $set: Object.fromEntries(
            Object.entries(updates).map(([k, v]) => [`participants.$[p].${k}`, v])
          ),
          $currentDate: { updatedAt: true },
        },
        { arrayFilters: [{ "p.userId": userId }] }
      );
      return { success: true };
    } catch (error) {
      console.error('Error updating participant settings:', error);
      return { success: false, error: error.message };
    }
  }

  // Clear messages in a conversation for all participants
  async clearConversationMessages(conversationId) {
    try {
      await this.collections.messages.deleteMany({
        conversationId: new ObjectId(conversationId),
      });
      // also reset lastMessage
      await this.collections.conversations.updateOne(
        { _id: new ObjectId(conversationId) },
        { $set: { lastMessage: null, updatedAt: new Date() } }
      );
      return { success: true };
    } catch (error) {
      console.error('Error clearing conversation messages:', error);
      return { success: false, error: error.message };
    }
  }
}
