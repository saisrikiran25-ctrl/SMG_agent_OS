import { Router, Response } from 'express';
import { getDatabase } from '../db/database';
import { EvaluationRepository } from '../repositories';
import { AgentRuntimeEngine } from '../engine/agent_runtime';
import { ToolGatewayService } from '../tools/tool_gateway';
import { EvaluationRunner } from '../evaluation/eval_runner';
import { authenticate, AuthenticatedRequest, requireRole } from '../middleware/auth.middleware';

export const evalRouter = Router();
const db = getDatabase();
const evalRepo = new EvaluationRepository(db);
const toolGateway = new ToolGatewayService(db);
const runtimeEngine = new AgentRuntimeEngine(db, toolGateway);
const evalRunner = new EvaluationRunner(db, runtimeEngine);

evalRouter.use(authenticate);

// Run full evaluation suite
evalRouter.post(
  '/run',
  requireRole(['Owner', 'Admin', 'Manager']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const { promptVersion, agentVersion } = req.body;
      const report = await evalRunner.runSuite(
        tenantId,
        promptVersion || '1.0.0',
        agentVersion || '1.0.0'
      );
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// Get latest evaluation report
evalRouter.get('/latest', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const latest = await evalRepo.getLatest(tenantId);
    res.json(latest);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List evaluation history
evalRouter.get('/history', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const history = await evalRepo.list(tenantId);
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
