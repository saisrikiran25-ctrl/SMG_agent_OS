import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { getDatabase } from '../db/database';
import { UserRole } from '@smb/shared';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    tenant_id: string;
    workspace_id?: string;
  };
  tenantId?: string;
}

const authService = new AuthService(getDatabase());

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    // If testing or unauthenticated public endpoint
    const headerTenantId = req.headers['x-tenant-id'] as string;
    if (headerTenantId) {
      req.tenantId = headerTenantId;
      return next();
    }
    return res.status(401).json({ error: 'Unauthorized: Authentication token required' });
  }

  try {
    const payload = authService.verifyToken(token);
    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
      tenant_id: payload.tenantId,
      workspace_id: payload.workspaceId,
    };
    req.tenantId = payload.tenantId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: User context missing' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden: Role '${req.user.role}' lacks permission for this action`,
      });
    }

    next();
  };
}
