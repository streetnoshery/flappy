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
    console.log('🚩 [FEATURE_FLAGS] Feature flags requested', {
      flags: this.flags,
      timestamp: new Date().toISOString()
    });
    return this.flags;
  }

  isFeatureEnabled(feature: keyof FeatureFlags): boolean {
    const isEnabled = this.flags[feature];
    console.log(`🚩 [FEATURE_FLAGS] Feature check: ${feature}`, {
      enabled: isEnabled,
      timestamp: new Date().toISOString()
    });
    return isEnabled;
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
      
      console.log('📝 [FEATURE_FLAGS] Enabled post types', {
        enabledTypes,
        timestamp: new Date().toISOString()
      });
      
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
      
      console.log('✅ [FEATURE_FLAGS] Post type validation', {
        type,
        isValid,
        enabledTypes,
        timestamp: new Date().toISOString()
      });
      
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