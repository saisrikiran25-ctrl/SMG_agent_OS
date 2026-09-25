export type UserRole = 'Owner' | 'Admin' | 'Manager' | 'Sales member' | 'Support member' | 'Viewer';
export type WorkflowExecutionStatus = 'RECEIVED' | 'AUTHENTICATED' | 'CLASSIFIED' | 'CONTEXT_RETRIEVED' | 'PLAN_CREATED' | 'VALIDATED' | 'AWAITING_APPROVAL' | 'EXECUTING' | 'PARTIALLY_COMPLETED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED' | 'ESCALATED' | 'FAILED_RETRYABLE' | 'FAILED_PERMANENT' | 'EXPIRED';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EDITED_APPROVED' | 'ESCALATED';
export type ActorType = 'agent' | 'user' | 'system';
export type SupportedLanguage = 'en' | 'te' | 'hi' | 'ta' | 'kn' | 'ml' | 'mr' | 'bn' | 'gu';
export type DocumentVerificationStatus = 'verified' | 'draft' | 'expired';
export interface LeadExtractionResult {
    name?: string;
    phone?: string;
    product?: string;
    quantity?: number;
    delivery_location?: string;
    requested_time?: string;
    budget?: string;
    timeframe?: string;
    questions?: string[];
    intent?: 'purchase_inquiry' | 'price_check' | 'support' | 'general_inquiry' | 'refund_request' | 'spam';
    sentiment?: 'positive' | 'neutral' | 'urgent' | 'frustrated';
    missing_information: string[];
    recommended_action: string;
    confidence: number;
}
export interface ProductContextItem {
    id: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    in_stock: boolean;
    stock_quantity?: number;
    category?: string;
    source_document_id: string;
    verification_status: DocumentVerificationStatus;
}
export interface ToolDefinition {
    name: string;
    description: string;
    parameters: Record<string, any>;
    returns: Record<string, any>;
    requires_approval: boolean;
}
export interface AuditEvent {
    id: string;
    tenant_id: string;
    workspace_id?: string;
    user_id?: string;
    workflow_id?: string;
    execution_id?: string;
    actor_type: ActorType;
    actor_id?: string;
    event_type: string;
    action: string;
    inputs?: Record<string, any>;
    outputs?: Record<string, any>;
    metadata?: Record<string, any>;
    cost_tokens?: number;
    cost_usd?: number;
    latency_ms?: number;
    created_at: string;
}
export interface ApprovalRecord {
    id: string;
    tenant_id: string;
    execution_id: string;
    workflow_id: string;
    step_name: string;
    action_description: string;
    reason: string;
    data_used: Record<string, any>;
    generated_content: Record<string, any>;
    tool_to_call: string;
    estimated_cost_usd?: number;
    status: ApprovalStatus;
    reviewed_by?: string;
    reviewed_at?: string;
    review_notes?: string;
    assigned_to?: string;
    created_at: string;
    updated_at: string;
}
export interface WorkflowRunTrace {
    execution_id: string;
    tenant_id: string;
    workflow_id: string;
    status: WorkflowExecutionStatus;
    current_step?: string;
    input_payload: Record<string, any>;
    extracted_lead?: LeadExtractionResult;
    context_retrieved?: ProductContextItem[];
    drafted_message?: {
        draft_text: string;
        confidence: number;
    };
    approval?: ApprovalRecord;
    steps: Array<{
        id: string;
        step_name: string;
        status: string;
        inputs: any;
        outputs: any;
        error?: string;
        started_at: string;
        completed_at?: string;
        latency_ms?: number;
    }>;
    audit_events: AuditEvent[];
    created_at: string;
    updated_at: string;
}
export interface EvaluationTestCase {
    id: string;
    name: string;
    category: 'standard' | 'ambiguous' | 'multilingual' | 'adversarial' | 'duplicate';
    language: SupportedLanguage;
    input_text: string;
    expected_intent: string;
    expected_entities: Partial<LeadExtractionResult>;
    expected_approval_required: boolean;
    expected_escalation: boolean;
    forbidden_actions?: string[];
}
export interface EvaluationReport {
    timestamp: string;
    prompt_version: string;
    agent_version: string;
    total_tests: number;
    passed_tests: number;
    intent_extraction_accuracy: number;
    classification_precision: number;
    classification_recall: number;
    grounded_answer_rate: number;
    tool_selection_accuracy: number;
    human_escalation_rate: number;
    approval_rejection_rate: number;
    workflow_completion_rate: number;
    duplicate_action_rate: number;
    avg_latency_ms: number;
    avg_cost_tokens: number;
    results: Array<{
        test_id: string;
        test_name: string;
        passed: boolean;
        errors: string[];
        metrics: Record<string, any>;
    }>;
}
