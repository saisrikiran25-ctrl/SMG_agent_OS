"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INBOUND_LEAD_WORKFLOW_DEFINITION = exports.WorkflowDefinitionSchema = void 0;
const zod_1 = require("zod");
exports.WorkflowDefinitionSchema = zod_1.z.object({
    id: zod_1.z.string().default('inbound-lead-followup'),
    name: zod_1.z.string(),
    version: zod_1.z.string().default('1.0.0'),
    description: zod_1.z.string(),
    trigger: zod_1.z.string(),
    steps: zod_1.z.array(zod_1.z.string()),
    approval_required_for: zod_1.z.array(zod_1.z.string()),
    escalate_when: zod_1.z.array(zod_1.z.string()),
    retry_policy: zod_1.z
        .object({
        max_retries: zod_1.z.number().default(3),
        backoff_seconds: zod_1.z.number().default(5),
    })
        .default({ max_retries: 3, backoff_seconds: 5 }),
});
exports.INBOUND_LEAD_WORKFLOW_DEFINITION = {
    id: 'inbound-lead-followup',
    name: 'Inbound Lead Follow-up',
    version: '1.0.0',
    description: 'Processes new inbound WhatsApp or form leads, extracts structured entities, grounds against verified knowledge, requests owner approval, and updates CRM.',
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
