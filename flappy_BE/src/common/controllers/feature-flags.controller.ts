import { Controller, Get } from '@nestjs/common';
import { FeatureFlagsService } from '../services/feature-flags.service';

@Controller('feature-flags')
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @Get()
  getFeatureFlags() {
    try {
      const flags = this.featureFlagsService.getFlags();
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
    try {
      const enabledTypes = this.featureFlagsService.getEnabledPostTypes();
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