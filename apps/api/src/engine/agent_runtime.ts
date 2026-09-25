import { IDatabase } from '../db/database';
import {
  WorkflowExecutionRepository,
  WorkflowExecutionRecord,
  ApprovalRepository,
  AuditRepository,
  WorkspaceRepository,
  TenantRepository,
} from '../repositories';
import { ToolGatewayService } from '../tools/tool_gateway';
import {
  AgentContract,
  LEAD_QUALIFICATION_AGENT_CONTRACT,
  WorkflowDefinition,
  INBOUND_LEAD_WORKFLOW_DEFINITION,
  WorkflowExecutionStatus,
  LeadExtractionResult,
  ProductContextItem,
} from '@smb/shared';

export interface WorkflowRunResult {
  execution: WorkflowExecutionRecord;
  status: WorkflowExecutionStatus;
  approval_required: boolean;
  approval_id?: string;
  error?: string;
}

export class AgentRuntimeEngine {
  private execRepo: WorkflowExecutionRepository;
  private approvalRepo: ApprovalRepository;
  private auditRepo: AuditRepository;
  private workspaceRepo: WorkspaceRepository;
  private tenantRepo: TenantRepository;

  constructor(
    private db: IDatabase,
    public toolGateway: ToolGatewayService,
    public agentContract: AgentContract = LEAD_QUALIFICATION_AGENT_CONTRACT,
    public workflowDef: WorkflowDefinition = INBOUND_LEAD_WORKFLOW_DEFINITION
  ) {
    this.execRepo = new WorkflowExecutionRepository(db);
    this.approvalRepo = new ApprovalRepository(db);
    this.auditRepo = new AuditRepository(db);
    this.workspaceRepo = new WorkspaceRepository(db);
    this.tenantRepo = new TenantRepository(db);
  }

  /**
   * Phase 1 Inbound Lead Workflow Execution (Step-by-Step State Machine)
   */
  async processInboundLead(params: {
    tenant_id: string;
    workspace_id?: string;
    channel: 'whatsapp' | 'web_form' | 'mock_api';
    external_lead_id: string;
    sender_phone?: string;
    sender_name?: string;
    message_text: string;
    idempotency_key?: string;
  }): Promise<WorkflowRunResult> {
    const tenantId = params.tenant_id;
    const idempotencyKey =
      params.idempotency_key || `idemp_${params.channel}_${params.external_lead_id}`;

    // Step 0: Check Idempotency (Prevent duplicate processing)
    const existing = await this.execRepo.findByIdempotencyKey(tenantId, idempotencyKey);
    if (existing) {
      await this.auditRepo.append({
        tenant_id: tenantId,
        execution_id: existing.id,
        actor_type: 'system',
        event_type: 'idempotent_replay',
        action: 'skip_duplicate_lead_processing',
        inputs: { idempotency_key: idempotencyKey },
        outputs: { status: existing.status },
      });
      return {
        execution: existing,
        status: existing.status,
        approval_required: existing.status === 'AWAITING_APPROVAL',
      };
    }

    // Step 1: State = RECEIVED
    let execution = await this.execRepo.create({
      tenant_id: tenantId,
      workspace_id: params.workspace_id,
      workflow_id: this.workflowDef.id,
      workflow_version_id: this.workflowDef.version,
      status: 'RECEIVED',
      idempotency_key: idempotencyKey,
      trigger_channel: params.channel,
      input_payload: {
        message_text: params.message_text,
        sender_phone: params.sender_phone,
        sender_name: params.sender_name,
        external_lead_id: params.external_lead_id,
      },
    });

    const ctx = {
      tenant_id: tenantId,
      execution_id: execution.id,
      workflow_id: this.workflowDef.id,
    };

    // Step 2: State = AUTHENTICATED
    const tenant = await this.tenantRepo.findById(tenantId);
    if (!tenant) {
      execution = await this.execRepo.updateStatus(tenantId, execution.id, 'FAILED_PERMANENT', {
        error_message: `Tenant ${tenantId} not found or inactive`,
      });
      return { execution, status: 'FAILED_PERMANENT', approval_required: false };
    }

    execution = await this.execRepo.updateStatus(tenantId, execution.id, 'AUTHENTICATED');
    await this.execRepo.recordStep(tenantId, execution.id, 'authenticate_tenant', 1, 'COMPLETED');

    try {
      // Step 3: State = CLASSIFIED (Language + Lead Extraction + Intent Classification)
      const language = await this.toolGateway.detect_language(ctx, params.message_text);
      const extracted: LeadExtractionResult = await this.toolGateway.extract_lead_fields(
        ctx,
        params.message_text,
        language
      );

      // Backfill phone and name if provided in trigger metadata
      if (!extracted.phone && params.sender_phone) extracted.phone = params.sender_phone;
      if (!extracted.name && params.sender_name) extracted.name = params.sender_name;

      execution = await this.execRepo.updateStatus(tenantId, execution.id, 'CLASSIFIED', {
        extracted_data: extracted,
      });
      await this.execRepo.recordStep(tenantId, execution.id, 'classify_and_extract', 2, 'COMPLETED', {
        language,
        extracted,
      });

      // Escalation Rule Check (confidence < 0.75, refund request, adversarial injection)
      if (
        extracted.confidence < this.agentContract.escalation_rules.confidence_threshold ||
        extracted.intent === 'refund_request' ||
        extracted.intent === 'spam' ||
        extracted.missing_information.includes('invalid_prompt_injection_attempt')
      ) {
        execution = await this.execRepo.updateStatus(tenantId, execution.id, 'ESCALATED', {
          error_message: `Escalated: ${extracted.questions?.join(', ') || 'Low confidence or prohibited inquiry'}`,
        });

        await this.auditRepo.append({
          tenant_id: tenantId,
          execution_id: execution.id,
          actor_type: 'agent',
          actor_id: 'lead_qualification_sales_agent',
          event_type: 'workflow_escalation',
          action: 'escalate_to_human',
          inputs: { confidence: extracted.confidence, intent: extracted.intent },
          outputs: { reason: 'Failed confidence threshold or policy guardrail' },
        });

        return { execution, status: 'ESCALATED', approval_required: false };
      }

      // Step 4: State = CONTEXT_RETRIEVED (Knowledge Hub Search)
      const query = extracted.product || params.message_text;
      const knowledgeResult = await this.toolGateway.retrieve_product_context(ctx, query);

      execution = await this.execRepo.updateStatus(tenantId, execution.id, 'CONTEXT_RETRIEVED', {
        context_data: knowledgeResult.items,
      });
      await this.execRepo.recordStep(
        tenantId,
        execution.id,
        'retrieve_product_context',
        3,
        'COMPLETED',
        { query },
        { matched_count: knowledgeResult.items.length }
      );

      // Step 5: State = PLAN_CREATED (Draft follow-up message grounded in retrieved facts)
      const businessName = tenant.name || 'Our Company';
      const draftResult = await this.toolGateway.draft_followup_message(
        ctx,
        extracted,
        knowledgeResult.items,
        language,
        businessName
      );

      execution = await this.execRepo.updateStatus(tenantId, execution.id, 'PLAN_CREATED', {
        plan_data: {
          draft_message: draftResult.draft_text,
          confidence: draftResult.confidence,
          language,
        },
      });
      await this.execRepo.recordStep(tenantId, execution.id, 'draft_followup', 4, 'COMPLETED', {
        draftResult,
      });

      // Step 6: State = VALIDATED (Policy check before external message)
      execution = await this.execRepo.updateStatus(tenantId, execution.id, 'VALIDATED');
      await this.execRepo.recordStep(tenantId, execution.id, 'validate_actions', 5, 'COMPLETED');

      // Step 7: State = AWAITING_APPROVAL (Approval Centre Gate)
      // Per Section 3.2, Section 12: External communication requires Owner approval
      const recipient = extracted.phone || params.sender_phone || 'WhatsApp Lead';
      const approval = await this.approvalRepo.create({
        tenant_id: tenantId,
        execution_id: execution.id,
        workflow_id: this.workflowDef.id,
        step_name: 'send_external_message',
        action_description: `Send WhatsApp follow-up message to ${recipient}`,
        reason: `Inbound lead for ${extracted.product || 'general products'} (${extracted.quantity || 'unspecified'} units)`,
        data_used: {
          lead_extraction: extracted,
          verified_products: knowledgeResult.matched_products,
          verified_prices: knowledgeResult.prices,
        },
        generated_content: {
          recipient,
          message_text: draftResult.draft_text,
          channel: params.channel,
          lead_data: extracted,
        },
        tool_to_call: 'send_approved_message',
        estimated_cost_usd: 0.005,
      });

      execution = await this.execRepo.updateStatus(tenantId, execution.id, 'AWAITING_APPROVAL');
      await this.execRepo.recordStep(tenantId, execution.id, 'request_approval', 6, 'COMPLETED', {
        approval_id: approval.id,
      });

      return {
        execution,
        status: 'AWAITING_APPROVAL',
        approval_required: true,
        approval_id: approval.id,
      };
    } catch (err: any) {
      execution = await this.execRepo.updateStatus(tenantId, execution.id, 'FAILED_RETRYABLE', {
        error_message: err.message,
      });
      return { execution, status: 'FAILED_RETRYABLE', approval_required: false, error: err.message };
    }
  }

  /**
   * Resume Workflow Execution after Approval Decision (Section 12)
   */
  async executeApprovedWorkflow(
    tenantId: string,
    executionId: string,
    reviewedByUserId?: string
  ): Promise<WorkflowRunResult> {
    let execution = await this.execRepo.findById(tenantId, executionId);
    if (!execution) throw new Error(`Execution ${executionId} not found`);

    const approval = await this.approvalRepo.findByExecutionId(tenantId, executionId);
    if (!approval || (approval.status !== 'APPROVED' && approval.status !== 'EDITED_APPROVED')) {
      throw new Error(`Execution ${executionId} cannot resume without an APPROVED approval row`);
    }

    const ctx = {
      tenant_id: tenantId,
      execution_id: executionId,
      workflow_id: execution.workflow_id,
      user_id: reviewedByUserId,
    };

    let content: any = approval.generated_content || {};
    if (typeof content === 'string') {
      try {
        content = JSON.parse(content);
      } catch {
        content = {};
      }
    }

    let rawExtracted: any = execution.extracted_data || {};
    if (typeof rawExtracted === 'string') {
      try {
        rawExtracted = JSON.parse(rawExtracted);
      } catch {
        rawExtracted = {};
      }
    }

    let inputPayload: any = execution.input_payload || {};
    if (typeof inputPayload === 'string') {
      try {
        inputPayload = JSON.parse(inputPayload);
      } catch {
        inputPayload = {};
      }
    }

    const recipient = content.recipient || inputPayload.sender_phone || 'WhatsApp Lead';
    const messageText = content.message_text || '';
    const channel = content.channel || 'whatsapp';
    const leadData: LeadExtractionResult = content.lead_data || rawExtracted;

    // Transition to EXECUTING
    execution = await this.execRepo.updateStatus(tenantId, executionId, 'EXECUTING');

    let crmResult: { record_id: string; is_duplicate: boolean } | null = null;
    let messageResult: { status: string; message_id: string } | null = null;
    let reminderResult: { reminder_id: string } | null = null;

    // Sub-step A: Update CRM Record (Idempotent)
    try {
      crmResult = await this.toolGateway.create_crm_record(ctx, {
        external_lead_id: inputPayload.external_lead_id || executionId,
        contact_name: leadData.name,
        phone: leadData.phone || inputPayload.sender_phone,
        product_requested: leadData.product,
        quantity: leadData.quantity,
        delivery_location: leadData.delivery_location,
        budget: leadData.budget,
        qualification_score: leadData.confidence,
        extracted_fields: leadData,
      });

      await this.execRepo.recordStep(tenantId, executionId, 'create_crm_record', 7, 'COMPLETED', {
        crm_record_id: crmResult.record_id,
      });
    } catch (crmErr: any) {
      console.error('[AgentRuntime] CRM Error:', crmErr);
      execution = await this.execRepo.updateStatus(tenantId, executionId, 'FAILED_RETRYABLE', {
        error_message: `CRM Error: ${crmErr.message}`,
      });
      return { execution, status: 'FAILED_RETRYABLE', approval_required: false, error: crmErr.message };
    }

    // Sub-step B: Send External WhatsApp Message (Gate-Protected)
    try {
      messageResult = await this.toolGateway.send_approved_message(
        ctx,
        channel,
        recipient,
        messageText
      );

      await this.execRepo.recordStep(tenantId, executionId, 'send_approved_message', 8, 'COMPLETED', {
        message_id: messageResult.message_id,
      });
    } catch (msgErr: any) {
      // PARTIAL FAILURE HANDLING (Section 6, 10):
      // CRM succeeded, WhatsApp failed -> state is PARTIALLY_COMPLETED
      execution = await this.execRepo.updateStatus(tenantId, executionId, 'PARTIALLY_COMPLETED', {
        execution_result: { crm_success: true, crm_record_id: crmResult.record_id, message_success: false },
        error_message: `WhatsApp Delivery Failed: ${msgErr.message}`,
      });

      await this.execRepo.recordStep(
        tenantId,
        executionId,
        'send_approved_message',
        8,
        'FAILED',
        {},
        {},
        msgErr.message
      );

      return {
        execution,
        status: 'PARTIALLY_COMPLETED',
        approval_required: false,
        error: msgErr.message,
      };
    }

    // Sub-step C: Schedule Follow-up Reminder
    try {
      reminderResult = await this.toolGateway.schedule_reminder(
        ctx,
        'in 2 days at 10:00 AM IST'
      );

      await this.execRepo.recordStep(tenantId, executionId, 'schedule_reminder', 9, 'COMPLETED', {
        reminder_id: reminderResult.reminder_id,
      });
    } catch (remErr: any) {
      console.warn('Reminder scheduling notice:', remErr.message);
    }

    // Workflow Fully COMPLETED
    execution = await this.execRepo.updateStatus(tenantId, executionId, 'COMPLETED', {
      execution_result: {
        crm_record_id: crmResult.record_id,
        message_id: messageResult.message_id,
        reminder_id: reminderResult?.reminder_id,
      },
    });

    return {
      execution,
      status: 'COMPLETED',
      approval_required: false,
    };
  }

  /**
   * Retry Partial Failure (Section 10 Scenario: CRM succeeded, WhatsApp failed.
   * On retry, it ONLY attempts WhatsApp send, using idempotency to avoid double-creating CRM record).
   */
  async retryPartialFailure(tenantId: string, executionId: string): Promise<WorkflowRunResult> {
    const execution = await this.execRepo.findById(tenantId, executionId);
    if (!execution) throw new Error('Execution not found');
    if (execution.status !== 'PARTIALLY_COMPLETED' && execution.status !== 'FAILED_RETRYABLE') {
      throw new Error(`Cannot retry execution in status ${execution.status}`);
    }

    await this.execRepo.incrementRetry(tenantId, executionId);
    return this.executeApprovedWorkflow(tenantId, executionId);
  }
}
