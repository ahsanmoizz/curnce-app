import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    // assuming tenantId is attached to request.user or request.headers
    return request.user?.tenantId || request.headers['x-tenant-id'];
  },
);
