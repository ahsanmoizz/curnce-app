import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { JwtService } from '../../middleware/jwt.service';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import * as crypto from 'crypto';
import { AuditService } from '../audit/audit.service';

const ACCESS_TTL = process.env.JWT_ACCESS_TTL || '3h';
const REFRESH_TTL_DAYS = parseInt(process.env.JWT_REFRESH_TTL_DAYS || '7', 10);

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private audit: AuditService,
  ) {}

  private hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // Admins/Owners only: create TOTP secret + QR
  async setup2FA(user: { id: string; email: string; role: string }) {
    if (!['ADMIN', 'OWNER'].includes(String(user.role).toUpperCase())) {
      throw new Error('2FA is required only for admins/owners');
    }

    const secret = speakeasy.generateSecret({
      name: `UFA (${user.email})`,
      length: 20,
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: secret.base32 },
    });

    const otpauth = secret.otpauth_url!;
    const qr = await qrcode.toDataURL(otpauth);
    return { base32: secret.base32, otpauth, qr };
  }

  // Verify a 2FA TOTP code
  async verify2FA(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const secret = (user as any)?.twoFactorSecret as string | undefined;
    if (!secret) throw new Error('2FA not set up');

    const ok = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1,
    });
    if (!ok) throw new Error('Invalid 2FA code');
    return { verified: true };
  }

  // Issue access + refresh tokens (and AUDIT the login)
  async issueTokens(
    tenantId: string | null | undefined,
    user: { id: string; email: string; role: string },
    reqMeta?: { ip?: string; ua?: string }
  ) {
    const payload = { sub: user.id, tenantId: tenantId || null, role: user.role };
    const accessToken = this.jwt.sign(payload);

    // Persist a plaintext refresh token (DB model expects token string)
    const refreshTokenPlain = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshTokenPlain,
        userId: user.id,
        tenantId: tenantId ?? null,
        expiresAt,
        // store both agent + userAgent if you keep both fields in your model
        agent: reqMeta?.ua || null,
        userAgent: reqMeta?.ua || null,
        ip: reqMeta?.ip || null,
      },
    });

    // AUDIT: LOGIN
    await this.audit.logAction({
      tenantId: tenantId || '',
      userId: user.id,
      action: 'LOGIN',
      details: { email: user.email },
      ip: reqMeta?.ip,
    });

    return { accessToken, refreshToken: refreshTokenPlain };
  }

  // Rotate refresh token (invalidate old, issue new)
  async rotateRefreshToken(oldTokenPlain: string) {
    // find by token (your model stores raw token)
    const found = await this.prisma.refreshToken.findUnique({
      where: { token: oldTokenPlain },
      include: { user: true }, // relation should be 'user' (lowercase)
    });

    if (!found || found.expiresAt < new Date()) {
      throw new Error('invalid refresh token');
    }

    // delete (invalidate) old token
    await this.prisma.refreshToken.delete({ where: { token: oldTokenPlain } });

    const user = found.user;
    if (!user) throw new Error('user not found');

    // issue new tokens; prefer tenantId from token if present, else from user
    const effectiveTenantId = found.tenantId ?? user.tenantId ?? null;
    return this.issueTokens(
      effectiveTenantId,
      { id: user.id, email: user.email, role: String(user.role) },
      { ip: found.ip || undefined, ua: found.userAgent || found.agent || undefined },
    );
  }
}
