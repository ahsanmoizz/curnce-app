import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/guards';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RefundsService } from './refunds.service';

@Controller('v1/refunds')
@UseGuards(JwtGuard, RolesGuard)
export class RefundsController {
  constructor(private svc: RefundsService) {}

  // ✅ Existing request (backward compatible)
  @Post('request')
  @Roles('CUSTOMER', 'MANAGER', 'ADMIN')
  request(@Req() req: any, @Body() body: any) {
    return this.svc.requestRefund(req.user.tenantId, body, req.user.id);
  }

  // ✅ Existing approve (backward compatible)
  @Post('approve')
  @Roles('OWNER', 'ADMIN')
  approve(@Req() req: any, @Body('refundId') refundId: string) {
    return this.svc.approveRefund(req.user.tenantId, refundId, req.user.id);
  }

  // ✅ Existing get (backward compatible)
  @Get(':id')
  get(@Req() req: any, @Param('id') id: string) {
    return this.svc.getRefund(req.user.tenantId, id);
  }

  // 🔹 NEW approve (RESTful PATCH)
  @Patch(':id/approve')
  @Roles('OWNER', 'ADMIN')
  approvePatch(@Req() req: any, @Param('id') id: string) {
    return this.svc.approveRefund(req.user.tenantId, id, req.user.id);
  }

  // 🔹 NEW release refund
  @Patch(':id/release')
  @Roles('OWNER', 'ADMIN')
  release(@Req() req: any, @Param('id') id: string) {
    return this.svc.releaseRefund(req.user.tenantId, id, req.user.id);
  }

  // 🔹 NEW list refunds
  @Get()
  list(@Req() req: any) {
    return this.svc.listRefunds(req.user.tenantId);
  }
}
