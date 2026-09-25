import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryDatabase } from '../db/database';
import { AuthService } from '../services/auth.service';
import {
  UserRepository,
  WorkspaceRepository,
  WorkflowExecutionRepository,
  ApprovalRepository,
  KnowledgeRepository,
  CustomerLeadRepository,
  AuditRepository,
} from '../repositories';

describe('Cross-Tenant Isolation & Security Suite (Section 13)', () => {
  let db: MemoryDatabase;
  let authService: AuthService;
  let userRepo: UserRepository;
  let workspaceRepo: WorkspaceRepository;
  let execRepo: WorkflowExecutionRepository;
  let approvalRepo: ApprovalRepository;
  let knowledgeRepo: KnowledgeRepository;
  let leadRepo: CustomerLeadRepository;
  let auditRepo: AuditRepository;

  let tenantA: { id: string; name: string };
  let tenantB: { id: string; name: string };
  let sessionA: any;
  let sessionB: any;

  beforeEach(async () => {
    db = new MemoryDatabase();
    authService = new AuthService(db);
    userRepo = new UserRepository(db);
    workspaceRepo = new WorkspaceRepository(db);
    execRepo = new WorkflowExecutionRepository(db);
    approvalRepo = new ApprovalRepository(db);
    knowledgeRepo = new KnowledgeRepository(db);
    leadRepo = new CustomerLeadRepository(db);
    auditRepo = new AuditRepository(db);

    // Provision Tenant A
    sessionA = await authService.signup({
      companyName: 'Kirana Store A (Hyderabad)',
      name: 'Ravi Kumar',
      email: 'ravi@kirana-a.com',
      password: 'Password123!',
    });
    tenantA = sessionA.tenant;

    // Provision Tenant B
    sessionB = await authService.signup({
      companyName: 'Wholesale Depot B (Bengaluru)',
      name: 'Anand Rao',
      email: 'anand@depot-b.com',
      password: 'Password456!',
    });
    tenantB = sessionB.tenant;
  });

  it('prohibits queries without a valid tenant_id', async () => {
    expect(() => (userRepo as any).assertTenant('')).toThrow(/Security Error: Tenant ID is required/);
    expect(() => (knowledgeRepo as any).assertTenant(undefined)).toThrow(/Security Error: Tenant ID is required/);
  });

  it('prevents Tenant A from listing or reading Tenant B users', async () => {
    const usersA = await userRepo.listByTenant(tenantA.id);
    const usersB = await userRepo.listByTenant(tenantB.id);

    expect(usersA.length).toBe(1);
    expect(usersA[0].email).toBe('ravi@kirana-a.com');

    expect(usersB.length).toBe(1);
    expect(usersB[0].email).toBe('anand@depot-b.com');

    // Tenant A attempts to fetch Tenant B user with Tenant A's tenant_id
    const crossFetch = await userRepo.findById(tenantA.id, sessionB.user.id);
    expect(crossFetch).toBeNull();
  });

  it('prevents Tenant A from reading Tenant B workflow executions & steps', async () => {
    // Create execution for Tenant B
    const execB = await execRepo.create({
      tenant_id: tenantB.id,
      workflow_id: 'inbound-lead-followup',
      status: 'RECEIVED',
      idempotency_key: 'lead_msg_9999',
      trigger_channel: 'whatsapp',
      input_payload: { text: 'Confidential order details for Depot B' },
    });

    // Tenant A queries executions
    const execsA = await execRepo.list(tenantA.id);
    expect(execsA.find((e) => e.id === execB.id)).toBeUndefined();

    // Direct lookup by Tenant A for Tenant B's execution ID returns null
    const directLookup = await execRepo.findById(tenantA.id, execB.id);
    expect(directLookup).toBeNull();
  });

  it('prevents Tenant A from reading or acting on Tenant B approvals', async () => {
    const execB = await execRepo.create({
      tenant_id: tenantB.id,
      workflow_id: 'inbound-lead-followup',
      status: 'AWAITING_APPROVAL',
      idempotency_key: 'idemp_appr_1',
      trigger_channel: 'whatsapp',
      input_payload: {},
    });

    const apprB = await approvalRepo.create({
      tenant_id: tenantB.id,
      execution_id: execB.id,
      workflow_id: 'inbound-lead-followup',
      step_name: 'send_message',
      action_description: 'Send quotation discount 15%',
      reason: 'VIP buyer',
      data_used: { customer_tier: 'gold' },
      generated_content: { message: 'We offer you 15% off' },
      tool_to_call: 'send_approved_message',
    });

    // Tenant A checks pending approvals
    const approvalsA = await approvalRepo.listPending(tenantA.id);
    expect(approvalsA.find((a) => a.id === apprB.id)).toBeUndefined();

    // Tenant A attempts to approve Tenant B approval using Tenant A context
    await expect(
      approvalRepo.updateStatus(tenantA.id, apprB.id, 'APPROVED', sessionA.user.id)
    ).rejects.toThrow();
  });

  it('prevents Tenant A from searching or retrieving Tenant B knowledge base documents (Vector / RAG isolation)', async () => {
    // Tenant B uploads confidential pricing
    await knowledgeRepo.createDocument({
      tenant_id: tenantB.id,
      title: 'Secret Wholesale Price Sheet 2026',
      category: 'price_list',
      verification_status: 'verified',
      raw_content: 'Basmati Rice Premium 25kg bag wholesale price INR 1800. Secret promo code: WHOLESALE50',
      metadata: { product_name: 'Basmati Rice Premium 25kg', price: 1800 },
    });

    // Tenant A uploads regular catalogue
    await knowledgeRepo.createDocument({
      tenant_id: tenantA.id,
      title: 'Kirana Retail Price List',
      category: 'price_list',
      verification_status: 'verified',
      raw_content: 'Basmati Rice 1kg retail INR 95. Sona Masoori 1kg retail INR 60.',
      metadata: { product_name: 'Basmati Rice 1kg', price: 95 },
    });

    // Tenant A searches for 'Basmati Rice'
    const resultsA = await knowledgeRepo.searchProductKnowledge(tenantA.id, 'Basmati Rice');
    expect(resultsA.length).toBe(1);
    expect(resultsA[0].name).toBe('Basmati Rice 1kg');
    expect(resultsA[0].price).toBe(95);

    // Ensure Tenant B's confidential wholesale pricing is completely excluded
    expect(resultsA.find((r) => r.description.includes('Secret promo code'))).toBeUndefined();
  });

  it('prevents Tenant A from accessing Tenant B customer and lead records', async () => {
    const leadB = await leadRepo.createLead({
      tenant_id: tenantB.id,
      external_lead_id: 'wa_lead_555',
      channel: 'whatsapp',
      contact_name: 'Secret Client',
      phone: '+919876543210',
      product_requested: 'Heavy Machinery Part',
      budget: '500000',
    });

    // Tenant A lists leads
    const leadsA = await leadRepo.listLeads(tenantA.id);
    expect(leadsA.find((l) => l.id === leadB.id)).toBeUndefined();

    // Tenant A queries by external_lead_id
    const fetchedByA = await leadRepo.findByExternalId(tenantA.id, 'wa_lead_555');
    expect(fetchedByA).toBeNull();
  });

  it('prevents Tenant A from querying Tenant B audit event traces', async () => {
    await auditRepo.append({
      tenant_id: tenantB.id,
      actor_type: 'agent',
      event_type: 'tool_call',
      action: 'extract_lead_fields',
      inputs: { sensitive: 'Depot B internal data' },
    });

    const tracesA = await auditRepo.listRecent(tenantA.id);
    expect(tracesA.length).toBe(0);

    const tracesB = await auditRepo.listRecent(tenantB.id);
    expect(tracesB.length).toBe(1);
  });
});
