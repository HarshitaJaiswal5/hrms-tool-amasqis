import mongoose from 'mongoose';
import SocialFeed from '../models/socialfeed/socialFeed.model.js';
import { connectDB } from '../config/db.js';

const socialFeedSeeds = [
  {
    userId: new mongoose.Types.ObjectId(), // This will be replaced with actual user IDs
    companyId: "dev_company_123",
    content: "Excited to announce our new project launch! 🚀 The team has been working hard on this for months and we're finally ready to share it with the world. #NewProject #Innovation",
    tags: ["NewProject", "Innovation"],
    isPublic: true,
    likes: [],
    comments: [
      {
        userId: new mongoose.Types.ObjectId(),
        content: "Congratulations! This looks amazing! 🎉",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      },
      {
        userId: new mongoose.Types.ObjectId(),
        content: "Can't wait to see more details about this project!",
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago
      }
    ],
    shares: [],
    bookmarks: [],
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
  },
  {
    userId: new mongoose.Types.ObjectId(),
    companyId: "dev_company_123",
    content: "Great team meeting today! Discussed our quarterly goals and I'm really excited about the direction we're heading. Team collaboration is key to our success. 💪 #TeamWork #Goals",
    tags: ["TeamWork", "Goals"],
    isPublic: true,
    likes: [],
    comments: [
      {
        userId: new mongoose.Types.ObjectId(),
        content: "Totally agree! The meeting was very productive.",
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000)
      }
    ],
    shares: [],
    bookmarks: [],
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000)
  },
  {
    userId: new mongoose.Types.ObjectId(),
    companyId: "dev_company_123",
    content: "Just finished an amazing workshop on React best practices. Learned so many new techniques that will definitely improve our codebase quality. Thanks to our dev team for organizing this! 📚 #Learning #React #WebDevelopment",
    tags: ["Learning", "React", "WebDevelopment"],
    isPublic: true,
    likes: [],
    comments: [],
    shares: [],
    bookmarks: [],
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000)
  },
  {
    userId: new mongoose.Types.ObjectId(),
    companyId: "dev_company_123",
    content: "Happy to share that we've just onboarded 5 new amazing team members! Welcome aboard everyone! Looking forward to working with you all and achieving great things together. 🌟 #Welcome #TeamGrowth #NewHires",
    tags: ["Welcome", "TeamGrowth", "NewHires"],
    isPublic: true,
    likes: [],
    comments: [
      {
        userId: new mongoose.Types.ObjectId(),
        content: "Welcome to the team! 🎊",
        createdAt: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      }
    ],
    shares: [],
    bookmarks: [],
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
  }
];

export const seedSocialFeed = async () => {
  try {
    await connectDB();

    // Clear existing data
    await SocialFeed.deleteMany({ companyId: "dev_company_123" });

    // Insert new data
    const insertedPosts = await SocialFeed.insertMany(socialFeedSeeds);

    console.log(`✅ Successfully seeded ${insertedPosts.length} social feed posts`);

    return insertedPosts;
  } catch (error) {
    console.error('❌ Error seeding social feed:', error);
    throw error;
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedSocialFeed()
    .then(() => {
      console.log('🎉 Social feed seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Social feed seeding failed:', error);
      process.exit(1);
    });
}

export default seedSocialFeed;
