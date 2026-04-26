import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Reaction } from './schemas/reaction.schema';
import { Post } from '../posts/schemas/post.schema';
import { CreateReactionDto } from './dto/reaction.dto';
import { RewardEngineService } from '../rewards/reward-engine.service';

@Injectable()
export class ReactionsService {
  constructor(
    @InjectModel(Reaction.name) private reactionModel: Model<Reaction>,
    @InjectModel(Post.name) private postModel: Model<Post>,
    private readonly rewardEngineService: RewardEngineService,
  ) {}

  async reactToPost(postId: string, createReactionDto: CreateReactionDto, userId: string) {
    // Look up the post to get the owner ID for reward processing
    const post = await this.postModel.findById(postId);

    // Check if user already reacted
    const existingReaction = await this.reactionModel.findOne({ postId, userId });
    
    if (existingReaction) {
      if (existingReaction.type === createReactionDto.type) {
        // Same reaction - remove it (toggle off)
        await this.reactionModel.deleteOne({ postId, userId });
        const reactionCounts = await this.getReactionCounts(postId);

        // Reverse engagement rewards (deduct coins)
        if (post) {
          try {
            await this.rewardEngineService.reverseEngagement({
              engagerId: userId,
              postId,
              postOwnerId: post.userId,
              eventType: 'reaction',
              reactionType: existingReaction.type,
            });
          } catch (error) {
            console.error('⚠️ [REACTIONS] Failed to reverse engagement reward', {
              postId,
              userId,
              error: error.message,
            });
          }
        }

        return { 
          message: 'Reaction removed successfully',
          isReacted: false,
          reactionType: null,
          reactionCounts
        };
      } else {
        // Different reaction - update it (no additional reward processing needed, already rewarded on first react)
        existingReaction.type = createReactionDto.type;
        await existingReaction.save();
        const reactionCounts = await this.getReactionCounts(postId);
        return { 
          message: 'Reaction updated successfully',
          isReacted: true,
          reactionType: createReactionDto.type,
          reactionCounts
        };
      }
    } else {
      // Create new reaction
      const reaction = new this.reactionModel({
        postId,
        userId,
        type: createReactionDto.type,
      });
      await reaction.save();
      const reactionCounts = await this.getReactionCounts(postId);

      // Process engagement rewards (award coins)
      if (post) {
        try {
          await this.rewardEngineService.processEngagement({
            engagerId: userId,
            postId,
            postOwnerId: post.userId,
            eventType: 'reaction',
            reactionType: createReactionDto.type,
          });
        } catch (error) {
          console.error('⚠️ [REACTIONS] Failed to process engagement reward', {
            postId,
            userId,
            error: error.message,
          });
        }
      }

      return { 
        message: 'Reaction added successfully',
        isReacted: true,
        reactionType: createReactionDto.type,
        reactionCounts
      };
    }
  }

  async getUserReaction(postId: string, userId: string) {
    const reaction = await this.reactionModel.findOne({ postId, userId });
    return reaction ? reaction.type : null;
  }

  async getReactionCounts(postId: string) {
    const reactions = await this.reactionModel.aggregate([
      { $match: { postId } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);
    
    return reactions.reduce((acc, reaction) => {
      acc[reaction._id] = reaction.count;
      return acc;
    }, {});
  }

  async getReactions(postId: string) {
    return this.getReactionCounts(postId);
  }
}
