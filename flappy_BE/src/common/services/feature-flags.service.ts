import { Injectable } from '@nestjs/common';

export interface FeatureFlags {
  enableImagePosts: boolean;
  enableGifPosts: boolean;
  enableVideoUploads: boolean;
  enableAdvancedSearch: boolean;
  enableReactions: boolean;
  enableNotifications: boolean;
  enableChat: boolean;
}

@Injectable()
export class FeatureFlagsService {
  private readonly flags: FeatureFlags = {
    enableImagePosts: process.env.ENABLE_IMAGE_POSTS === 'true',
    enableGifPosts: process.env.ENABLE_GIF_POSTS === 'true',
    enableVideoUploads: process.env.ENABLE_VIDEO_UPLOADS === 'true',
    enableAdvancedSearch: process.env.ENABLE_ADVANCED_SEARCH === 'true',
    enableReactions: process.env.ENABLE_REACTIONS === 'true',
    enableNotifications: process.env.ENABLE_NOTIFICATIONS === 'true',
    enableChat: process.env.ENABLE_CHAT === 'true',
  };

  getFlags(): FeatureFlags {
    return this.flags;
  }

  isFeatureEnabled(feature: keyof FeatureFlags): boolean {
    return this.flags[feature];
  }

  getEnabledPostTypes(): string[] {
    try {
      const enabledTypes = ['text']; // Text posts are always enabled
      
      if (this.isFeatureEnabled('enableImagePosts')) {
        enabledTypes.push('image');
      }
      
      if (this.isFeatureEnabled('enableGifPosts')) {
        enabledTypes.push('gif');
      }
      
      return enabledTypes;
    } catch (error) {
      console.error('❌ [FEATURE_FLAGS] Error getting enabled post types', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      // Fallback to text only if there's an error
      return ['text'];
    }
  }

  validatePostType(type: string): boolean {
    try {
      const enabledTypes = this.getEnabledPostTypes();
      const isValid = enabledTypes.includes(type);
      
      return isValid;
    } catch (error) {
      console.error('❌ [FEATURE_FLAGS] Error validating post type', {
        type,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      // Fallback: only allow text posts if there's an error
      return type === 'text';
    }
  }
}