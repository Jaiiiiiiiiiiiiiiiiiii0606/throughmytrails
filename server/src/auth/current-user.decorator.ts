import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtUser {
  sub: string;
  email: string;
  name: string;
}

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): JwtUser => {
  return ctx.switchToHttp().getRequest().user as JwtUser;
});
