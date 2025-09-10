import mongoose from 'mongoose';

const socialFeedSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  companyId: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000
  },
  images: [{
    url: String,
    filename: String,
    public_id: String
  }],
  tags: [String],
  location: String,
  isPublic: {
    type: Boolean,
    default: true
  },
  likes: [{
    userId: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    userId: {
      type: String,
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: 1000
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    likes: [{
      userId: {
        type: String,
        required: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  }],
  shares: [{
    userId: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  bookmarks: [{
    userId: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

socialFeedSchema.index({ userId: 1, createdAt: -1 });
socialFeedSchema.index({ companyId: 1, createdAt: -1 });
socialFeedSchema.index({ tags: 1 });
socialFeedSchema.index({ createdAt: -1 });

export default mongoose.model('SocialFeed', socialFeedSchema);
