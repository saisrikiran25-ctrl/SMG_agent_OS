import { BaseRepository } from './base.repository';
import { v4 as uuidv4 } from 'uuid';
import {
  WorkflowExecutionStatus,
  LeadExtractionResult,
  ProductContextItem,
} from '@smb/shared';

export interface WorkflowExecutionRecord {
  id: string;
  tenant_id: string;
  workspace_id?: string;
  workflow_id: string;
  workflow_version_id?: string;
  status: WorkflowExecutionStatus;
  idempotency_key: string;
  trigger_channel: string;
  input_payload: Record<string, any>;
  extracted_data: LeadExtractionResult | Record<string, any>;
  context_data: ProductContextItem[] | Record<string, any>;
  plan_data: Record<string, any>;
  execution_result: Record<string, any>;
  error_message?: string;
  retry_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface WorkflowStepRecord {
  id: string;
  tenant_id: string;
  execution_id: string;
  step_name: string;
  step_order: number;
  status: string; // PENDING, RUNNING, COMPLETED, FAILED, SKIPPED
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at?: string;
}

export class WorkflowExecutionRepository extends BaseRepository {
  async create(data: {
    tenant_id: string;
    workspace_id?: string;
    workflow_id: string;
    workflow_version_id?: string;
    status: WorkflowExecutionStatus;
    idempotency_key: string;
    trigger_channel: string;
    input_payload: Record<string, any>;
  }): Promise<WorkflowExecutionRecord> {
    this.assertTenant(data.tenant_id);
    const id = `exec_${uuidv4().substring(0, 10)}`;
    const rows = await this.db.query<WorkflowExecutionRecord>(
      `INSERT INTO workflow_executions (
        id, tenant_id, workspace_id, workflow_id, workflow_version_id, status,
        idempotency_key, trigger_channel, input_payload, extracted_data,
        context_data, plan_data, execution_result, retry_count, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 0, NOW(), NOW())
      RETURNING *`,
      [
        id,
        data.tenant_id,
        data.workspace_id || null,
        data.workflow_id,
        data.workflow_version_id || '1.0.0',
        data.status,
        data.idempotency_key,
        data.trigger_channel,
        JSON.stringify(data.input_payload),
        JSON.stringify({}),
        JSON.stringify([]),
        JSON.stringify({}),
        JSON.stringify({}),
      ]
    );
    return rows[0];
  }

  private normalizeRecord(rec: WorkflowExecutionRecord | null): WorkflowExecutionRecord | null {
    if (!rec) return null;
    const cloned = { ...rec };
    if (typeof cloned.input_payload === 'string') {
      try { cloned.input_payload = JSON.parse(cloned.input_payload); } catch {}
    }
    if (typeof cloned.extracted_data === 'string') {
      try { cloned.extracted_data = JSON.parse(cloned.extracted_data); } catch {}
    }
    if (typeof cloned.context_data === 'string') {
      try { cloned.context_data = JSON.parse(cloned.context_data); } catch {}
    }
    if (typeof cloned.plan_data === 'string') {
      try { cloned.plan_data = JSON.parse(cloned.plan_data); } catch {}
    }
    if (typeof cloned.execution_result === 'string') {
      try { cloned.execution_result = JSON.parse(cloned.execution_result); } catch {}
    }
    return cloned;
  }

  async findById(tenantId: string, executionId: string): Promise<WorkflowExecutionRecord | null> {
    this.assertTenant(tenantId);
    const rows = await this.db.query<WorkflowExecutionRecord>(
      `SELECT * FROM workflow_executions WHERE tenant_id = $1 AND id = $2`,
      [tenantId, executionId]
    );
    return this.normalizeRecord(rows[0] || null);
  }

  async findByIdempotencyKey(tenantId: string, idempotencyKey: string): Promise<WorkflowExecutionRecord | null> {
    this.assertTenant(tenantId);
    const rows = await this.db.query<WorkflowExecutionRecord>(
      `SELECT * FROM workflow_executions WHERE tenant_id = $1 AND idempotency_key = $2`,
      [tenantId, idempotencyKey]
    );
    return this.normalizeRecord(rows[0] || null);
  }

  async updateStatus(
    tenantId: string,
    executionId: string,
    status: WorkflowExecutionStatus,
    patch?: {
      extracted_data?: any;
      context_data?: any;
      plan_data?: any;
      execution_result?: any;
      error_message?: string;
    }
  ): Promise<WorkflowExecutionRecord> {
    this.assertTenant(tenantId);
    const updates: string[] = ['status = $3', 'updated_at = NOW()'];
    const params: any[] = [tenantId, executionId, status];
    let paramIdx = 4;

    if (patch?.extracted_data !== undefined) {
      updates.push(`extracted_data = $${paramIdx++}`);
      params.push(JSON.stringify(patch.extracted_data));
    }
    if (patch?.context_data !== undefined) {
      updates.push(`context_data = $${paramIdx++}`);
      params.push(JSON.stringify(patch.context_data));
    }
    if (patch?.plan_data !== undefined) {
      updates.push(`plan_data = $${paramIdx++}`);
      params.push(JSON.stringify(patch.plan_data));
    }
    if (patch?.execution_result !== undefined) {
      updates.push(`execution_result = $${paramIdx++}`);
      params.push(JSON.stringify(patch.execution_result));
    }
    if (patch?.error_message !== undefined) {
      updates.push(`error_message = $${paramIdx++}`);
      params.push(patch.error_message);
    }

    await this.db.execute(
      `UPDATE workflow_executions SET ${updates.join(', ')} WHERE tenant_id = $1 AND id = $2`,
      params
    );

    const updated = await this.findById(tenantId, executionId);
    if (!updated) throw new Error('Execution record not found');
    return updated;
  }

  async incrementRetry(tenantId: string, executionId: string): Promise<number> {
    this.assertTenant(tenantId);
    const record = await this.findById(tenantId, executionId);
    if (!record) throw new Error('Execution record not found');
    const newCount = (record.retry_count || 0) + 1;
    await this.db.execute(
      `UPDATE workflow_executions SET retry_count = $3, updated_at = NOW() WHERE tenant_id = $1 AND id = $2`,
      [tenantId, executionId, newCount]
    );
    return newCount;
  }

  async list(tenantId: string, limit = 50): Promise<WorkflowExecutionRecord[]> {
    this.assertTenant(tenantId);
    return this.db.query<WorkflowExecutionRecord>(
      `SELECT * FROM workflow_executions WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT ${limit}`,
      [tenantId]
    );
  }

  // Step Records
  async recordStep(
    tenantId: string,
    executionId: string,
    stepName: string,
    stepOrder: number,
    status: string,
    inputs: Record<string, any> = {},
    outputs: Record<string, any> = {},
    errorMessage?: string
  ): Promise<WorkflowStepRecord> {
    this.assertTenant(tenantId);
    const id = `step_${uuidv4().substring(0, 8)}`;
    const rows = await this.db.query<WorkflowStepRecord>(
      `INSERT INTO workflow_steps (
        id, tenant_id, execution_id, step_name, step_order, status, inputs, outputs, error_message, started_at, completed_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), NOW())
      RETURNING *`,
      [
        id,
        tenantId,
        executionId,
        stepName,
        stepOrder,
        status,
        JSON.stringify(inputs),
        JSON.stringify(outputs),
        errorMessage || null,
      ]
    );
    return rows[0];
  }

  async listStepsForExecution(tenantId: string, executionId: string): Promise<WorkflowStepRecord[]> {
    this.assertTenant(tenantId);
    return this.db.query<WorkflowStepRecord>(
      `SELECT * FROM workflow_steps WHERE tenant_id = $1 AND execution_id = $2 ORDER BY step_order ASC`,
      [tenantId, executionId]
    );
  }
}
