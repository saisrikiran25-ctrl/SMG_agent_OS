import { BaseRepository } from './base.repository';
import { v4 as uuidv4 } from 'uuid';

export interface UsageEventRecord {
  id: string;
  tenant_id: string;
  workspace_id?: string;
  execution_id?: string;
  event_type: string;
  units: number;
  cost_usd: number;
  created_at?: string;
}

export class UsageRepository extends BaseRepository {
  async recordUsage(data: {
    tenant_id: string;
    workspace_id?: string;
    execution_id?: string;
    event_type: string;
    units: number;
    cost_usd?: number;
  }): Promise<UsageEventRecord> {
    this.assertTenant(data.tenant_id);
    const id = `use_${uuidv4().substring(0, 8)}`;
    const rows = await this.db.query<UsageEventRecord>(
      `INSERT INTO usage_events (
        id, tenant_id, workspace_id, execution_id, event_type, units, cost_usd, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *`,
      [
        id,
        data.tenant_id,
        data.workspace_id || null,
        data.execution_id || null,
        data.event_type,
        data.units,
        data.cost_usd || 0.0,
      ]
    );
    return rows[0];
  }

  async getTenantSummary(tenantId: string): Promise<{
    total_tokens: number;
    total_tool_calls: number;
    total_messages: number;
    total_cost_usd: number;
  }> {
    this.assertTenant(tenantId);
    const events = await this.db.query<UsageEventRecord>(
      `SELECT * FROM usage_events WHERE tenant_id = $1`,
      [tenantId]
    );

    let total_tokens = 0;
    let total_tool_calls = 0;
    let total_messages = 0;
    let total_cost_usd = 0;

    for (const ev of events) {
      const units = Number(ev.units) || 0;
      const cost = Number(ev.cost_usd) || 0;
      total_cost_usd += cost;
      if (ev.event_type === 'llm_tokens') total_tokens += units;
      else if (ev.event_type === 'tool_call') total_tool_calls += units;
      else if (ev.event_type === 'whatsapp_message') total_messages += units;
    }

    return {
      total_tokens,
      total_tool_calls,
      total_messages,
      total_cost_usd: Number(total_cost_usd.toFixed(4)),
    };
  }
}
