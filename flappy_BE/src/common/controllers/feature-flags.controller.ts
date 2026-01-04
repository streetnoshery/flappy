import { Controller, Get } from '@nestjs/common';
import { FeatureFlagsService } from '../services/feature-flags.service';

@Controller('feature-flags')
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @Get()
  getFeatureFlags() {
    console.log('🚩 [FEATURE_FLAGS] GET /feature-flags - Fetching feature flags', {
      timestamp: new Date().toISOString()
    });
    
    try {
      const flags = this.featureFlagsService.getFlags();
      console.log('✅ [FEATURE_FLAGS] GET /feature-flags - Feature flags retrieved', {
        flags,
        timestamp: new Date().toISOString()
      });
      return flags;
    } catch (error) {
      console.error('❌ [FEATURE_FLAGS] GET /feature-flags - Failed to retrieve feature flags', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  @Get('post-types')
  getEnabledPostTypes() {
    console.log('📝 [FEATURE_FLAGS] GET /feature-flags/post-types - Fetching enabled post types', {
      timestamp: new Date().toISOString()
    });
    
    try {
      const enabledTypes = this.featureFlagsService.getEnabledPostTypes();
      console.log('✅ [FEATURE_FLAGS] GET /feature-flags/post-types - Enabled post types retrieved', {
        enabledTypes,
        timestamp: new Date().toISOString()
      });
      return { enabledTypes };
    } catch (error) {
      console.error('❌ [FEATURE_FLAGS] GET /feature-flags/post-types - Failed to retrieve enabled post types', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }
}