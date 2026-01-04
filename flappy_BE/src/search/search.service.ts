import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../users/schemas/user.schema';
import { Post } from '../posts/schemas/post.schema';

@Injectable()
export class SearchService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Post.name) private postModel: Model<Post>,
  ) {}

  async searchUsers(query: string) {
    return this.userModel.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ]
    }).select('-password').limit(20);
  }

  async searchPosts(query: string) {
    const posts = await this.postModel.find({
      $or: [
        { content: { $regex: query, $options: 'i' } },
        { hashtags: { $in: [new RegExp(query, 'i')] } },
      ]
    }).limit(20).lean();

    // Manually populate user data
    const postsWithUsers = await Promise.all(
      posts.map(async (post) => {
        const user = await this.userModel.findOne({ userId: post.userId }, 'username profilePhotoUrl userId').lean();
        return {
          ...post,
          userId: user || { userId: post.userId, username: 'Unknown User', profilePhotoUrl: null }
        };
      })
    );

    return postsWithUsers;
  }

  async getTrendingTags() {
    const result = await this.postModel.aggregate([
      { $unwind: '$hashtags' },
      { $group: { _id: '$hashtags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    return result.map(item => ({ tag: item._id, count: item.count }));
  }
}