import { Router, Response } from 'express';
import { getDatabase } from '../db/database';
import { AuditRepository } from '../repositories';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware';

export const auditRouter = Router();
const db = getDatabase();
const auditRepo = new AuditRepository(db);

auditRouter.use(authenticate);

auditRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const events = await auditRepo.listRecent(tenantId, 100);
    res.json(events);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

auditRouter.get('/execution/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const executionId = req.params.id;
    const events = await auditRepo.listByExecution(tenantId, executionId);
    res.json(events);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
