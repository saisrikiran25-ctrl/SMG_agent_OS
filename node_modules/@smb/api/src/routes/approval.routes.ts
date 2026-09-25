import { Router, Response } from 'express';
import { getDatabase } from '../db/database';
import { ApprovalRepository, WorkflowExecutionRepository } from '../repositories';
import { AgentRuntimeEngine } from '../engine/agent_runtime';
import { ToolGatewayService } from '../tools/tool_gateway';
import { authenticate, AuthenticatedRequest, requireRole } from '../middleware/auth.middleware';

export const approvalRouter = Router();
const db = getDatabase();
const approvalRepo = new ApprovalRepository(db);
const execRepo = new WorkflowExecutionRepository(db);
const toolGateway = new ToolGatewayService(db);
const runtimeEngine = new AgentRuntimeEngine(db, toolGateway);

approvalRouter.use(authenticate);

// List pending approvals
approvalRouter.get('/pending', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const approvals = await approvalRepo.listPending(tenantId);
    res.json(approvals);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List all approvals (history)
approvalRouter.get('/all', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const approvals = await approvalRepo.listAll(tenantId);
    res.json(approvals);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get approval details
approvalRouter.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const approval = await approvalRepo.findById(tenantId, req.params.id);
    if (!approval) return res.status(404).json({ error: 'Approval not found' });
    const execution = await execRepo.findById(tenantId, approval.execution_id);
    res.json({ approval, execution });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Perform action on approval
approvalRouter.post(
  '/:id/action',
  requireRole(['Owner', 'Admin', 'Manager', 'Sales member']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const approvalId = req.params.id;
      const { action, review_notes, edited_content, assign_to } = req.body;

      const approval = await approvalRepo.findById(tenantId, approvalId);
      if (!approval) return res.status(404).json({ error: 'Approval record not found' });

      const userId = req.user?.id;

      switch (action) {
        case 'APPROVE': {
          await approvalRepo.updateStatus(tenantId, approvalId, 'APPROVED', userId, review_notes);
          // Resume execution automatically
          const runResult = await runtimeEngine.executeApprovedWorkflow(
            tenantId,
            approval.execution_id,
            userId
          );
          return res.json({ success: true, status: 'APPROVED', result: runResult });
        }

        case 'EDIT_AND_APPROVE': {
          await approvalRepo.updateStatus(
            tenantId,
            approvalId,
            'EDITED_APPROVED',
            userId,
            review_notes,
            edited_content
          );
          const runResult = await runtimeEngine.executeApprovedWorkflow(
            tenantId,
            approval.execution_id,
            userId
          );
          return res.json({ success: true, status: 'EDITED_APPROVED', result: runResult });
        }

        case 'REJECT': {
          await approvalRepo.updateStatus(tenantId, approvalId, 'REJECTED', userId, review_notes);
          await execRepo.updateStatus(tenantId, approval.execution_id, 'REJECTED', {
            error_message: review_notes || 'Rejected by owner/reviewer',
          });
          return res.json({ success: true, status: 'REJECTED' });
        }

        case 'ESCALATE': {
          await approvalRepo.updateStatus(tenantId, approvalId, 'ESCALATED', userId, review_notes);
          await execRepo.updateStatus(tenantId, approval.execution_id, 'ESCALATED', {
            error_message: review_notes || 'Escalated for senior review',
          });
          return res.json({ success: true, status: 'ESCALATED' });
        }

        case 'CANCEL': {
          await approvalRepo.updateStatus(tenantId, approvalId, 'REJECTED', userId, 'Cancelled');
          await execRepo.updateStatus(tenantId, approval.execution_id, 'CANCELLED', {
            error_message: review_notes || 'Workflow cancelled by user',
          });
          return res.json({ success: true, status: 'CANCELLED' });
        }

        default:
          return res.status(400).json({ error: `Unsupported action: ${action}` });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);
