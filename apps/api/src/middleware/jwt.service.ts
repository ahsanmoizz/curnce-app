import * as jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';

export class JwtService {
  sign(payload: object, expiresIn: string | number = '3h'): string {
    return jwt.sign(payload, SECRET as jwt.Secret, { expiresIn: expiresIn as any });
  }

  verify<T = any>(token: string): T {
    try {
      return jwt.verify(token, SECRET as jwt.Secret) as T;
    } catch {
      throw new Error('Invalid or expired token');
    }
  }
}
