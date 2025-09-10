import { ChatService } from '../../services/chat/chat.services.js';
import { clerkClient } from '@clerk/express';

export class ChatController {
  constructor(socket, io) {
    this.socket = socket;
    this.io = io;
    this.companyId = socket.companyId;
    this.userId = socket.user.sub;
    this.chatService = new ChatService(this.companyId);
    this.setupEventHandlers();

    // Presence: mark user online on connection and broadcast to company
    this.chatService
      .updateUserOnlineStatus(this.userId, true)
      .then(() => {
        this.io
          .to(`company_${this.companyId}`)
          .emit('user_status_changed', { userId: this.userId, isOnline: true });
      })
      .catch(() => {});

    // On disconnect, mark offline and broadcast
    this.socket.on('disconnect', () => {
      this.chatService
        .updateUserOnlineStatus(this.userId, false)
        .then(() => {
          this.io
            .to(`company_${this.companyId}`)
            .emit('user_status_changed', { userId: this.userId, isOnline: false });
        })
        .catch(() => {});
    });
  }

  setupEventHandlers() {
    // Get user conversations
    this.socket.on('get_conversations', this.getConversations.bind(this));
    
    // Get conversation messages
    this.socket.on('get_messages', this.getMessages.bind(this));
    
    // Send message
    this.socket.on('send_message', this.sendMessage.bind(this));
    
    // Mark messages as read
    this.socket.on('mark_messages_read', this.markMessagesAsRead.bind(this));
    
    // Get unread count
    this.socket.on('get_unread_count', this.getUnreadCount.bind(this));
    
    // Search chats
    this.socket.on('search_chats', this.searchChats.bind(this));
    
    // Update online status
    this.socket.on('update_online_status', this.updateOnlineStatus.bind(this));
    
    // Start conversation with user
    this.socket.on('start_conversation', this.startConversation.bind(this));
    
    // Join conversation room
    this.socket.on('join_conversation', this.joinConversation.bind(this));
    
    // Leave conversation room
    this.socket.on('leave_conversation', this.leaveConversation.bind(this));

    // Typing indicators
    this.socket.on('typing', this.handleTyping.bind(this));
    this.socket.on('stop_typing', this.handleStopTyping.bind(this));

    // Header actions
    this.socket.on('mute_conversation', this.muteConversation.bind(this));
    this.socket.on('disappearing_toggle', this.toggleDisappearing.bind(this));
    this.socket.on('clear_conversation', this.clearConversation.bind(this));
    this.socket.on('delete_conversation', this.deleteConversation.bind(this));
    this.socket.on('block_user', this.blockUser.bind(this));
  }

  async getConversations(data) {
    try {
      if (!this.socket.checkRateLimit()) {
        this.socket.emit('error', { message: 'Rate limit exceeded' });
        return;
      }

      const { limit = 50, skip = 0 } = data;
      const result = await this.chatService.getUserConversations(this.userId, limit, skip);
      
      if (result.success) {
        this.socket.emit('conversations_list', {
          conversations: result.conversations,
          hasMore: result.conversations.length === limit
        });
      } else {
        this.socket.emit('error', { message: result.error });
      }
    } catch (error) {
      console.error('Error in getConversations:', error);
      this.socket.emit('error', { message: 'Failed to get conversations' });
    }
  }

  async getMessages(data) {
    try {
      if (!this.socket.checkRateLimit()) {
        this.socket.emit('error', { message: 'Rate limit exceeded' });
        return;
      }

      const { conversationId, limit = 50, skip = 0 } = data;
      
      if (!conversationId) {
        this.socket.emit('error', { message: 'Conversation ID is required' });
        return;
      }

      const result = await this.chatService.getConversationMessages(conversationId, limit, skip);
      
      if (result.success) {
        this.socket.emit('messages_list', {
          conversationId,
          messages: result.messages,
          hasMore: result.messages.length === limit
        });
      } else {
        this.socket.emit('error', { message: result.error });
      }
    } catch (error) {
      console.error('Error in getMessages:', error);
      this.socket.emit('error', { message: 'Failed to get messages' });
    }
  }

  async sendMessage(data) {
    try {
      if (!this.socket.checkRateLimit()) {
        this.socket.emit('error', { message: 'Rate limit exceeded' });
        return;
      }

      const { conversationId, content, type = 'text', fileData = null } = data;
      
      if (!conversationId || !content) {
        this.socket.emit('error', { message: 'Conversation ID and content are required' });
        return;
      }

      // Get user data
      const user = await clerkClient.users.getUser(this.userId);
      const senderData = {
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.emailAddresses[0]?.emailAddress,
        avatar: user.imageUrl,
        role: user.publicMetadata?.role || 'employee'
      };

      const result = await this.chatService.sendMessage(
        conversationId,
        this.userId,
        senderData,
        content,
        type,
        fileData
      );

      if (result.success) {
        // Emit to all participants in the conversation
        const conversation = await this.chatService.collections.conversations.findOne({
          _id: result.message.conversationId
        });

        if (conversation) {
          conversation.participants.forEach(participant => {
            this.io.to(`user_${participant.userId}`).emit('new_message', {
              conversationId,
              message: result.message
            });
          });
        }

        this.socket.emit('message_sent', {
          messageId: result.messageId,
          conversationId
        });
      } else {
        this.socket.emit('error', { message: result.error });
      }
    } catch (error) {
      console.error('Error in sendMessage:', error);
      this.socket.emit('error', { message: 'Failed to send message' });
    }
  }

  async markMessagesAsRead(data) {
    try {
      const { conversationId } = data;
      
      if (!conversationId) {
        this.socket.emit('error', { message: 'Conversation ID is required' });
        return;
      }

      const result = await this.chatService.markMessagesAsRead(conversationId, this.userId);
      
      if (result.success) {
        this.socket.emit('messages_marked_read', { conversationId });
        
        // Notify other participants
        const conversation = await this.chatService.collections.conversations.findOne({
          _id: conversationId
        });

        if (conversation) {
          conversation.participants.forEach(participant => {
            if (participant.userId !== this.userId) {
              this.io.to(`user_${participant.userId}`).emit('messages_read_by', {
                conversationId,
                userId: this.userId
              });
            }
          });
        }
      } else {
        this.socket.emit('error', { message: result.error });
      }
    } catch (error) {
      console.error('Error in markMessagesAsRead:', error);
      this.socket.emit('error', { message: 'Failed to mark messages as read' });
    }
  }

  async getUnreadCount() {
    try {
      const result = await this.chatService.getUnreadMessageCount(this.userId);
      
      if (result.success) {
        this.socket.emit('unread_count', { count: result.unreadCount });
      } else {
        this.socket.emit('error', { message: result.error });
      }
    } catch (error) {
      console.error('Error in getUnreadCount:', error);
      this.socket.emit('error', { message: 'Failed to get unread count' });
    }
  }

  async searchChats(data) {
    try {
      if (!this.socket.checkRateLimit()) {
        this.socket.emit('error', { message: 'Rate limit exceeded' });
        return;
      }

      const { searchTerm, limit = 20 } = data;
      
      if (!searchTerm || searchTerm.trim().length < 2) {
        this.socket.emit('error', { message: 'Search term must be at least 2 characters' });
        return;
      }

      const result = await this.chatService.searchChats(this.userId, searchTerm.trim(), limit);
      
      if (result.success) {
        this.socket.emit('search_results', {
          conversations: result.conversations,
          messages: result.messages
        });
      } else {
        this.socket.emit('error', { message: result.error });
      }
    } catch (error) {
      console.error('Error in searchChats:', error);
      this.socket.emit('error', { message: 'Failed to search chats' });
    }
  }

  async updateOnlineStatus(data) {
    try {
      const { isOnline } = data;
      const result = await this.chatService.updateUserOnlineStatus(this.userId, isOnline);
      
      if (result.success) {
        // Notify all users in the same company
        this.io.to(`company_${this.companyId}`).emit('user_status_changed', {
          userId: this.userId,
          isOnline
        });
      }
    } catch (error) {
      console.error('Error in updateOnlineStatus:', error);
    }
  }

  async startConversation(data) {
    try {
      if (!this.socket.checkRateLimit()) {
        this.socket.emit('error', { message: 'Rate limit exceeded' });
        return;
      }

      const { targetUserId } = data;
      
      if (!targetUserId) {
        this.socket.emit('error', { message: 'Target user ID is required' });
        return;
      }

      // Get current user data
      const currentUser = await clerkClient.users.getUser(this.userId);
      const currentUserData = {
        name: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.emailAddresses[0]?.emailAddress,
        avatar: currentUser.imageUrl,
        role: currentUser.publicMetadata?.role || 'employee'
      };

      // Get target user data
      const targetUser = await clerkClient.users.getUser(targetUserId);
      const targetUserData = {
        name: `${targetUser.firstName || ''} ${targetUser.lastName || ''}`.trim() || targetUser.emailAddresses[0]?.emailAddress,
        avatar: targetUser.imageUrl,
        role: targetUser.publicMetadata?.role || 'employee'
      };

      const result = await this.chatService.getOrCreateConversation(
        this.userId,
        currentUserData,
        targetUserId,
        targetUserData
      );

      if (result.success) {
        this.socket.emit('conversation_started', {
          conversation: result.conversation
        });
      } else {
        this.socket.emit('error', { message: result.error });
      }
    } catch (error) {
      console.error('Error in startConversation:', error);
      this.socket.emit('error', { message: 'Failed to start conversation' });
    }
  }

  async joinConversation(data) {
    try {
      const { conversationId } = data;
      
      if (!conversationId) {
        this.socket.emit('error', { message: 'Conversation ID is required' });
        return;
      }

      // Verify user is participant (ensure ObjectId match)
      const { ObjectId } = await import('mongodb');
      const convoObjectId = typeof conversationId === 'string' ? new ObjectId(conversationId) : conversationId;
      const conversation = await this.chatService.collections.conversations.findOne({
        _id: convoObjectId,
        companyId: this.companyId,
        'participants.userId': this.userId
      });

      if (!conversation) {
        this.socket.emit('error', { message: 'Access denied to conversation' });
        return;
      }

      this.socket.join(`conversation_${conversationId}`);
      this.socket.emit('joined_conversation', { conversationId });
    } catch (error) {
      console.error('Error in joinConversation:', error);
      this.socket.emit('error', { message: 'Failed to join conversation' });
    }
  }

  async leaveConversation(data) {
    try {
      const { conversationId } = data;
      
      if (conversationId) {
        this.socket.leave(`conversation_${conversationId}`);
        this.socket.emit('left_conversation', { conversationId });
      }
    } catch (error) {
      console.error('Error in leaveConversation:', error);
    }
  }

  async muteConversation(data) {
    const { conversationId, muted } = data || {};
    if (!conversationId) return;
    const result = await this.chatService.updateParticipantSettings(conversationId, this.userId, { muted: !!muted });
    if (result.success) this.socket.emit('conversation_muted', { conversationId, muted: !!muted });
  }

  async toggleDisappearing(data) {
    const { conversationId, enabled } = data || {};
    if (!conversationId) return;
    const result = await this.chatService.updateParticipantSettings(conversationId, this.userId, { disappearing: !!enabled });
    if (result.success) this.socket.emit('disappearing_updated', { conversationId, enabled: !!enabled });
  }

  async clearConversation(data) {
    const { conversationId } = data || {};
    if (!conversationId) return;
    const result = await this.chatService.clearConversationMessages(conversationId);
    if (result.success) {
      this.socket.emit('conversation_cleared', { conversationId });
      this.socket.to(`conversation_${conversationId}`).emit('conversation_cleared', { conversationId });
    }
  }

  async deleteConversation(data) {
    const { conversationId } = data || {};
    if (!conversationId) return;
    const result = await this.chatService.deleteConversation(conversationId, this.userId);
    if (result.success) {
      this.socket.emit('conversation_deleted', { conversationId });
      this.socket.to(`conversation_${conversationId}`).emit('conversation_deleted', { conversationId });
    }
  }

  async blockUser(data) {
    const { conversationId, blocked } = data || {};
    if (!conversationId) return;
    const result = await this.chatService.updateParticipantSettings(conversationId, this.userId, { blocked: !!blocked });
    if (result.success) this.socket.emit('user_blocked', { conversationId, blocked: !!blocked });
  }

  async handleTyping(data) {
    try {
      const { conversationId } = data;
      if (!conversationId) return;

      const conversation = await this.chatService.collections.conversations.findOne({
        _id: conversationId,
        'participants.userId': this.userId,
      });
      if (!conversation) return;

      conversation.participants.forEach((participant) => {
        if (participant.userId !== this.userId) {
          this.io.to(`user_${participant.userId}`).emit('user_typing', {
            conversationId,
            userId: this.userId,
          });
        }
      });
    } catch (error) {
      // silent fail
    }
  }

  async handleStopTyping(data) {
    try {
      const { conversationId } = data;
      if (!conversationId) return;

      const conversation = await this.chatService.collections.conversations.findOne({
        _id: conversationId,
        'participants.userId': this.userId,
      });
      if (!conversation) return;

      conversation.participants.forEach((participant) => {
        if (participant.userId !== this.userId) {
          this.io.to(`user_${participant.userId}`).emit('user_stopped_typing', {
            conversationId,
            userId: this.userId,
          });
        }
      });
    } catch (error) {
      // silent fail
    }
  }
}

export default ChatController;
