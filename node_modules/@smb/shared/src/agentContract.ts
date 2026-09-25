import { z } from 'zod';

export const AgentContractSchema = z.object({
  agent: z.string(),
  version: z.string().default('1.0.0'),
  purpose: z.string(),
  input_types: z.array(z.string()),
  knowledge_sources: z.array(z.string()),
  allowed_tools: z.array(z.string()),
  prohibited_actions: z.array(z.string()),
  approval_required_for: z.array(z.string()),
  escalation_rules: z.object({
    confidence_threshold: z.number().default(0.75),
    trigger_conditions: z.array(z.string()),
  }),
  evaluation_tests: z.array(z.string()),
  cost_limits: z.object({
    max_tokens_per_run: z.number(),
    max_tool_calls_per_run: z.number(),
  }),
  success_metrics: z.array(z.string()),
});

export type AgentContract = z.infer<typeof AgentContractSchema>;

export const LEAD_QUALIFICATION_AGENT_CONTRACT: AgentContract = {
  agent: 'lead_qualification_sales_agent',
  version: '1.0.0',
  purpose:
    'Capture, extract, score, and draft a follow-up for inbound leads, then hand off to the owner for approval before any customer-facing action.',
  input_types: ['whatsapp_message', 'web_form_submission'],
  knowledge_sources: ['product_catalogue', 'price_list', 'service_descriptions', 'basic_faqs'],
  allowed_tools: [
    'detect_language',
    'extract_lead_fields',
    'retrieve_product_context',
    'draft_followup_message',
    'send_approved_message',
    'create_crm_record',
    'schedule_reminder',
  ],
  prohibited_actions: [
    'send_external_message_without_approval',
    'promise_unverified_availability_or_price',
    'access_hr_or_payroll_data',
    'access_other_customers_records',
  ],
  approval_required_for: ['send_external_message', 'create_customer_record'],
  escalation_rules: {
    confidence_threshold: 0.75,
    trigger_conditions: [
      'confidence < 0.75',
      'customer_requests_refund',
      'pricing_exception_detected',
      'adversarial_prompt_injection_detected',
    ],
  },
  evaluation_tests: [
    'intent_extraction',
    'lead_scoring',
    'multilingual_input',
    'adversarial_input',
  ],
  cost_limits: {
    max_tokens_per_run: 4000,
    max_tool_calls_per_run: 10,
  },
  success_metrics: [
    'lead_response_time',
    'qualification_accuracy',
    'salesperson_acceptance_rate',
    'conversion_rate',
  ],
};
