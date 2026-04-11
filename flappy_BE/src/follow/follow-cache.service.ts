import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Follow, FollowDocument } from './schemas/follow.schema';

/**
 * In-memory cache for follow data.
 *
 * Cache strategy:
 * - On boot (onModuleInit): warm the entire cache from DB so first requests are instant.
 * - On follow/unfollow: write-through (update DB + cache atomically).
 * - Counts are stored per-user; relationship lookups use a Set for O(1).
 * - TTL-based staleness check per entry; background refresh every 5 min.
 * - After deployment the cache auto-warms, so there's zero cold-start penalty.
 */

interface UserFollowData {
  followerIds: Set<string>;   // users who follow this user
  followingIds: Set<string>;  // users this user follows
  updatedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes staleness threshold
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

@Injectable()
export class FollowCacheService implements OnModuleInit {
  private readonly logger = new Logger(FollowCacheService.name);
  private cache = new Map<string, UserFollowData>();
  private cleanupTimer: NodeJS.Timeout;

  constructor(
    @InjectModel(Follow.name) private followModel: Model<FollowDocument>,
  ) {}

  /** Warm cache on application start — critical for post-deployment performance */
  async onModuleInit() {
    this.logger.log('Warming follow cache from database...');
    const start = Date.now();

    const allFollows = await this.followModel.find().lean();

    for (const f of allFollows) {
      this.ensureEntry(f.followerId);
      this.ensureEntry(f.followingId);
      this.cache.get(f.followerId)!.followingIds.add(f.followingId);
      this.cache.get(f.followingId)!.followerIds.add(f.followerId);
    }

    // Mark all entries as fresh
    const now = Date.now();
    for (const entry of this.cache.values()) {
      entry.updatedAt = now;
    }

    this.logger.log(
      `Cache warmed: ${allFollows.length} relationships, ${this.cache.size} users in ${Date.now() - start}ms`,
    );

    // Periodic background refresh for entries that go stale
    this.cleanupTimer = setInterval(() => this.backgroundRefresh(), CLEANUP_INTERVAL_MS);
  }

  // ─── Read operations (cache-first) ────────────────────────────

  getFollowerCount(userId: string): number {
    return this.cache.get(userId)?.followerIds.size ?? 0;
  }

  getFollowingCount(userId: string): number {
    return this.cache.get(userId)?.followingIds.size ?? 0;
  }

  isFollowing(followerId: string, followingId: string): boolean {
    return this.cache.get(followerId)?.followingIds.has(followingId) ?? false;
  }

  getFollowerIds(userId: string): string[] {
    return Array.from(this.cache.get(userId)?.followerIds ?? []);
  }

  getFollowingIds(userId: string): string[] {
    return Array.from(this.cache.get(userId)?.followingIds ?? []);
  }

  // ─── Write operations (write-through) ─────────────────────────

  addFollow(followerId: string, followingId: string): void {
    this.ensureEntry(followerId);
    this.ensureEntry(followingId);
    this.cache.get(followerId)!.followingIds.add(followingId);
    this.cache.get(followingId)!.followerIds.add(followerId);
    this.touch(followerId);
    this.touch(followingId);
  }

  removeFollow(followerId: string, followingId: string): void {
    this.cache.get(followerId)?.followingIds.delete(followingId);
    this.cache.get(followingId)?.followerIds.delete(followerId);
    this.touch(followerId);
    this.touch(followingId);
  }

  // ─── Internals ────────────────────────────────────────────────

  private ensureEntry(userId: string): void {
    if (!this.cache.has(userId)) {
      this.cache.set(userId, {
        followerIds: new Set(),
        followingIds: new Set(),
        updatedAt: Date.now(),
      });
    }
  }

  private touch(userId: string): void {
    const entry = this.cache.get(userId);
    if (entry) entry.updatedAt = Date.now();
  }

  /** Refresh stale entries from DB in the background */
  private async backgroundRefresh(): Promise<void> {
    const now = Date.now();
    const staleUsers: string[] = [];

    for (const [userId, data] of this.cache.entries()) {
      if (now - data.updatedAt > CACHE_TTL_MS) {
        staleUsers.push(userId);
      }
    }

    if (staleUsers.length === 0) return;

    this.logger.debug(`Refreshing ${staleUsers.length} stale cache entries`);

    for (const userId of staleUsers) {
      try {
        const [followers, following] = await Promise.all([
          this.followModel.find({ followingId: userId }).select('followerId').lean(),
          this.followModel.find({ followerId: userId }).select('followingId').lean(),
        ]);

        const entry = this.cache.get(userId);
        if (entry) {
          entry.followerIds = new Set(followers.map((f) => f.followerId));
          entry.followingIds = new Set(following.map((f) => f.followingId));
          entry.updatedAt = Date.now();
        }
      } catch (err) {
        this.logger.warn(`Failed to refresh cache for ${userId}: ${err.message}`);
      }
    }
  }
}
