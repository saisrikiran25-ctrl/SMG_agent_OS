import { describe, it, expect } from 'vitest';
import {
  LEAD_QUALIFICATION_AGENT_CONTRACT,
  INBOUND_LEAD_WORKFLOW_DEFINITION,
  AgentContractSchema,
  WorkflowDefinitionSchema,
} from '../index';

describe('Shared Contract & Schema Validations', () => {
  it('validates Lead Qualification Agent Contract against schema', () => {
    const parsed = AgentContractSchema.parse(LEAD_QUALIFICATION_AGENT_CONTRACT);
    expect(parsed.agent).toBe('lead_qualification_sales_agent');
    expect(parsed.allowed_tools).toContain('send_approved_message');
    expect(parsed.allowed_tools).toContain('create_crm_record');
  });

  it('validates Inbound Lead Workflow Definition against schema', () => {
    const parsed = WorkflowDefinitionSchema.parse(INBOUND_LEAD_WORKFLOW_DEFINITION);
    expect(parsed.id).toBe('inbound-lead-followup');
    expect(parsed.steps).toContain('request_owner_approval');
    expect(parsed.approval_required_for).toContain('send_external_message');
  });
});
