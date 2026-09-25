import { BaseRepository } from './base.repository';
import { v4 as uuidv4 } from 'uuid';

export interface TenantRecord {
  id: string;
  name: string;
  plan: string;
  settings: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export class TenantRepository extends BaseRepository {
  async create(name: string, plan = 'Starter', settings = {}): Promise<TenantRecord> {
    const id = `tenant_${uuidv4().substring(0, 8)}`;
    const rows = await this.db.query<TenantRecord>(
      `INSERT INTO tenants (id, name, plan, settings, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [id, name, plan, JSON.stringify(settings)]
    );
    return rows[0];
  }

  async findById(tenantId: string): Promise<TenantRecord | null> {
    this.assertTenant(tenantId);
    const rows = await this.db.query<TenantRecord>(
      `SELECT * FROM tenants WHERE id = $1`,
      [tenantId]
    );
    return rows[0] || null;
  }

  /** List all tenants – used by background worker to scan across tenants */
  async listAll(): Promise<TenantRecord[]> {
    return this.db.query<TenantRecord>(`SELECT * FROM tenants ORDER BY created_at ASC`);
  }
}
