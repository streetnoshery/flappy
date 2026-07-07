import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SecurityAuditService } from '../services/security-audit.service';

export const OWNERSHIP_PARAM_KEY = 'ownershipParam';

/**
 * @CheckOwnership('paramName')
 *
 * Attach to any route where the URL param must equal req.user.userId.
 * Fails CLOSED with 404 (not 403 — avoids leaking resource existence).
 *
 * Example:
 *   @CheckOwnership('id')
 *   @Put(':id')
 *   async updateUser(@Param('id') id: string, ...) { ... }
 */
export const CheckOwnership = (paramName: string) =>
  (target: object, key: string | symbol, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(OWNERSHIP_PARAM_KEY, paramName, descriptor.value);
    return descriptor;
  };

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: SecurityAuditService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const paramName = this.reflector.get<string>(
      OWNERSHIP_PARAM_KEY,
      context.getHandler(),
    );

    // If no @CheckOwnership decorator, skip this guard
    if (!paramName) return true;

    const request = context.switchToHttp().getRequest();
    const actorId: string = request.user?.userId;
    const resourceId: string = request.params?.[paramName];

    if (!actorId || !resourceId) {
      this.deny(request, actorId, paramName, resourceId);
      throw new NotFoundException('Resource not found');
    }

    if (actorId !== resourceId) {
      this.deny(request, actorId, paramName, resourceId);
      throw new NotFoundException('Resource not found'); // 404 not 403 — avoids leaking existence
    }

    return true;
  }

  private deny(req: any, actorId: string, resource: string, resourceId: string) {
    this.auditService.logDenied({
      actorId: actorId ?? 'unauthenticated',
      resource,
      resourceId: resourceId ?? 'unknown',
      action: `${req.method} ${req.url}`,
      timestamp: new Date().toISOString(),
      ip: req.ip ?? req.headers?.['x-forwarded-for'],
    });
  }
}
