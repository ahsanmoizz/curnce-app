import { Request, Response, NextFunction } from 'express';

// Express middleware for role-based access
export function rolesMiddleware(required: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user?.role) return res.status(403).json({ error: 'Forbidden' });

    const role = String(user.role).toUpperCase();

    // OWNER implicitly has ADMIN rights
    const normalizedRoles = role === 'OWNER' ? ['OWNER', 'ADMIN'] : [role];

    if (!required.some(r => normalizedRoles.includes(r.toUpperCase()))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
}
