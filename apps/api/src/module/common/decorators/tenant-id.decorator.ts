import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const TenantId = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  // Try common locations set by your auth middleware/guard
  return req.user?.tenantId || req.tenantId || req.headers['x-tenant-id'];
});
