import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to restrict access to specific user roles.
 * Usage: router.get('/path', JwtGuard, RolesGuard(['admin']), handler);
 */
export function RolesGuard(allowedRoles: string[]) {
  return (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.user.role) {
      return res.status(403).json({ error: 'User role not found' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden - insufficient role' });
    }

    next();
  };
}
