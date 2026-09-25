import { BaseRepository } from './base.repository';
import { v4 as uuidv4 } from 'uuid';

export interface WorkspaceRecord {
  id: string;
  tenant_id: string;
  name: string;
  industry: string;
  currency: string;
  default_language: string;
  created_at?: string;
  updated_at?: string;
}

export class WorkspaceRepository extends BaseRepository {
  async create(
    tenantId: string,
    name: string,
    industry = 'Retail/Distribution',
    currency = 'INR',
    default_language = 'en'
  ): Promise<WorkspaceRecord> {
    this.assertTenant(tenantId);
    const id = `ws_${uuidv4().substring(0, 8)}`;
    const rows = await this.db.query<WorkspaceRecord>(
      `INSERT INTO workspaces (id, tenant_id, name, industry, currency, default_language, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [id, tenantId, name, industry, currency, default_language]
    );
    return rows[0];
  }

  async listByTenant(tenantId: string): Promise<WorkspaceRecord[]> {
    this.assertTenant(tenantId);
    return this.db.query<WorkspaceRecord>(
      `SELECT * FROM workspaces WHERE tenant_id = $1`,
      [tenantId]
    );
  }

  async findById(tenantId: string, workspaceId: string): Promise<WorkspaceRecord | null> {
    this.assertTenant(tenantId);
    const rows = await this.db.query<WorkspaceRecord>(
      `SELECT * FROM workspaces WHERE tenant_id = $1 AND id = $2`,
      [tenantId, workspaceId]
    );
    return rows[0] || null;
  }
}
