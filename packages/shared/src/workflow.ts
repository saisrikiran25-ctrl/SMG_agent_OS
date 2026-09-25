import { z } from 'zod';

export const WorkflowDefinitionSchema = z.object({
  id: z.string().default('inbound-lead-followup'),
  name: z.string(),
  version: z.string().default('1.0.0'),
  description: z.string(),
  trigger: z.string(),
  steps: z.array(z.string()),
  approval_required_for: z.array(z.string()),
  escalate_when: z.array(z.string()),
  retry_policy: z
    .object({
      max_retries: z.number().default(3),
      backoff_seconds: z.number().default(5),
    })
    .default({ max_retries: 3, backoff_seconds: 5 }),
});

export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;

export const INBOUND_LEAD_WORKFLOW_DEFINITION: WorkflowDefinition = {
  id: 'inbound-lead-followup',
  name: 'Inbound Lead Follow-up',
  version: '1.0.0',
  description:
    'Processes new inbound WhatsApp or form leads, extracts structured entities, grounds against verified knowledge, requests owner approval, and updates CRM.',
  trigger: 'whatsapp_message_received',
  steps: [
    'detect_language',
    'extract_lead_fields',
    'classify_intent',
    'score_lead',
    'retrieve_product_context',
    'draft_followup',
    'request_owner_approval',
    'send_message',
    'create_crm_record',
    'schedule_reminder',
  ],
  approval_required_for: ['send_external_message'],
  escalate_when: [
    'confidence < 0.75',
    'customer_requests_refund',
    'pricing_exception_detected',
  ],
  retry_policy: {
    max_retries: 3,
    backoff_seconds: 5,
  },
};
