import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryDatabase } from '../db/database';
import { AuthService } from '../services/auth.service';
import { AgentRuntimeEngine } from '../engine/agent_runtime';
import { ToolGatewayService } from '../tools/tool_gateway';
import {
  KnowledgeRepository,
  CustomerLeadRepository,
  ApprovalRepository,
  WorkflowExecutionRepository,
  AuditRepository,
} from '../repositories';

describe('Workflow State Machine & Partial Failure Recovery (Section 10 & 16)', () => {
  let db: MemoryDatabase;
  let authService: AuthService;
  let toolGateway: ToolGatewayService;
  let runtimeEngine: AgentRuntimeEngine;
  let knowledgeRepo: KnowledgeRepository;
  let leadRepo: CustomerLeadRepository;
  let approvalRepo: ApprovalRepository;
  let execRepo: WorkflowExecutionRepository;
  let auditRepo: AuditRepository;

  let tenantId: string;
  let userId: string;

  beforeEach(async () => {
    db = new MemoryDatabase();
    authService = new AuthService(db);
    toolGateway = new ToolGatewayService(db);
    runtimeEngine = new AgentRuntimeEngine(db, toolGateway);
    knowledgeRepo = new KnowledgeRepository(db);
    leadRepo = new CustomerLeadRepository(db);
    approvalRepo = new ApprovalRepository(db);
    execRepo = new WorkflowExecutionRepository(db);
    auditRepo = new AuditRepository(db);

    const session = await authService.signup({
      companyName: 'Sri Balaji Agro Supplies',
      name: 'Venkatesh',
      email: 'venkatesh@balajiagro.in',
      password: 'SecurePassword2026!',
    });

    tenantId = session.tenant.id;
    userId = session.user.id;

    // Seed verified product in Knowledge Hub
    await knowledgeRepo.createDocument({
      tenant_id: tenantId,
      title: 'Organic Fertilizer Catalogue 2026',
      category: 'catalogue',
      verification_status: 'verified',
      raw_content: 'Organic Fertilizer 50kg bag is in stock. Price is INR 1200 per bag. Verified for all AP/Telangana regions.',
      metadata: {
        product_name: 'Organic Fertilizer',
        price: 1200,
        currency: 'INR',
        in_stock: true,
      },
    });
  });

  it('executes full Lead Qualification workflow until approval gate', async () => {
    const inboundMessage = 'Need 50 units delivered to Tirupati next week. Please confirm price.';
    const runResult = await runtimeEngine.processInboundLead({
      tenant_id: tenantId,
      channel: 'whatsapp',
      external_lead_id: 'lead_wa_101',
      sender_phone: '+919988776655',
      sender_name: 'Kishore',
      message_text: inboundMessage,
    });

    expect(runResult.status).toBe('AWAITING_APPROVAL');
    expect(runResult.approval_required).toBe(true);
    expect(runResult.approval_id).toBeDefined();

    // Verify extracted entity state
    const execution = await execRepo.findById(tenantId, runResult.execution.id);
    expect(execution).not.toBeNull();
    expect(execution?.status).toBe('AWAITING_APPROVAL');
    expect(execution?.extracted_data.quantity).toBe(50);
    expect(execution?.extracted_data.delivery_location).toBe('Tirupati');

    // Verify Pending Approval
    const pendingList = await approvalRepo.listPending(tenantId);
    expect(pendingList.length).toBe(1);
    expect(pendingList[0].id).toBe(runResult.approval_id);
    expect(pendingList[0].generated_content.recipient).toBe('+919988776655');
  });

  it('handles partial failure correctly (CRM succeeds, WhatsApp fails -> PARTIALLY_COMPLETED -> Retry only sends message without duplicate CRM record)', async () => {
    // 1. Process lead to AWAITING_APPROVAL
    const runResult = await runtimeEngine.processInboundLead({
      tenant_id: tenantId,
      channel: 'whatsapp',
      external_lead_id: 'lead_wa_failure_test',
      sender_phone: '+919988776655',
      sender_name: 'Kishore',
      message_text: 'Need 50 units delivered to Tirupati next week',
    });

    const executionId = runResult.execution.id;
    const approvalId = runResult.approval_id!;

    // 2. Owner Approves the action
    await approvalRepo.updateStatus(tenantId, approvalId, 'APPROVED', userId);

    // 3. Simulate WhatsApp delivery failure
    toolGateway.simulateWhatsAppFailure = true;

    const postApprovalRun = await runtimeEngine.executeApprovedWorkflow(tenantId, executionId, userId);

    // 4. Assert State is PARTIALLY_COMPLETED
    expect(postApprovalRun.status).toBe('PARTIALLY_COMPLETED');
    expect(postApprovalRun.error).toContain('WhatsApp API Error');

    // Check steps: CRM step succeeded, send_approved_message failed
    const steps = await execRepo.listStepsForExecution(tenantId, executionId);
    const crmStep = steps.find((s) => s.step_name === 'create_crm_record');
    const msgStep = steps.find((s) => s.step_name === 'send_approved_message');

    expect(crmStep?.status).toBe('COMPLETED');
    expect(msgStep?.status).toBe('FAILED');

    // Verify 1 lead in CRM
    const leadsAfterFirstAttempt = await leadRepo.listLeads(tenantId);
    expect(leadsAfterFirstAttempt.length).toBe(1);

    // 5. Recover: WhatsApp network is restored
    toolGateway.simulateWhatsAppFailure = false;

    // 6. Retry the partial failure
    const retryResult = await runtimeEngine.retryPartialFailure(tenantId, executionId);

    // 7. Assert State is now COMPLETED
    expect(retryResult.status).toBe('COMPLETED');

    // Verify WhatsApp message was sent
    expect(toolGateway.sentMessages.length).toBe(1);
    expect(toolGateway.sentMessages[0].recipient).toBe('+919988776655');

    // Verify CRM still has EXACTLY 1 lead (no duplicate created on retry)
    const leadsAfterRetry = await leadRepo.listLeads(tenantId);
    expect(leadsAfterRetry.length).toBe(1);
  });

  it('rejects unapproved message delivery attempt via security gate', async () => {
    const runResult = await runtimeEngine.processInboundLead({
      tenant_id: tenantId,
      channel: 'whatsapp',
      external_lead_id: 'lead_unapproved_1',
      message_text: 'Need 10 bags delivered to Guntur',
    });

    // Approval status is still PENDING
    await expect(
      toolGateway.send_approved_message(
        {
          tenant_id: tenantId,
          execution_id: runResult.execution.id,
          workflow_id: 'inbound-lead-followup',
        },
        'whatsapp',
        '+919876543210',
        'Hello customer'
      )
    ).rejects.toThrow(/Security Error: send_approved_message blocked/);
  });
});
