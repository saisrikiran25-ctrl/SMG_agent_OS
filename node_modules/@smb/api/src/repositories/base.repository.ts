import { IDatabase } from '../db/database';

export abstract class BaseRepository {
  constructor(protected db: IDatabase) {}

  protected assertTenant(tenantId?: string): string {
    if (!tenantId || tenantId.trim() === '') {
      throw new Error('Security Error: Tenant ID is required for all data operations. Cross-tenant access prevented.');
    }
    return tenantId;
  }
}
