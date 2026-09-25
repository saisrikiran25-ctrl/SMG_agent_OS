import { z } from 'zod';

export const UserRoleSchema = z.enum([
  'Owner',
  'Admin',
  'Manager',
  'Sales member',
  'Support member',
  'Viewer',
]);

export const WorkflowExecutionStatusSchema = z.enum([
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

export const ApprovalStatusSchema = z.enum([
  'PENDING',
  'APPROVED',
  'REJECTED',
  'EDITED_APPROVED',
  'ESCALATED',
]);

export const ActorTypeSchema = z.enum(['agent', 'user', 'system']);

export const LeadExtractionResultSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  product: z.string().optional(),
  quantity: z.number().optional(),
  delivery_location: z.string().optional(),
  requested_time: z.string().optional(),
  budget: z.string().optional(),
  timeframe: z.string().optional(),
  questions: z.array(z.string()).default([]),
  intent: z
    .enum([
      'purchase_inquiry',
      'price_check',
      'support',
      'general_inquiry',
      'refund_request',
      'spam',
    ])
    .default('purchase_inquiry'),
  sentiment: z
    .enum(['positive', 'neutral', 'urgent', 'frustrated'])
    .default('neutral'),
  missing_information: z.array(z.string()).default([]),
  recommended_action: z.string().default('salesperson_followup'),
  confidence: z.number().min(0).max(1).default(1),
});

export const InboundLeadPayloadSchema = z.object({
  tenant_id: z.string().min(1),
  channel: z.enum(['whatsapp', 'web_form', 'mock_api']),
  external_lead_id: z.string().min(1),
  sender_phone: z.string().optional(),
  sender_name: z.string().optional(),
  message_text: z.string().min(1),
  metadata: z.record(z.any()).default({}),
});

export const ApprovalActionRequestSchema = z.object({
  action: z.enum([
    'APPROVE',
    'REJECT',
    'EDIT_AND_APPROVE',
    'REVISE',
    'ASSIGN',
    'ESCALATE',
    'PAUSE',
    'CANCEL',
  ]),
  review_notes: z.string().optional(),
  edited_content: z.record(z.any()).optional(),
  assign_to: z.string().optional(),
});

export const DocumentUploadSchema = z.object({
  title: z.string().min(1),
  category: z.string().default('general'),
  verification_status: z.enum(['verified', 'draft', 'expired']).default('verified'),
  content: z.string().min(1),
  metadata: z.record(z.any()).default({}),
});
