"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentUploadSchema = exports.ApprovalActionRequestSchema = exports.InboundLeadPayloadSchema = exports.LeadExtractionResultSchema = exports.ActorTypeSchema = exports.ApprovalStatusSchema = exports.WorkflowExecutionStatusSchema = exports.UserRoleSchema = void 0;
const zod_1 = require("zod");
exports.UserRoleSchema = zod_1.z.enum([
    'Owner',
    'Admin',
    'Manager',
    'Sales member',
    'Support member',
    'Viewer',
]);
exports.WorkflowExecutionStatusSchema = zod_1.z.enum([
    'RECEIVED',
    'AUTHENTICATED',
    'CLASSIFIED',
    'CONTEXT_RETRIEVED',
    'PLAN_CREATED',
    'VALIDATED',
    'AWAITING_APPROVAL',
    'EXECUTING',
    'PARTIALLY_COMPLETED',
    'COMPLETED',
    'REJECTED',
    'CANCELLED',
    'ESCALATED',
    'FAILED_RETRYABLE',
    'FAILED_PERMANENT',
    'EXPIRED',
]);
exports.ApprovalStatusSchema = zod_1.z.enum([
    'PENDING',
    'APPROVED',
    'REJECTED',
    'EDITED_APPROVED',
    'ESCALATED',
]);
exports.ActorTypeSchema = zod_1.z.enum(['agent', 'user', 'system']);
exports.LeadExtractionResultSchema = zod_1.z.object({
    name: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional(),
    product: zod_1.z.string().optional(),
    quantity: zod_1.z.number().optional(),
    delivery_location: zod_1.z.string().optional(),
    requested_time: zod_1.z.string().optional(),
    budget: zod_1.z.string().optional(),
    timeframe: zod_1.z.string().optional(),
    questions: zod_1.z.array(zod_1.z.string()).default([]),
    intent: zod_1.z
        .enum([
        'purchase_inquiry',
        'price_check',
        'support',
        'general_inquiry',
        'refund_request',
        'spam',
    ])
        .default('purchase_inquiry'),
    sentiment: zod_1.z
        .enum(['positive', 'neutral', 'urgent', 'frustrated'])
        .default('neutral'),
    missing_information: zod_1.z.array(zod_1.z.string()).default([]),
    recommended_action: zod_1.z.string().default('salesperson_followup'),
    confidence: zod_1.z.number().min(0).max(1).default(1),
});
exports.InboundLeadPayloadSchema = zod_1.z.object({
    tenant_id: zod_1.z.string().min(1),
    channel: zod_1.z.enum(['whatsapp', 'web_form', 'mock_api']),
    external_lead_id: zod_1.z.string().min(1),
    sender_phone: zod_1.z.string().optional(),
    sender_name: zod_1.z.string().optional(),
    message_text: zod_1.z.string().min(1),
    metadata: zod_1.z.record(zod_1.z.any()).default({}),
});
exports.ApprovalActionRequestSchema = zod_1.z.object({
    action: zod_1.z.enum([
        'APPROVE',
        'REJECT',
        'EDIT_AND_APPROVE',
        'REVISE',
        'ASSIGN',
        'ESCALATE',
        'PAUSE',
        'CANCEL',
    ]),
    review_notes: zod_1.z.string().optional(),
    edited_content: zod_1.z.record(zod_1.z.any()).optional(),
    assign_to: zod_1.z.string().optional(),
});
exports.DocumentUploadSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    category: zod_1.z.string().default('general'),
    verification_status: zod_1.z.enum(['verified', 'draft', 'expired']).default('verified'),
    content: zod_1.z.string().min(1),
    metadata: zod_1.z.record(zod_1.z.any()).default({}),
});
