import { Request, Response, NextFunction } from 'express';
import { JwtService } from './jwt.service';

const jwtService = new JwtService();

export function jwtMiddleware(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing or invalid token' });

  try {
    (req as any).user = jwtService.verify(token);
    next();
  } catch (err: any) {
    return res.status(401).json({ error: err.message || 'Invalid token' });
  }
}
