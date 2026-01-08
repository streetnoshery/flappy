import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PostsModule } from './posts/posts.module';
import { FeedModule } from './feed/feed.module';
import { InteractionsModule } from './interactions/interactions.module';
import { ReactionsModule } from './reactions/reactions.module';
import { SearchModule } from './search/search.module';
import { FeatureFlagsModule } from './common/feature-flags.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb+srv://streetnoshery:Sumit%40Godwan%401062@streetnoshery.g7ufm.mongodb.net/flappy?retryWrites=true&w=majority'),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 10,
    }]),
    FeatureFlagsModule,
    AuthModule,
    UsersModule,
    PostsModule,
    FeedModule,
    InteractionsModule,
    ReactionsModule,
    SearchModule,
  ],
})
export class AppModule {}