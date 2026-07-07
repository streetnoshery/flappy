import {
  Controller,
  Post,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { SubscriptionsService } from './subscriptions.service';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { SecurityAuditService } from '../common/services/security-audit.service';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly auditService: SecurityAuditService,
  ) {}

  /** POST /subscriptions/toggle — always operates on the authenticated user's own subscription */
  @Post('toggle')
  @HttpCode(HttpStatus.OK)
  async toggleSubscription(@CurrentUser() actor: AuthenticatedUser) {
    return this.subscriptionsService.toggleSubscription(actor.userId);
  }

  /**
   * GET /subscriptions/status/:userId
   * Restricted to the authenticated user's own record.
   * Any attempt to query another user's subscription returns 404.
   * coinBalance is financial data — never exposed to third parties.
   */
  @Get('status/:userId')
  async getSubscriptionStatus(
    @Param('userId') userId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    if (actor.userId !== userId) {
      this.auditService.logDenied({
        actorId: actor.userId,
        resource: 'subscription',
        resourceId: userId,
        action: 'GET status',
        timestamp: new Date().toISOString(),
        ip: req.ip,
      });
      throw new NotFoundException('Resource not found');
    }
    return this.subscriptionsService.getSubscriptionStatus(actor.userId);
  }
}
