-- Enable UUID and vector extensions if available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tenants
CREATE TABLE IF NOT EXISTS tenants (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    plan VARCHAR(64) NOT NULL DEFAULT 'Starter',
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Workspaces
CREATE TABLE IF NOT EXISTS workspaces (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(128) NOT NULL DEFAULT 'Retail/Distribution',
    currency VARCHAR(16) NOT NULL DEFAULT 'INR',
    default_language VARCHAR(8) NOT NULL DEFAULT 'en',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_workspaces_tenant_id ON workspaces(tenant_id);

-- 3. Roles
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(64) NOT NULL, -- Owner, Admin, Manager, Sales member, Support member, Viewer
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_roles_tenant_id ON roles(tenant_id);

-- 4. Permissions
CREATE TABLE IF NOT EXISTS permissions (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role_id VARCHAR(64) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    resource VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_permissions_tenant_id ON permissions(tenant_id);

-- 5. Users
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    workspace_id VARCHAR(64) REFERENCES workspaces(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(64) NOT NULL DEFAULT 'Viewer',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_user_email UNIQUE(tenant_id, email)
);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);

-- 6. Agents
CREATE TABLE IF NOT EXISTS agents (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    agent_key VARCHAR(128) NOT NULL,
    purpose TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agents_tenant_id ON agents(tenant_id);

-- 7. Agent Versions
CREATE TABLE IF NOT EXISTS agent_versions (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    agent_id VARCHAR(64) NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    version VARCHAR(32) NOT NULL,
    contract_json JSONB NOT NULL,
    is_published BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agent_versions_tenant_id ON agent_versions(tenant_id);

-- 8. Workflows
CREATE TABLE IF NOT EXISTS workflows (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    workflow_key VARCHAR(128) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_workflows_tenant_id ON workflows(tenant_id);

-- 9. Workflow Versions
CREATE TABLE IF NOT EXISTS workflow_versions (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    workflow_id VARCHAR(64) NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    version VARCHAR(32) NOT NULL,
    definition_json JSONB NOT NULL,
    is_published BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_workflow_versions_tenant_id ON workflow_versions(tenant_id);

-- 10. Workflow Executions (Core State Machine)
CREATE TABLE IF NOT EXISTS workflow_executions (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    workspace_id VARCHAR(64) REFERENCES workspaces(id) ON DELETE SET NULL,
    workflow_id VARCHAR(64) NOT NULL,
    workflow_version_id VARCHAR(64),
    status VARCHAR(32) NOT NULL CHECK (status IN (
        'RECEIVED', 'AUTHENTICATED', 'CLASSIFIED', 'CONTEXT_RETRIEVED',
        'PLAN_CREATED', 'VALIDATED', 'AWAITING_APPROVAL', 'EXECUTING',
        'PARTIALLY_COMPLETED', 'COMPLETED', 'REJECTED', 'CANCELLED',
        'ESCALATED', 'FAILED_RETRYABLE', 'FAILED_PERMANENT', 'EXPIRED'
    )),
    idempotency_key VARCHAR(255) NOT NULL,
    trigger_channel VARCHAR(64) NOT NULL DEFAULT 'whatsapp',
    input_payload JSONB NOT NULL,
    extracted_data JSONB DEFAULT '{}'::jsonb,
    context_data JSONB DEFAULT '{}'::jsonb,
    plan_data JSONB DEFAULT '{}'::jsonb,
    execution_result JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    retry_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_exec_idempotency UNIQUE(tenant_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_workflow_exec_tenant_status ON workflow_executions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_workflow_exec_created_at ON workflow_executions(created_at);

-- 11. Workflow Steps
CREATE TABLE IF NOT EXISTS workflow_steps (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    execution_id VARCHAR(64) NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    step_name VARCHAR(128) NOT NULL,
    step_order INT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    inputs JSONB DEFAULT '{}'::jsonb,
    outputs JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_exec ON workflow_steps(tenant_id, execution_id);

-- 12. Approvals (Approval Centre)
CREATE TABLE IF NOT EXISTS approvals (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    execution_id VARCHAR(64) NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    workflow_id VARCHAR(64) NOT NULL,
    step_name VARCHAR(128) NOT NULL,
    action_description TEXT NOT NULL,
    reason TEXT NOT NULL,
    data_used JSONB NOT NULL,
    generated_content JSONB NOT NULL,
    tool_to_call VARCHAR(128) NOT NULL,
    estimated_cost_usd NUMERIC(10, 4) DEFAULT 0.0000,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN (
        'PENDING', 'APPROVED', 'REJECTED', 'EDITED_APPROVED', 'ESCALATED'
    )),
    reviewed_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    assigned_to VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_approvals_tenant_status ON approvals(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_approvals_exec ON approvals(execution_id);

-- 13. Tools
CREATE TABLE IF NOT EXISTS tools (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    schema JSONB NOT NULL,
    requires_approval BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tools_tenant ON tools(tenant_id);

-- 14. Tool Credentials (Encrypted/Scoped)
CREATE TABLE IF NOT EXISTS tool_credentials (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tool_name VARCHAR(128) NOT NULL,
    credential_payload JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tool_credentials_tenant ON tool_credentials(tenant_id);

-- 15. Knowledge Sources
CREATE TABLE IF NOT EXISTS knowledge_sources (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    source_type VARCHAR(64) NOT NULL, -- document_upload, sheets, crm, api
    configuration JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_tenant ON knowledge_sources(tenant_id);

-- 16. Documents
CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    source_id VARCHAR(64) REFERENCES knowledge_sources(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(128) NOT NULL DEFAULT 'catalogue',
    verification_status VARCHAR(32) NOT NULL DEFAULT 'verified' CHECK (verification_status IN ('verified', 'draft', 'expired')),
    raw_content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_documents_tenant_status ON documents(tenant_id, verification_status);

-- 17. Document Chunks (for RAG / Semantic Retrieval)
CREATE TABLE IF NOT EXISTS document_chunks (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    document_id VARCHAR(64) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    keywords TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_document_chunks_tenant ON document_chunks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_doc ON document_chunks(document_id);

-- 18. Customers
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    phone VARCHAR(64),
    name VARCHAR(255),
    email VARCHAR(255),
    city VARCHAR(128),
    state VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_customer_phone UNIQUE(tenant_id, phone)
);
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);

-- 19. Leads
CREATE TABLE IF NOT EXISTS leads (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE SET NULL,
    external_lead_id VARCHAR(255) NOT NULL,
    channel VARCHAR(64) NOT NULL DEFAULT 'whatsapp',
    contact_name VARCHAR(255),
    phone VARCHAR(64),
    product_requested VARCHAR(255),
    quantity NUMERIC(10, 2),
    delivery_location VARCHAR(255),
    budget VARCHAR(128),
    status VARCHAR(64) NOT NULL DEFAULT 'new',
    qualification_score NUMERIC(5, 2) DEFAULT 0.0,
    extracted_fields JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_external_lead UNIQUE(tenant_id, external_lead_id)
);
CREATE INDEX IF NOT EXISTS idx_leads_tenant ON leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_external_id ON leads(external_lead_id);

-- 20. Audit Events (Append-Only)
CREATE TABLE IF NOT EXISTS audit_events (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    workspace_id VARCHAR(64),
    user_id VARCHAR(64),
    workflow_id VARCHAR(64),
    execution_id VARCHAR(64),
    actor_type VARCHAR(32) NOT NULL CHECK (actor_type IN ('agent', 'user', 'system')),
    actor_id VARCHAR(64),
    event_type VARCHAR(128) NOT NULL,
    action VARCHAR(128) NOT NULL,
    inputs JSONB DEFAULT '{}'::jsonb,
    outputs JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    cost_tokens INT DEFAULT 0,
    cost_usd NUMERIC(10, 6) DEFAULT 0.000000,
    latency_ms INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_tenant_created ON audit_events(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_exec_id ON audit_events(execution_id);

-- 21. Evaluations
CREATE TABLE IF NOT EXISTS evaluations (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    suite_name VARCHAR(128) NOT NULL,
    prompt_version VARCHAR(32) NOT NULL,
    agent_version VARCHAR(32) NOT NULL,
    total_tests INT NOT NULL,
    passed_tests INT NOT NULL,
    metrics JSONB NOT NULL,
    raw_results JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_evaluations_tenant ON evaluations(tenant_id);

-- 22. Usage Events (Metering)
CREATE TABLE IF NOT EXISTS usage_events (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    workspace_id VARCHAR(64),
    execution_id VARCHAR(64),
    event_type VARCHAR(64) NOT NULL, -- llm_tokens, tool_call, whatsapp_message, document_processed
    units NUMERIC(12, 4) NOT NULL,
    cost_usd NUMERIC(10, 6) DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_usage_events_tenant ON usage_events(tenant_id, created_at);
