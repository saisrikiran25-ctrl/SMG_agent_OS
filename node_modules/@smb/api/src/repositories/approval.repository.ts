import { BaseRepository } from './base.repository';
import { v4 as uuidv4 } from 'uuid';
import { ApprovalRecord, ApprovalStatus } from '@smb/shared';

export class ApprovalRepository extends BaseRepository {
  async create(data: {
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
    assigned_to?: string;
  }): Promise<ApprovalRecord> {
    this.assertTenant(data.tenant_id);
    const id = `appr_${uuidv4().substring(0, 8)}`;
    const rows = await this.db.query<ApprovalRecord>(
      `INSERT INTO approvals (
        id, tenant_id, execution_id, workflow_id, step_name, action_description,
        reason, data_used, generated_content, tool_to_call, estimated_cost_usd,
        status, assigned_to, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      RETURNING *`,
      [
        id,
        data.tenant_id,
        data.execution_id,
        data.workflow_id,
        data.step_name,
        data.action_description,
        data.reason,
        JSON.stringify(data.data_used),
        JSON.stringify(data.generated_content),
        data.tool_to_call,
        data.estimated_cost_usd || 0.002,
        'PENDING',
        data.assigned_to || null,
      ]
    );
    return rows[0];
  }

  async findById(tenantId: string, approvalId: string): Promise<ApprovalRecord | null> {
    this.assertTenant(tenantId);
    const rows = await this.db.query<ApprovalRecord>(
      `SELECT * FROM approvals WHERE tenant_id = $1 AND id = $2`,
      [tenantId, approvalId]
    );
    return rows[0] || null;
  }

  async findByExecutionId(tenantId: string, executionId: string): Promise<ApprovalRecord | null> {
    this.assertTenant(tenantId);
    const rows = await this.db.query<ApprovalRecord>(
      `SELECT * FROM approvals WHERE tenant_id = $1 AND execution_id = $2`,
      [tenantId, executionId]
    );
    return rows[0] || null;
  }

  async listPending(tenantId: string): Promise<ApprovalRecord[]> {
    this.assertTenant(tenantId);
    return this.db.query<ApprovalRecord>(
      `SELECT * FROM approvals WHERE tenant_id = $1 AND status = 'PENDING' ORDER BY created_at DESC`,
      [tenantId]
    );
  }

  async listAll(tenantId: string): Promise<ApprovalRecord[]> {
    this.assertTenant(tenantId);
    return this.db.query<ApprovalRecord>(
      `SELECT * FROM approvals WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
  }

  async updateStatus(
    tenantId: string,
    approvalId: string,
    status: ApprovalStatus,
    reviewedBy?: string,
    reviewNotes?: string,
    editedContent?: Record<string, any>
  ): Promise<ApprovalRecord> {
    this.assertTenant(tenantId);
    const approval = await this.findById(tenantId, approvalId);
    if (!approval) throw new Error(`Approval ${approvalId} not found`);

    const newContent = editedContent
      ? JSON.stringify(editedContent)
      : JSON.stringify(approval.generated_content);

    await this.db.execute(
      `UPDATE approvals
       SET status = $3, reviewed_by = $4, reviewed_at = NOW(), review_notes = $5, generated_content = $6, updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2`,
      [tenantId, approvalId, status, reviewedBy || null, reviewNotes || null, newContent]
    );

    const updated = await this.findById(tenantId, approvalId);
    if (!updated) throw new Error('Updated approval not found');
    return updated;
  }
}
