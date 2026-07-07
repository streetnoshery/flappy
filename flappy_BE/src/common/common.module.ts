import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { SecurityAuditService } from './services/security-audit.service';
import { OwnershipGuard } from './guards/ownership.guard';
import { FeatureFlagsService } from './services/feature-flags.service';
import { FeatureFlagsController } from './controllers/feature-flags.controller';

/**
 * CommonModule — global services shared across all modules.
 * @Global() means providers are available everywhere without importing the module.
 */
@Global()
@Module({
  controllers: [FeatureFlagsController],
  providers: [
    FeatureFlagsService,
    SecurityAuditService,
    // OwnershipGuard registered as APP_GUARD runs after JwtAuthGuard on every route.
    // It only acts when @CheckOwnership() is present on the handler.
    {
      provide: APP_GUARD,
      useClass: OwnershipGuard,
    },
  ],
  exports: [FeatureFlagsService, SecurityAuditService],
})
export class CommonModule {}
