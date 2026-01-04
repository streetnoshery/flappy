import { Module, Global } from '@nestjs/common';
import { FeatureFlagsService } from './services/feature-flags.service';
import { FeatureFlagsController } from './controllers/feature-flags.controller';
import { PostTypeValidator } from './validators/post-type.validator';

@Global()
@Module({
  controllers: [FeatureFlagsController],
  providers: [FeatureFlagsService, PostTypeValidator],
  exports: [FeatureFlagsService, PostTypeValidator],
})
export class FeatureFlagsModule {}