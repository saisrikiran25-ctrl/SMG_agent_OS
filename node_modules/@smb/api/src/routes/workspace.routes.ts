import { Router, Response } from 'express';
import { getDatabase } from '../db/database';
import { WorkspaceRepository, UserRepository, TenantRepository } from '../repositories';
import { authenticate, AuthenticatedRequest, requireRole } from '../middleware/auth.middleware';
import bcrypt from 'bcryptjs';

export const workspaceRouter = Router();
const db = getDatabase();
const workspaceRepo = new WorkspaceRepository(db);
const userRepo = new UserRepository(db);
const tenantRepo = new TenantRepository(db);

workspaceRouter.use(authenticate);

workspaceRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const workspaces = await workspaceRepo.listByTenant(tenantId);
    const tenant = await tenantRepo.findById(tenantId);
    res.json({ tenant, workspaces });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

workspaceRouter.get('/team', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const team = await userRepo.listByTenant(tenantId);
    res.json(team);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

workspaceRouter.post(
  '/team/invite',
  requireRole(['Owner', 'Admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const { email, name, role, temporaryPassword } = req.body;
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(temporaryPassword || 'Welcome123!', salt);
      const user = await userRepo.create(tenantId, email, hash, name, role || 'Sales member');
      res.status(201).json(user);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);
