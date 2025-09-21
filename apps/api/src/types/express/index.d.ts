import { JwtPayload } from "jsonwebtoken";

declare global {
  namespace Express {
    interface UserPayload extends JwtPayload {
      sub?: string;
      id: string;
      email: string;
      role: string;
      tenantId: string;
    }

    interface Request {
      user?: UserPayload;
    }
  }
}

export {};
