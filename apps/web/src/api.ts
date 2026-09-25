const API_BASE = '/api';

export class ApiClient {
  private static token: string | null = null;
  private static tenantId: string | null = null;

  static setAuth(token: string, tenantId: string) {
    this.token = token;
    this.tenantId = tenantId;
    localStorage.setItem('smb_token', token);
    localStorage.setItem('smb_tenant_id', tenantId);
  }

  static getAuth() {
    if (!this.token) {
      this.token = localStorage.getItem('smb_token');
      this.tenantId = localStorage.getItem('smb_tenant_id');
    }
    return { token: this.token, tenantId: this.tenantId };
  }

  static async request(path: string, options: RequestInit = {}) {
    const { token, tenantId } = this.getAuth();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (tenantId) headers['x-tenant-id'] = tenantId;

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(errorData.error || `HTTP Error ${res.status}`);
    }

    return res.json();
  }

  // Auth
  static async signup(data: any) {
    const res = await this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setAuth(res.token, res.tenant.id);
    return res;
  }

  static async login(data: any) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setAuth(res.token, res.tenant.id);
    return res;
  }

  // Dashboard
  static getStats() {
    return this.request('/dashboard/stats');
  }

  // Approvals
  static getPendingApprovals() {
    return this.request('/approvals/pending');
  }

  static getAllApprovals() {
    return this.request('/approvals/all');
  }

  static performApprovalAction(approvalId: string, action: string, notes?: string, editedContent?: any) {
    return this.request(`/approvals/${approvalId}/action`, {
      method: 'POST',
      body: JSON.stringify({ action, review_notes: notes, edited_content: editedContent }),
    });
  }

  // Workflows
  static getExecutions() {
    return this.request('/workflows/executions');
  }

  static getExecutionTrace(id: string) {
    return this.request(`/workflows/executions/${id}/trace`);
  }

  static triggerLead(data: any) {
    return this.request('/workflows/lead/trigger', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static retryExecution(id: string) {
    return this.request(`/workflows/executions/${id}/retry`, {
      method: 'POST',
    });
  }

  // Knowledge Hub
  static getDocuments() {
    return this.request('/knowledge/documents');
  }

  static uploadDocument(data: any) {
    return this.request('/knowledge/upload', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static updateDocStatus(id: string, status: string) {
    return this.request(`/knowledge/documents/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  static searchKnowledge(q: string) {
    return this.request(`/knowledge/search?q=${encodeURIComponent(q)}`);
  }

  // Evaluation
  static runEvaluation(promptVersion = '1.0.0') {
    return this.request('/evaluations/run', {
      method: 'POST',
      body: JSON.stringify({ promptVersion }),
    });
  }

  static getLatestEvaluation() {
    return this.request('/evaluations/latest');
  }

  // Workspace & Team
  static getWorkspace() {
    return this.request('/workspaces');
  }

  static getTeam() {
    return this.request('/workspaces/team');
  }

  static inviteMember(data: any) {
    return this.request('/workspaces/team/invite', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Audit Logs
  static getAuditLogs() {
    return this.request('/audit');
  }
}
