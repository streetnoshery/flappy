# Common Module

## Overview
The Common module contains shared services, utilities, and cross-cutting concerns used throughout the application. It includes the Feature Flags system, validators, and other common functionality.

## Architecture
- **Services**: `services/` - Shared business logic services
- **Controllers**: `controllers/` - Shared HTTP controllers
- **Validators**: `validators/` - Custom validation classes
- **Module**: `feature-flags.module.ts` - NestJS module configuration

## Features
- Feature flag management system
- Environment-based configuration
- Shared validation utilities
- Cross-module services
- Global module exports

## Feature Flags Service

### Overview
The Feature Flags service provides runtime configuration for enabling/disabling application features without code deployment.

### Configuration
Feature flags are configured via environment variables:

```bash
# Feature Flags
ENABLE_IMAGE_POSTS=false
ENABLE_GIF_POSTS=false
ENABLE_VIDEO_UPLOADS=false
ENABLE_ADVANCED_SEARCH=false
ENABLE_REACTIONS=false
ENABLE_NOTIFICATIONS=false
ENABLE_CHAT=false
```

### API Endpoints

#### GET /feature-flags
Get all current feature flag values.

**Response:**
```json
{
  "enableImagePosts": false,
  "enableGifPosts": false,
  "enableVideoUploads": false,
  "enableAdvancedSearch": false,
  "enableReactions": false,
  "enableNotifications": false,
  "enableChat": false
}
```

#### GET /feature-flags/post-types
Get enabled post types based on feature flags.

**Response:**
```json
{
  "enabledTypes": ["text"]
}
```

### Service Methods

#### `getFlags(): FeatureFlags`
Returns all feature flag values as an object.

#### `isFeatureEnabled(feature: keyof FeatureFlags): boolean`
Checks if a specific feature is enabled.

#### `getEnabledPostTypes(): string[]`
Returns array of enabled post types based on feature flags.

#### `validatePostType(type: string): boolean`
Validates if a post type is currently enabled.

### Feature Flag Interface
```typescript
interface FeatureFlags {
  enableImagePosts: boolean;
  enableGifPosts: boolean;
  enableVideoUploads: boolean;
  enableAdvancedSearch: boolean;
  enableReactions: boolean;
  enableNotifications: boolean;
  enableChat: boolean;
}
```

## Feature Integration

### Posts Module Integration
```typescript
// Validate post type before creation
if (!featureFlagsService.validatePostType(postType)) {
  throw new BadRequestException(`${postType} posts are currently disabled`);
}
```

### Search Module Integration
```typescript
// Check if advanced search is enabled
if (!featureFlagsService.isFeatureEnabled('enableAdvancedSearch')) {
  throw new BadRequestException('Advanced search is currently disabled');
}
```

### Reactions Module Integration
```typescript
// Validate reactions feature
if (!featureFlagsService.isFeatureEnabled('enableReactions')) {
  throw new BadRequestException('Reactions are currently disabled');
}
```

## Environment Configuration

### Development Environment
```bash
# .env
ENABLE_IMAGE_POSTS=false
ENABLE_GIF_POSTS=false
ENABLE_ADVANCED_SEARCH=false
ENABLE_REACTIONS=false
ENABLE_NOTIFICATIONS=false
ENABLE_CHAT=false
```

### Production Environment
```bash
# .env.production
ENABLE_IMAGE_POSTS=true
ENABLE_GIF_POSTS=true
ENABLE_ADVANCED_SEARCH=true
ENABLE_REACTIONS=true
ENABLE_NOTIFICATIONS=true
ENABLE_CHAT=true
```

## Global Module Configuration
The Common module is configured as a global module, making its services available throughout the application:

```typescript
@Global()
@Module({
  controllers: [FeatureFlagsController],
  providers: [FeatureFlagsService],
  exports: [FeatureFlagsService],
})
export class FeatureFlagsModule {}
```

## Usage Examples

### Check Feature Availability
```typescript
// In any service or controller
constructor(private featureFlagsService: FeatureFlagsService) {}

// Check if reactions are enabled
if (this.featureFlagsService.isFeatureEnabled('enableReactions')) {
  // Process reaction logic
}
```

### Get Enabled Post Types
```typescript
const enabledTypes = this.featureFlagsService.getEnabledPostTypes();
// Returns: ['text'] when image/gif disabled
// Returns: ['text', 'image', 'gif'] when all enabled
```

### Validate Post Type
```typescript
const isValid = this.featureFlagsService.validatePostType('image');
// Returns: false if ENABLE_IMAGE_POSTS=false
// Returns: true if ENABLE_IMAGE_POSTS=true
```

## Error Handling
- **Feature Disabled**: Returns 400 Bad Request with descriptive message
- **Invalid Feature**: Graceful fallback to safe defaults
- **Environment Issues**: Logs warnings and uses default values

## Performance Considerations
- Feature flags loaded once at startup
- No database queries for flag checks
- Minimal memory footprint
- Fast boolean checks for feature validation

## Security Considerations
- Environment variables for sensitive configuration
- No runtime flag modification (restart required)
- Secure default values (features disabled by default)
- Input validation for all flag-dependent operations

## Dependencies
- `@nestjs/common` - NestJS framework
- Environment variables for configuration

## Best Practices

### Feature Flag Naming
- Use descriptive, action-oriented names
- Prefix with `ENABLE_` for clarity
- Use UPPER_CASE for environment variables
- Use camelCase for service methods

### Default Values
- Features disabled by default for safety
- Graceful degradation when features unavailable
- Clear error messages for disabled features
- Fallback behavior for missing flags

### Testing
- Test both enabled and disabled states
- Verify error handling for disabled features
- Test feature flag API endpoints
- Validate environment variable parsing

## Future Enhancements
- Database-driven feature flags
- User-specific feature flags
- A/B testing capabilities
- Feature flag analytics
- Runtime flag modification
- Feature flag scheduling

## Notes
- Feature flags require application restart to take effect
- All features are disabled by default for security
- Frontend must respect backend feature flag responses
- Feature flags control both API availability and UI display
- Environment variables are the single source of truth