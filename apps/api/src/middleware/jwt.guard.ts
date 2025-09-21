import { Request, Response, NextFunction } from 'express';
import { JwtService } from './jwt.service';

const jwtService = new JwtService();

export function JwtGuard(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const user = jwtService.verify(token);

    // 🔒 Require tenantId + id to avoid 500 later
    if (!user?.tenantId || !(user.sub || user.id)) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    req.user = {
      id: user.sub || user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
