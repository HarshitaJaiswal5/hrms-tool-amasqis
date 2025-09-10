import { Schema, model } from 'mongoose';

const conversationSchema = new Schema({
  participants: [{
    userId: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    avatar: {
      type: String,
      default: null
    },
    role: {
      type: String,
      required: true
    },
    isOnline: {
      type: Boolean,
      default: false
    },
    lastSeen: {
      type: Date,
      default: Date.now
    }
  }],
  companyId: {
    type: String,
    required: true
  },
  lastMessage: {
    content: String,
    senderId: String,
    senderName: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: ['text', 'image', 'file', 'audio', 'video'],
      default: 'text'
    }
  },
  isGroup: {
    type: Boolean,
    default: false
  },
  groupName: {
    type: String,
    default: null
  },
  groupDescription: {
    type: String,
    default: null
  },
  groupAvatar: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
conversationSchema.index({ participants: 1, companyId: 1 });
conversationSchema.index({ companyId: 1, updatedAt: -1 });

export default model('Conversation', conversationSchema);
