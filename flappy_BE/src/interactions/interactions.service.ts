import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Comment } from './schemas/comment.schema';
import { Like } from './schemas/like.schema';
import { Post } from '../posts/schemas/post.schema';
import { User } from '../users/schemas/user.schema';
import { CreateCommentDto, CreateReplyDto } from './dto/interaction.dto';

@Injectable()
export class InteractionsService {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<Comment>,
    @InjectModel(Like.name) private likeModel: Model<Like>,
    @InjectModel(Post.name) private postModel: Model<Post>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async likePost(postId: string, userId: string) {
    // Check if user already liked the post
    const existingLike = await this.likeModel.findOne({ postId, userId });
    
    if (existingLike) {
      // Unlike the post
      await this.likeModel.deleteOne({ postId, userId });
      const likeCount = await this.likeModel.countDocuments({ postId });
      
      return { 
        message: 'Post unliked successfully',
        isLiked: false,
        likeCount
      };
    } else {
      // Like the post
      const like = new this.likeModel({ postId, userId });
      await like.save();
      const likeCount = await this.likeModel.countDocuments({ postId });
      
      return { 
        message: 'Post liked successfully',
        isLiked: true,
        likeCount
      };
    }
  }

  async getPostLikes(postId: string, userId?: string) {
    const likeCount = await this.likeModel.countDocuments({ postId });
    const isLiked = userId ? await this.likeModel.exists({ postId, userId }) : false;
    
    return {
      likeCount,
      isLiked: !!isLiked
    };
  }

  async commentOnPost(postId: string, createCommentDto: CreateCommentDto, userId: string) {
    const comment = new this.commentModel({
      postId,
      userId,
      text: createCommentDto.text,
    });
    
    return comment.save();
  }

  async replyToComment(commentId: string, createReplyDto: CreateReplyDto, userId: string) {
    const comment = await this.commentModel.findByIdAndUpdate(
      commentId,
      {
        $push: {
          replies: {
            userId,
            text: createReplyDto.text,
            createdAt: new Date(),
          }
        }
      },
      { new: true }
    );
    
    return comment;
  }

  async pinPost(postId: string, userId: string) {
    // Mock pin functionality - implement actual pin logic
    return { message: 'Post pinned successfully' };
  }

  async savePost(postId: string, userId: string) {
    // Mock save functionality - implement actual save logic with separate collection
    return { message: 'Post saved successfully' };
  }

  async getComments(postId: string) {
    const comments = await this.commentModel
      .find({ postId })
      .sort({ createdAt: -1 })
      .lean();

    // Manually populate user data for comments and replies
    const commentsWithUsers = await Promise.all(
      comments.map(async (comment) => {
        const user = await this.userModel.findOne({ userId: comment.userId }, 'username profilePhotoUrl userId').lean();
        
        // Populate replies with user data
        const repliesWithUsers = await Promise.all(
          (comment.replies || []).map(async (reply) => {
            const replyUser = await this.userModel.findOne({ userId: reply.userId }, 'username profilePhotoUrl userId').lean();
            return {
              ...reply,
              userId: replyUser || { userId: reply.userId, username: 'Unknown User', profilePhotoUrl: null }
            };
          })
        );

        return {
          ...comment,
          userId: user || { userId: comment.userId, username: 'Unknown User', profilePhotoUrl: null },
          replies: repliesWithUsers
        };
      })
    );

    return commentsWithUsers;
  }
}