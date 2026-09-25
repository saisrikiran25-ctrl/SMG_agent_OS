import { Router, Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { getDatabase } from '../db/database';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware';

export const authRouter = Router();
const authService = new AuthService(getDatabase());

authRouter.post('/signup', async (req: Request, res: Response) => {
  try {
    const { companyName, name, email, password, industry } = req.body;
    if (!companyName || !email || !password || !name) {
      return res.status(400).json({ error: 'companyName, name, email, and password are required' });
    }
    const session = await authService.signup({ companyName, name, email, password, industry });
    res.status(201).json(session);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { tenantId, email, password } = req.body;
    if (!tenantId || !email || !password) {
      return res.status(400).json({ error: 'tenantId, email, and password are required' });
    }
    const session = await authService.login(tenantId, email, password);
    res.status(200).json(session);
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

authRouter.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  res.status(200).json({ user: req.user, tenantId: req.tenantId });
});
