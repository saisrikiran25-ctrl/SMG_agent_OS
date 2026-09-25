import { BaseRepository } from './base.repository';
import { v4 as uuidv4 } from 'uuid';
import { UserRole } from '@smb/shared';

export interface UserRecord {
  id: string;
  tenant_id: string;
  workspace_id?: string;
  email: string;
  password_hash: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export class UserRepository extends BaseRepository {
  async create(
    tenantId: string,
    email: string,
    passwordHash: string,
    name: string,
    role: UserRole = 'Viewer',
    workspaceId?: string
  ): Promise<UserRecord> {
    this.assertTenant(tenantId);
    const id = `usr_${uuidv4().substring(0, 8)}`;
    const rows = await this.db.query<UserRecord>(
      `INSERT INTO users (id, tenant_id, workspace_id, email, password_hash, name, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING *`,
      [id, tenantId, workspaceId || null, email.toLowerCase(), passwordHash, name, role, true]
    );
    return rows[0];
  }

  async findByEmail(tenantId: string, email: string): Promise<UserRecord | null> {
    this.assertTenant(tenantId);
    const rows = await this.db.query<UserRecord>(
      `SELECT * FROM users WHERE tenant_id = $1 AND email = $2`,
      [tenantId, email.toLowerCase()]
    );
    return rows[0] || null;
  }

  async findById(tenantId: string, userId: string): Promise<UserRecord | null> {
    this.assertTenant(tenantId);
    const rows = await this.db.query<UserRecord>(
      `SELECT * FROM users WHERE tenant_id = $1 AND id = $2`,
      [tenantId, userId]
    );
    return rows[0] || null;
  }

  async listByTenant(tenantId: string): Promise<UserRecord[]> {
    this.assertTenant(tenantId);
    return this.db.query<UserRecord>(
      `SELECT id, tenant_id, workspace_id, email, name, role, is_active, created_at, updated_at FROM users WHERE tenant_id = $1`,
      [tenantId]
    );
  }
}
