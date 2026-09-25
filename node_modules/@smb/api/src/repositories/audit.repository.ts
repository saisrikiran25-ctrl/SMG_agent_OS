import { BaseRepository } from './base.repository';
import { v4 as uuidv4 } from 'uuid';
import { ActorType, AuditEvent } from '@smb/shared';

export class AuditRepository extends BaseRepository {
  /**
   * Strictly append-only. No UPDATE or DELETE methods are implemented or permitted.
   */
  async append(data: {
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
  }): Promise<AuditEvent> {
    this.assertTenant(data.tenant_id);
    const id = `aud_${uuidv4().substring(0, 10)}`;

    const rows = await this.db.query<AuditEvent>(
      `INSERT INTO audit_events (
        id, tenant_id, workspace_id, user_id, workflow_id, execution_id,
        actor_type, actor_id, event_type, action, inputs, outputs,
        metadata, cost_tokens, cost_usd, latency_ms, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
      RETURNING *`,
      [
        id,
        data.tenant_id,
        data.workspace_id || null,
        data.user_id || null,
        data.workflow_id || null,
        data.execution_id || null,
        data.actor_type,
        data.actor_id || null,
        data.event_type,
        data.action,
        JSON.stringify(data.inputs || {}),
        JSON.stringify(data.outputs || {}),
        JSON.stringify(data.metadata || {}),
        data.cost_tokens || 0,
        data.cost_usd || 0.0,
        data.latency_ms || 0,
      ]
    );
    return rows[0];
  }

  async listByExecution(tenantId: string, executionId: string): Promise<AuditEvent[]> {
    this.assertTenant(tenantId);
    return this.db.query<AuditEvent>(
      `SELECT * FROM audit_events WHERE tenant_id = $1 AND execution_id = $2 ORDER BY created_at ASC`,
      [tenantId, executionId]
    );
  }

  async listRecent(tenantId: string, limit = 100): Promise<AuditEvent[]> {
    this.assertTenant(tenantId);
    return this.db.query<AuditEvent>(
      `SELECT * FROM audit_events WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT ${limit}`,
      [tenantId]
    );
  }
}
