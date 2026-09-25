"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEAD_QUALIFICATION_AGENT_CONTRACT = exports.AgentContractSchema = void 0;
const zod_1 = require("zod");
exports.AgentContractSchema = zod_1.z.object({
    agent: zod_1.z.string(),
    version: zod_1.z.string().default('1.0.0'),
    purpose: zod_1.z.string(),
    input_types: zod_1.z.array(zod_1.z.string()),
    knowledge_sources: zod_1.z.array(zod_1.z.string()),
    allowed_tools: zod_1.z.array(zod_1.z.string()),
    prohibited_actions: zod_1.z.array(zod_1.z.string()),
    approval_required_for: zod_1.z.array(zod_1.z.string()),
    escalation_rules: zod_1.z.object({
        confidence_threshold: zod_1.z.number().default(0.75),
        trigger_conditions: zod_1.z.array(zod_1.z.string()),
    }),
    evaluation_tests: zod_1.z.array(zod_1.z.string()),
    cost_limits: zod_1.z.object({
        max_tokens_per_run: zod_1.z.number(),
        max_tool_calls_per_run: zod_1.z.number(),
    }),
    success_metrics: zod_1.z.array(zod_1.z.string()),
});
exports.LEAD_QUALIFICATION_AGENT_CONTRACT = {
    agent: 'lead_qualification_sales_agent',
    version: '1.0.0',
    purpose: 'Capture, extract, score, and draft a follow-up for inbound leads, then hand off to the owner for approval before any customer-facing action.',
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
