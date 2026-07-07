import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  username: string;
  role: string;
}

/**
 * @CurrentUser() — pulls the verified identity from the JWT payload
 * that passport-jwt has already validated and attached to req.user.
 *
 * NEVER accept userId from body/params/query for ownership decisions.
 * Always use this decorator instead.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.userId) {
      throw new UnauthorizedException('Authenticated user context not found');
    }
    return user as AuthenticatedUser;
  },
);
