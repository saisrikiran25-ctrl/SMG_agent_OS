import { Router, Response } from 'express';
import { getDatabase } from '../db/database';
import {
  WorkflowExecutionRepository,
  ApprovalRepository,
  CustomerLeadRepository,
  UsageRepository,
  KnowledgeRepository,
} from '../repositories';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware';

export const dashboardRouter = Router();
const db = getDatabase();
const execRepo = new WorkflowExecutionRepository(db);
const approvalRepo = new ApprovalRepository(db);
const leadRepo = new CustomerLeadRepository(db);
const usageRepo = new UsageRepository(db);
const knowledgeRepo = new KnowledgeRepository(db);

dashboardRouter.use(authenticate);

dashboardRouter.get('/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;

    const [executions, pendingApprovals, leads, documents, usage] = await Promise.all([
      execRepo.list(tenantId),
      approvalRepo.listPending(tenantId),
      leadRepo.listLeads(tenantId),
      knowledgeRepo.listDocuments(tenantId),
      usageRepo.getTenantSummary(tenantId),
    ]);

    const completed = executions.filter((e) => e.status === 'COMPLETED').length;
    const awaitingApproval = executions.filter((e) => e.status === 'AWAITING_APPROVAL').length;
    const partiallyCompleted = executions.filter((e) => e.status === 'PARTIALLY_COMPLETED').length;
    const escalated = executions.filter((e) => e.status === 'ESCALATED').length;
    const failed = executions.filter((e) => e.status.startsWith('FAILED')).length;

    const totalExecutions = executions.length;
    const successRate =
      totalExecutions > 0 ? Number(((completed / totalExecutions) * 100).toFixed(1)) : 100.0;

    res.json({
      summary: {
        totalLeadsProcessed: totalExecutions,
        completedWorkflows: completed,
        pendingApprovalsCount: pendingApprovals.length,
        awaitingApprovalCount: awaitingApproval,
        partiallyCompletedCount: partiallyCompleted,
        escalatedCount: escalated,
        failedCount: failed,
        successRatePercent: successRate,
        crmLeadsCount: leads.length,
        knowledgeDocsCount: documents.length,
      },
      usage,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
