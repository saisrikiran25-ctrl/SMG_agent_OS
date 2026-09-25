import { z } from 'zod';
export declare const UserRoleSchema: z.ZodEnum<["Owner", "Admin", "Manager", "Sales member", "Support member", "Viewer"]>;
export declare const WorkflowExecutionStatusSchema: z.ZodEnum<["RECEIVED", "AUTHENTICATED", "CLASSIFIED", "CONTEXT_RETRIEVED", "PLAN_CREATED", "VALIDATED", "AWAITING_APPROVAL", "EXECUTING", "PARTIALLY_COMPLETED", "COMPLETED", "REJECTED", "CANCELLED", "ESCALATED", "FAILED_RETRYABLE", "FAILED_PERMANENT", "EXPIRED"]>;
export declare const ApprovalStatusSchema: z.ZodEnum<["PENDING", "APPROVED", "REJECTED", "EDITED_APPROVED", "ESCALATED"]>;
export declare const ActorTypeSchema: z.ZodEnum<["agent", "user", "system"]>;
export declare const LeadExtractionResultSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    product: z.ZodOptional<z.ZodString>;
    quantity: z.ZodOptional<z.ZodNumber>;
    delivery_location: z.ZodOptional<z.ZodString>;
    requested_time: z.ZodOptional<z.ZodString>;
    budget: z.ZodOptional<z.ZodString>;
    timeframe: z.ZodOptional<z.ZodString>;
    questions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    intent: z.ZodDefault<z.ZodEnum<["purchase_inquiry", "price_check", "support", "general_inquiry", "refund_request", "spam"]>>;
    sentiment: z.ZodDefault<z.ZodEnum<["positive", "neutral", "urgent", "frustrated"]>>;
    missing_information: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    recommended_action: z.ZodDefault<z.ZodString>;
    confidence: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    questions: string[];
    intent: "purchase_inquiry" | "price_check" | "support" | "general_inquiry" | "refund_request" | "spam";
    sentiment: "positive" | "neutral" | "urgent" | "frustrated";
    missing_information: string[];
    recommended_action: string;
    confidence: number;
    name?: string | undefined;
    phone?: string | undefined;
    product?: string | undefined;
    quantity?: number | undefined;
    delivery_location?: string | undefined;
    requested_time?: string | undefined;
    budget?: string | undefined;
    timeframe?: string | undefined;
}, {
    name?: string | undefined;
    phone?: string | undefined;
    product?: string | undefined;
    quantity?: number | undefined;
    delivery_location?: string | undefined;
    requested_time?: string | undefined;
    budget?: string | undefined;
    timeframe?: string | undefined;
    questions?: string[] | undefined;
    intent?: "purchase_inquiry" | "price_check" | "support" | "general_inquiry" | "refund_request" | "spam" | undefined;
    sentiment?: "positive" | "neutral" | "urgent" | "frustrated" | undefined;
    missing_information?: string[] | undefined;
    recommended_action?: string | undefined;
    confidence?: number | undefined;
}>;
export declare const InboundLeadPayloadSchema: z.ZodObject<{
    tenant_id: z.ZodString;
    channel: z.ZodEnum<["whatsapp", "web_form", "mock_api"]>;
    external_lead_id: z.ZodString;
    sender_phone: z.ZodOptional<z.ZodString>;
    sender_name: z.ZodOptional<z.ZodString>;
    message_text: z.ZodString;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    tenant_id: string;
    channel: "whatsapp" | "web_form" | "mock_api";
    external_lead_id: string;
    message_text: string;
    metadata: Record<string, any>;
    sender_phone?: string | undefined;
    sender_name?: string | undefined;
}, {
    tenant_id: string;
    channel: "whatsapp" | "web_form" | "mock_api";
    external_lead_id: string;
    message_text: string;
    sender_phone?: string | undefined;
    sender_name?: string | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export declare const ApprovalActionRequestSchema: z.ZodObject<{
    action: z.ZodEnum<["APPROVE", "REJECT", "EDIT_AND_APPROVE", "REVISE", "ASSIGN", "ESCALATE", "PAUSE", "CANCEL"]>;
    review_notes: z.ZodOptional<z.ZodString>;
    edited_content: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    assign_to: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    action: "APPROVE" | "REJECT" | "EDIT_AND_APPROVE" | "REVISE" | "ASSIGN" | "ESCALATE" | "PAUSE" | "CANCEL";
    review_notes?: string | undefined;
    edited_content?: Record<string, any> | undefined;
    assign_to?: string | undefined;
}, {
    action: "APPROVE" | "REJECT" | "EDIT_AND_APPROVE" | "REVISE" | "ASSIGN" | "ESCALATE" | "PAUSE" | "CANCEL";
    review_notes?: string | undefined;
    edited_content?: Record<string, any> | undefined;
    assign_to?: string | undefined;
}>;
export declare const DocumentUploadSchema: z.ZodObject<{
    title: z.ZodString;
    category: z.ZodDefault<z.ZodString>;
    verification_status: z.ZodDefault<z.ZodEnum<["verified", "draft", "expired"]>>;
    content: z.ZodString;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    metadata: Record<string, any>;
    title: string;
    category: string;
    verification_status: "verified" | "draft" | "expired";
    content: string;
}, {
    title: string;
    content: string;
    metadata?: Record<string, any> | undefined;
    category?: string | undefined;
    verification_status?: "verified" | "draft" | "expired" | undefined;
}>;
