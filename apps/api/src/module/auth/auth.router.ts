import { Router, Request, Response } from 'express';
import * as bcrypt from 'bcrypt';
import crypto from "crypto";
import jwt from 'jsonwebtoken'; // you can keep or remove if no direct usage remains
import { PrismaService } from '../../prisma.service';
import { JwtService } from '../../middleware/jwt.service';
import { AuditService } from '../audit/audit.service';
import { LoginSchema, RegisterSchema } from '@ufa/shared';
import { jwtMiddleware } from '../../middleware/jwt.middleware';
import { rolesMiddleware } from '../../middleware/roles.middleware';
import { AuthService } from './auth.service';
import { sendMail } from "./mailer";
// ... declare module Request augmentation if present ...

const prisma = new PrismaService();
const audit = new AuditService(prisma);

// create a real JwtService (uses process.env.JWT_SECRET)
const jwtService = new JwtService();
const auth = new AuthService(prisma, jwtService, audit);

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dummy_secret';

// ----------------- REGISTER -----------------
router.post('/register', async (req: Request, res: Response) => {
  try {
    const data = RegisterSchema.parse(req.body);

    const profilePicture = (req.body as any).profilePicture ?? null;
    if (profilePicture && typeof profilePicture === 'string' && !profilePicture.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Invalid profilePicture' });
    }

   const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

const tenant = await prisma.tenant.create({
  data: {
    name: data.tenantName,
    country: data.country,
    currency: data.currency,
    profilePicture: profilePicture || null,
    trialEndsAt, // 👈 free trial ends in 7 days
  },
});

    // user (owner) created for the tenant
    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: data.email,
        name: data.name,
        password: await bcrypt.hash(data.password, 10),
        role: 'OWNER',
      },
    });

    // issue tokens (full tokens)
    const tokens = await auth.issueTokens(user.tenantId, { id: user.id, email: user.email, role: user.role }, {
      ip: req.ip,
      ua: req.headers['user-agent'],
    });
   
    await audit.logAction({
      tenantId: user.tenantId,
      userId: user.id,
      action: 'REGISTER',
      details: { email: user.email },
      ip: req.ip,
    });

    // return tokens + tenant id
    res.json({ ...tokens, tenantId: tenant.id });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------- LOGIN -----------------
router.post('/login', async (req: Request, res: Response) => {
  try {
    const data = LoginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (!user) throw new Error('Invalid credentials');

    const ok = await bcrypt.compare(data.password, user.password);
    if (!ok) throw new Error('Invalid credentials');

    // Admin/Owner require 2FA (or 2FA setup). Provide a preAuth token
    if (['ADMIN', 'OWNER'].includes(String(user.role).toUpperCase())) {
      const tempToken = jwt.sign(
        { sub: user.id, tenantId: user.tenantId, role: user.role },
        JWT_SECRET,
        { expiresIn: '10m' }
      );

      if (!user.twoFactorEnabled) {
        return res.json({ require2FASetup: true, tempToken });
      } else {
        return res.json({ require2FAVerify: true, tempToken });
      }
    }

    // non-admin: issue full tokens immediately
    const tokens = await auth.issueTokens(
      user.tenantId,
      { id: user.id, email: user.email, role: user.role },
      { ip: req.ip, ua: req.headers['user-agent'] }
    );

    await audit.logAction({
      tenantId: user.tenantId,
      userId: user.id,
      action: 'LOGIN',
      details: { email: user.email },
      ip: req.ip,
    });

    // ✅ return once: tokens + tenantId
    res.json({
      ...tokens,
      tenantId: user.tenantId,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------- 2FA SETUP (OWNER/ADMIN) -----------------
// protected by preAuth token (jwtMiddleware accepts any valid jwt)
router.post('/2fa/setup', jwtMiddleware, rolesMiddleware(['OWNER', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) throw new Error('Unauthorized');

   const result = await auth.setup2FA({
  id: (user.sub || user.id)!,
  email: user.email!,
  role: user.role!,
});


    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------- 2FA VERIFY -----------------
// protected by preAuth token issued during login
router.post('/2fa/verify', jwtMiddleware, async (req: Request, res: Response) => {
  try {
    const decoded = req.user;
    if (!decoded) throw new Error('Unauthorized');

    const id = decoded.sub || decoded.id;
    if (!id) throw new Error('Invalid token payload');

    // fetch user from DB to get email/2fa secret/tenantId
    const dbUser = await prisma.user.findUnique({ where: { id } });
    if (!dbUser) throw new Error('User not found');

    const { code } = req.body;
    // verify code using AuthService
    await auth.verify2FA(dbUser.id, code); // throws if invalid

    // If 2FA was just set up (twoFactorEnabled false), enable it now
    if (!dbUser.twoFactorEnabled) {
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { twoFactorEnabled: true },
      });
    }

    // issue full access + refresh tokens now that 2FA has been verified
    const tokens = await auth.issueTokens(dbUser.tenantId, { id: dbUser.id, email: dbUser.email, role: dbUser.role }, {
      ip: req.ip,
      ua: req.headers['user-agent'],
    });

    // audit successful 2FA / login complete
    await audit.logAction({
      tenantId: dbUser.tenantId || '',
      userId: dbUser.id,
      action: 'LOGIN_2FA',
      details: { email: dbUser.email },
      ip: req.ip,
    });

    res.json({
  ...tokens,
  tenantId: dbUser.tenantId,
  user: {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
    tenantId: dbUser.tenantId,
  },
});
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------- REFRESH TOKEN -----------------
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    const tokens = await auth.rotateRefreshToken(refreshToken);

    res.json(tokens);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------- ME -----------------
router.get('/me', jwtMiddleware, async (req, res) => {
  res.set('Cache-Control', 'no-store');  // 👈 Add this line
  res.set('Pragma', 'no-cache');         // 👈 Add this too for safety
  res.set('Expires', '0');               // 👈 Disable caching

  try {
    const decoded = req.user;
    const userId = decoded?.sub || decoded?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const dbUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!dbUser) return res.status(404).json({ error: 'User not found' });

    res.json({
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        tenantId: dbUser.tenantId,
      },
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------- UPDATE PROFILE -----------------
router.post('/update-profile', jwtMiddleware, async (req: Request, res: Response) => {
  try {
    const decoded = req.user;
    const userId = decoded?.sub || decoded?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name, email } = req.body;
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { name, email },
    });

    await audit.logAction({
      tenantId: updated.tenantId || '',
      userId: updated.id,
      action: 'UPDATE_PROFILE',
      details: { email: updated.email, name: updated.name },
      ip: req.ip,
    });

    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
// POST /auth/request-password-change
router.post("/request-password-change", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Always respond with generic message to prevent leaking valid emails
      return res
        .status(200)
        .json({ message: "If email exists, reset link sent" });
    }

    // Generate token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashed = crypto.createHash("sha256").update(resetToken).digest("hex");
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save token in DB
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashed,
        expiresAt: expires,
      },
    });

    // Reset URL for frontend
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    // ✅ Send real email
    await sendMail(
      user.email,
      "Password Reset Request(curnce)",
      `
        <p>Hello ${user.name || "user"},</p>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link is valid for 15 minutes. If you didn’t request this, please ignore.</p>
      `
    );

    res.json({ message: "Reset email sent" });
  } catch (err: any) {
    console.error("Password reset error:", err);
    res.status(400).json({ error: err.message || "Something went wrong" });
  }
});

  

// POST /auth/verify-reset-token
router.post("/verify-reset-token", async (req, res) => {
  const { token } = req.body;
  const hashed = crypto.createHash("sha256").update(token).digest("hex");

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashed },
    include: { user: true },
  });

  if (!record || record.expiresAt < new Date()) {
    return res.status(400).json({ error: "Invalid or expired token" });
  }

  res.json({ valid: true, userId: record.userId });
});


// POST /auth/reset-password
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: "Missing fields" });

    const hashed = crypto.createHash("sha256").update(token).digest("hex");

    const record = await prisma.passwordResetToken.findFirst({
      where: { tokenHash: hashed, expiresAt: { gt: new Date() } },
    });

    if (!record) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    // hash new password
    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // update user password
    await prisma.user.update({
      where: { id: record.userId },
      data: { password: hashedPassword },
    });

    // delete used token
    await prisma.passwordResetToken.delete({ where: { id: record.id } });

    res.json({ message: "Password reset successful" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
// ----------------- CHANGE PASSWORD -----------------
router.post('/change-password', jwtMiddleware, async (req: Request, res: Response) => {
  try {
    const decoded = req.user;
    const userId = decoded?.sub || decoded?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { current, newPass } = req.body;
    const dbUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!dbUser) throw new Error('User not found');

    const ok = await bcrypt.compare(current, dbUser.password);
    if (!ok) throw new Error('Invalid current password');

    const hashed = await bcrypt.hash(newPass, 10);
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { password: hashed },
    });

    await audit.logAction({
      tenantId: dbUser.tenantId || '',
      userId: dbUser.id,
      action: 'CHANGE_PASSWORD',
      details: { email: dbUser.email },
      ip: req.ip,
    });

    res.json({ message: 'Password updated successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
