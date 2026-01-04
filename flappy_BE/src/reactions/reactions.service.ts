import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Reaction } from './schemas/reaction.schema';
import { CreateReactionDto } from './dto/reaction.dto';

@Injectable()
export class ReactionsService {
  constructor(@InjectModel(Reaction.name) private reactionModel: Model<Reaction>) {}

  async reactToPost(postId: string, createReactionDto: CreateReactionDto, userId: string) {
    // Check if user already reacted
    const existingReaction = await this.reactionModel.findOne({ postId, userId });
    
    if (existingReaction) {
      if (existingReaction.type === createReactionDto.type) {
        // Same reaction - remove it (toggle off)
        await this.reactionModel.deleteOne({ postId, userId });
        const reactionCounts = await this.getReactionCounts(postId);
        return { 
          message: 'Reaction removed successfully',
          isReacted: false,
          reactionType: null,
          reactionCounts
        };
      } else {
        // Different reaction - update it
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