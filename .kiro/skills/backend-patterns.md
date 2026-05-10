# Backend Patterns — flappy_BE

## Adding a New Module

### 1. File structure
```
src/myfeature/
├── myfeature.module.ts
├── myfeature.controller.ts
├── myfeature.service.ts
├── schemas/
│   └── mymodel.schema.ts
├── dto/
│   └── myfeature.dto.ts
└── __tests__/
    ├── myfeature.unit.spec.ts
    └── myfeature.property.spec.ts
```

### 2. Schema pattern
```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MyModelDocument = MyModel & Document;

@Schema({ timestamps: true })
export class MyModel {
  @Prop({ required: true, index: true })
  userId: string;  // always use custom userId string, NOT ObjectId

  @Prop({ required: true })
  someField: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const MyModelSchema = SchemaFactory.createForClass(MyModel);
MyModelSchema.index({ userId: 1, createdAt: -1 }); // compound indexes after factory
```

### 3. Module pattern
```typescript
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MyModel.name, schema: MyModelSchema },
    ]),
  ],
  controllers: [MyFeatureController],
  providers: [MyFeatureService],
  exports: [MyFeatureService], // export if other modules need it
})
export class MyFeatureModule {}
```

### 4. Register in AppModule
Add to `src/app.module.ts` imports array.

### 5. Controller pattern
```typescript
@Controller('myfeature')
export class MyFeatureController {
  constructor(private readonly myFeatureService: MyFeatureService) {}

  @Get()
  async getAll(@Request() req) {
    const userId = req.user.userId; // from JWT
    return this.myFeatureService.getAll(userId);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.myFeatureService.getOne(id);
  }

  @Post()
  async create(@Request() req, @Body() dto: CreateMyFeatureDto) {
    return this.myFeatureService.create(req.user.userId, dto);
  }
}
```
- No need to add `JwtAuthGuard` — it's global
- Use `@Public()` from `src/auth/decorators/public.decorator.ts` to skip auth

### 6. Service pattern — atomic MongoDB updates
```typescript
// Atomic increment (upsert)
const updated = await this.myModel.findOneAndUpdate(
  { userId, postId },
  { $inc: { count: 1 } },
  { upsert: true, new: true },
);

// Atomic set
await this.myModel.findOneAndUpdate(
  { userId },
  { $set: { status: 'active', updatedAt: new Date() } },
  { new: true },
);
```

## Error Handling
```typescript
import { NotFoundException, ForbiddenException, ConflictException, UnprocessableEntityException } from '@nestjs/common';

throw new NotFoundException('resource_not_found');       // 404
throw new ForbiddenException('not_owner');               // 403
throw new ConflictException('already_exists');           // 409
throw new UnprocessableEntityException('invalid_state'); // 422
```

## Pagination Pattern
```typescript
async getPaginated(userId: string, page: number, pageSize: number) {
  const skip = (page - 1) * pageSize;
  const [items, total] = await Promise.all([
    this.model.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(pageSize).exec(),
    this.model.countDocuments({ userId }),
  ]);
  return { items, total, page, pageSize };
}
```

## Unit Test Pattern (bypasses NestJS DI)
```typescript
function buildService(deps = {}) {
  const createdDocs: any[] = [];

  const myModel = {
    findOneAndUpdate: jest.fn().mockImplementation((filter, update, opts) => {
      // return mock document
      return Promise.resolve({ ...filter, ...update.$set });
    }),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation((data) => {
      const doc = { ...data, _id: `id_${createdDocs.length}` };
      createdDocs.push(doc);
      return Promise.resolve(doc);
    }),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    }),
    countDocuments: jest.fn().mockResolvedValue(0),
  };

  const service = Object.create(MyFeatureService.prototype);
  Object.assign(service, { myModel });

  return { service, tracking: { createdDocs } };
}
```

## Property Test Pattern (fast-check)
```typescript
import * as fc from 'fast-check';

it('Property N: description', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.string(), fc.integer({ min: 0, max: 100 }),
      async (userId, amount) => {
        const { service } = buildService();
        const result = await service.doSomething(userId, amount);
        expect(result.value).toBe(amount);
      },
    ),
    { numRuns: 100 },
  );
});
```

## Reward Engine Integration
When a new action should trigger coin rewards, call from the relevant service:
```typescript
// In your service constructor, inject RewardEngineService
constructor(private readonly rewardEngineService: RewardEngineService) {}

// Then call:
await this.rewardEngineService.processEngagement({
  engagerId: userId,        // person doing the action
  postId: post._id.toString(),
  postOwnerId: post.userId, // MUST be post.userId (custom string), not _id
  eventType: 'like',        // or 'reaction'
  reactionType: 'heart',    // optional
});
```
- Self-engagement is automatically blocked (engagerId === postOwnerId → no coins)
- Both parties must be subscribed for coins to be awarded
- Abuse checks (rate limit, duplicate, flagged) run automatically
