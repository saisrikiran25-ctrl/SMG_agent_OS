import { Router, Response } from 'express';
import { getDatabase } from '../db/database';
import {
  WorkflowExecutionRepository,
  ApprovalRepository,
  AuditRepository,
  CustomerLeadRepository,
} from '../repositories';
import { AgentRuntimeEngine } from '../engine/agent_runtime';
import { ToolGatewayService } from '../tools/tool_gateway';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  INBOUND_LEAD_WORKFLOW_DEFINITION,
  LEAD_QUALIFICATION_AGENT_CONTRACT,
} from '@smb/shared';

export const workflowRouter = Router();
const db = getDatabase();
const execRepo = new WorkflowExecutionRepository(db);
const approvalRepo = new ApprovalRepository(db);
const auditRepo = new AuditRepository(db);
const leadRepo = new CustomerLeadRepository(db);
const toolGateway = new ToolGatewayService(db);
const runtimeEngine = new AgentRuntimeEngine(db, toolGateway);

workflowRouter.use(authenticate);

// Get Workflow Catalog & Agent Contract
workflowRouter.get('/definitions', async (req: AuthenticatedRequest, res: Response) => {
  res.json({
    workflow: INBOUND_LEAD_WORKFLOW_DEFINITION,
    agent: LEAD_QUALIFICATION_AGENT_CONTRACT,
  });
});

// Trigger Inbound Lead Workflow
workflowRouter.post('/lead/trigger', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { channel, external_lead_id, sender_phone, sender_name, message_text, idempotency_key } =
      req.body;

    if (!message_text) {
      return res.status(400).json({ error: 'message_text is required' });
    }

    const extId = external_lead_id || `lead_${Date.now()}`;
    const result = await runtimeEngine.processInboundLead({
      tenant_id: tenantId,
      workspace_id: req.user?.workspace_id,
      channel: channel || 'whatsapp',
      external_lead_id: extId,
      sender_phone,
      sender_name,
      message_text,
      idempotency_key,
    });

    res.status(200).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List workflow executions
workflowRouter.get('/executions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const list = await execRepo.list(tenantId);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get full trace for an execution (Section 15)
workflowRouter.get('/executions/:id/trace', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const executionId = req.params.id;

    const execution = await execRepo.findById(tenantId, executionId);
    if (!execution) return res.status(404).json({ error: 'Execution not found' });

    const steps = await execRepo.listStepsForExecution(tenantId, executionId);
    const auditEvents = await auditRepo.listByExecution(tenantId, executionId);
    const approval = await approvalRepo.findByExecutionId(tenantId, executionId);
    const lead = await leadRepo.findByExternalId(
      tenantId,
      execution.input_payload.external_lead_id || executionId
    );

    res.json({
      execution,
      steps,
      auditEvents,
      approval,
      lead,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Retry partial failure execution
workflowRouter.post('/executions/:id/retry', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const executionId = req.params.id;
    const result = await runtimeEngine.retryPartialFailure(tenantId, executionId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
