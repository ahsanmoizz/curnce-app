// apps/api/src/middleware/roles.decorator.ts
export const Roles = (...roles: string[]) => {
  return (req: any, res: any, next: any) => {
    req.requiredRoles = roles;
    next();
  };
};
