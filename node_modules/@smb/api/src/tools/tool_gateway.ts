import { IDatabase } from '../db/database';
import {
  AuditRepository,
  KnowledgeRepository,
  CustomerLeadRepository,
  ApprovalRepository,
  UsageRepository,
} from '../repositories';
import { AIProvider, MockAIProvider } from '../ai/provider';
import { LeadExtractionResult, ProductContextItem } from '@smb/shared';
import { v4 as uuidv4 } from 'uuid';

export interface ToolExecutionContext {
  tenant_id: string;
  execution_id: string;
  workflow_id: string;
  user_id?: string;
}

export class ToolGatewayService {
  private auditRepo: AuditRepository;
  private knowledgeRepo: KnowledgeRepository;
  private leadRepo: CustomerLeadRepository;
  private approvalRepo: ApprovalRepository;
  private usageRepo: UsageRepository;
  private ai: AIProvider;

  // External mocked / live channel state
  public sentMessages: Array<{
    tenant_id: string;
    execution_id: string;
    channel: string;
    recipient: string;
    text: string;
    message_id: string;
    timestamp: string;
  }> = [];

  public scheduledReminders: Array<{
    tenant_id: string;
    execution_id: string;
    when: string;
    reminder_id: string;
  }> = [];

  // Failure simulation flag for testing Section 10 partial failure
  public simulateWhatsAppFailure = false;

  constructor(private db: IDatabase, aiProvider?: AIProvider) {
    this.auditRepo = new AuditRepository(db);
    this.knowledgeRepo = new KnowledgeRepository(db);
    this.leadRepo = new CustomerLeadRepository(db);
    this.approvalRepo = new ApprovalRepository(db);
    this.usageRepo = new UsageRepository(db);
    this.ai = aiProvider || new MockAIProvider();
  }

  /**
   * Tool 1: detect_language(text) -> language_code
   */
  async detect_language(ctx: ToolExecutionContext, text: string): Promise<string> {
    const startTime = Date.now();
    const lang = await this.ai.detectLanguage(text);
    const latency = Date.now() - startTime;

    await this.auditRepo.append({
      tenant_id: ctx.tenant_id,
      execution_id: ctx.execution_id,
      workflow_id: ctx.workflow_id,
      actor_type: 'agent',
      actor_id: 'lead_qualification_sales_agent',
      event_type: 'tool_call',
      action: 'detect_language',
      inputs: { text_length: text.length },
      outputs: { language_code: lang },
      cost_tokens: 15,
      cost_usd: 0.00003,
      latency_ms: latency,
    });

    await this.usageRepo.recordUsage({
      tenant_id: ctx.tenant_id,
      execution_id: ctx.execution_id,
      event_type: 'tool_call',
      units: 1,
      cost_usd: 0.00003,
    });

    return lang;
  }

  /**
   * Tool 2: extract_lead_fields(text) -> LeadExtractionResult
   */
  async extract_lead_fields(
    ctx: ToolExecutionContext,
    text: string,
    language = 'en'
  ): Promise<LeadExtractionResult> {
    const startTime = Date.now();
    const extracted = await this.ai.extractLeadFields(text, language);
    const latency = Date.now() - startTime;

    await this.auditRepo.append({
      tenant_id: ctx.tenant_id,
      execution_id: ctx.execution_id,
      workflow_id: ctx.workflow_id,
      actor_type: 'agent',
      actor_id: 'lead_qualification_sales_agent',
      event_type: 'tool_call',
      action: 'extract_lead_fields',
      inputs: { text_sample: text.substring(0, 100), language },
      outputs: extracted,
      cost_tokens: 120,
      cost_usd: 0.00024,
      latency_ms: latency,
    });

    await this.usageRepo.recordUsage({
      tenant_id: ctx.tenant_id,
      execution_id: ctx.execution_id,
      event_type: 'llm_tokens',
      units: 120,
      cost_usd: 0.00024,
    });

    return extracted;
  }

  /**
   * Tool 3: retrieve_product_context(query) -> { matched_products, prices, availability, source_document_id }
   */
  async retrieve_product_context(
    ctx: ToolExecutionContext,
    query: string
  ): Promise<{
    matched_products: string[];
    prices: number[];
    availability: boolean[];
    items: ProductContextItem[];
    source_document_id?: string;
  }> {
    const startTime = Date.now();
    const items = await this.knowledgeRepo.searchProductKnowledge(ctx.tenant_id, query, true);
    const latency = Date.now() - startTime;

    const matched_products = items.map((i) => i.name);
    const prices = items.map((i) => i.price);
    const availability = items.map((i) => i.in_stock);
    const source_document_id = items[0]?.source_document_id;

    await this.auditRepo.append({
      tenant_id: ctx.tenant_id,
      execution_id: ctx.execution_id,
      workflow_id: ctx.workflow_id,
      actor_type: 'agent',
      actor_id: 'lead_qualification_sales_agent',
      event_type: 'tool_call',
      action: 'retrieve_product_context',
      inputs: { query },
      outputs: { matched_products, count: items.length, source_document_id },
      latency_ms: latency,
    });

    return {
      matched_products,
      prices,
      availability,
      items,
      source_document_id,
    };
  }

  /**
   * Tool 4: draft_followup_message(lead, context) -> { draft_text, confidence }
   */
  async draft_followup_message(
    ctx: ToolExecutionContext,
    lead: LeadExtractionResult,
    context: ProductContextItem[],
    language = 'en',
    businessName = 'Our Business'
  ): Promise<{ draft_text: string; confidence: number }> {
    const startTime = Date.now();
    const drafted = await this.ai.draftFollowup({ lead, context, language, businessName });
    const latency = Date.now() - startTime;

    await this.auditRepo.append({
      tenant_id: ctx.tenant_id,
      execution_id: ctx.execution_id,
      workflow_id: ctx.workflow_id,
      actor_type: 'agent',
      actor_id: 'lead_qualification_sales_agent',
      event_type: 'tool_call',
      action: 'draft_followup_message',
      inputs: { lead_product: lead.product, language },
      outputs: drafted,
      cost_tokens: 180,
      cost_usd: 0.00036,
      latency_ms: latency,
    });

    await this.usageRepo.recordUsage({
      tenant_id: ctx.tenant_id,
      execution_id: ctx.execution_id,
      event_type: 'llm_tokens',
      units: 180,
      cost_usd: 0.00036,
    });

    return drafted;
  }

  /**
   * Tool 5: send_approved_message(execution_id, channel, recipient, text) -> { status, message_id }
   * Enforces Section 11 & Section 12 rule: ONLY callable after an APPROVED approval row exists for this execution/step.
   */
  async send_approved_message(
    ctx: ToolExecutionContext,
    channel: string,
    recipient: string,
    text: string
  ): Promise<{ status: string; message_id: string }> {
    const startTime = Date.now();

    // Strict Gate Enforcement
    const approval = await this.approvalRepo.findByExecutionId(ctx.tenant_id, ctx.execution_id);
    if (!approval || (approval.status !== 'APPROVED' && approval.status !== 'EDITED_APPROVED')) {
      const err = `Security Error: send_approved_message blocked. Execution ${ctx.execution_id} does not have an APPROVED approval row. Current approval status: ${approval ? approval.status : 'NONE'}`;
      
      await this.auditRepo.append({
        tenant_id: ctx.tenant_id,
        execution_id: ctx.execution_id,
        workflow_id: ctx.workflow_id,
        actor_type: 'system',
        event_type: 'security_block',
        action: 'send_approved_message_rejected',
        inputs: { recipient, channel },
        outputs: { error: err },
      });

      throw new Error(err);
    }

    // Simulate failure if configured (for testing partial failure recovery)
    if (this.simulateWhatsAppFailure) {
      const failMsg = 'WhatsApp API Error: Network timeout delivering message to recipient.';
      await this.auditRepo.append({
        tenant_id: ctx.tenant_id,
        execution_id: ctx.execution_id,
        workflow_id: ctx.workflow_id,
        actor_type: 'agent',
        actor_id: 'lead_qualification_sales_agent',
        event_type: 'tool_failure',
        action: 'send_approved_message',
        inputs: { recipient, channel },
        outputs: { error: failMsg },
        latency_ms: Date.now() - startTime,
      });
      throw new Error(failMsg);
    }

    const message_id = `wam_${uuidv4().substring(0, 12)}`;
    const result = {
      tenant_id: ctx.tenant_id,
      execution_id: ctx.execution_id,
      channel,
      recipient,
      text,
      message_id,
      timestamp: new Date().toISOString(),
    };

    this.sentMessages.push(result);
    const latency = Date.now() - startTime;

    await this.auditRepo.append({
      tenant_id: ctx.tenant_id,
      execution_id: ctx.execution_id,
      workflow_id: ctx.workflow_id,
      actor_type: 'agent',
      actor_id: 'lead_qualification_sales_agent',
      event_type: 'tool_call',
      action: 'send_approved_message',
      inputs: { channel, recipient, text_length: text.length },
      outputs: { status: 'delivered', message_id },
      latency_ms: latency,
    });

    await this.usageRepo.recordUsage({
      tenant_id: ctx.tenant_id,
      execution_id: ctx.execution_id,
      event_type: 'whatsapp_message',
      units: 1,
      cost_usd: 0.005,
    });

    return { status: 'delivered', message_id };
  }

  /**
   * Tool 6: create_crm_record(lead) -> { record_id }
   * Idempotent on tenant_id + external_lead_id
   */
  async create_crm_record(
    ctx: ToolExecutionContext,
    leadData: {
      external_lead_id: string;
      contact_name?: string;
      phone?: string;
      product_requested?: string;
      quantity?: number;
      delivery_location?: string;
      budget?: string;
      qualification_score?: number;
      extracted_fields?: any;
    }
  ): Promise<{ record_id: string; is_duplicate: boolean }> {
    const startTime = Date.now();

    let customerId: string | undefined;
    if (leadData.phone) {
      const customer = await this.leadRepo.upsertCustomer(
        ctx.tenant_id,
        leadData.phone,
        leadData.contact_name,
        leadData.delivery_location
      );
      customerId = customer.id;
    }

    const existing = await this.leadRepo.findByExternalId(ctx.tenant_id, leadData.external_lead_id);
    const is_duplicate = Boolean(existing);

    const leadRecord = await this.leadRepo.createLead({
      tenant_id: ctx.tenant_id,
      customer_id: customerId,
      external_lead_id: leadData.external_lead_id,
      channel: 'whatsapp',
      contact_name: leadData.contact_name,
      phone: leadData.phone,
      product_requested: leadData.product_requested,
      quantity: leadData.quantity,
      delivery_location: leadData.delivery_location,
      budget: leadData.budget,
      status: 'qualified',
      qualification_score: leadData.qualification_score || 0.9,
      extracted_fields: leadData.extracted_fields,
    });

    const latency = Date.now() - startTime;

    await this.auditRepo.append({
      tenant_id: ctx.tenant_id,
      execution_id: ctx.execution_id,
      workflow_id: ctx.workflow_id,
      actor_type: 'agent',
      actor_id: 'lead_qualification_sales_agent',
      event_type: 'tool_call',
      action: 'create_crm_record',
      inputs: { external_lead_id: leadData.external_lead_id, phone: leadData.phone },
      outputs: { record_id: leadRecord.id, is_duplicate },
      latency_ms: latency,
    });

    return { record_id: leadRecord.id, is_duplicate };
  }

  /**
   * Tool 7: schedule_reminder(execution_id, when) -> { reminder_id }
   */
  async schedule_reminder(
    ctx: ToolExecutionContext,
    when: string
  ): Promise<{ reminder_id: string; scheduled_for: string }> {
    const startTime = Date.now();
    const reminder_id = `rem_${uuidv4().substring(0, 8)}`;

    this.scheduledReminders.push({
      tenant_id: ctx.tenant_id,
      execution_id: ctx.execution_id,
      when,
      reminder_id,
    });

    const latency = Date.now() - startTime;

    await this.auditRepo.append({
      tenant_id: ctx.tenant_id,
      execution_id: ctx.execution_id,
      workflow_id: ctx.workflow_id,
      actor_type: 'agent',
      actor_id: 'lead_qualification_sales_agent',
      event_type: 'tool_call',
      action: 'schedule_reminder',
      inputs: { when },
      outputs: { reminder_id, scheduled_for: when },
      latency_ms: latency,
    });

    return { reminder_id, scheduled_for: when };
  }
}
