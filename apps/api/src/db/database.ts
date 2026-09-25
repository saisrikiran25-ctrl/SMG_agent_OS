import { Pool, PoolClient } from 'pg';

export interface IDatabase {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  execute(sql: string, params?: any[]): Promise<number>;
  transaction<T>(fn: (tx: IDatabase) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export class PgDatabase implements IDatabase {
  private pool: Pool;

  constructor(connectionString?: string) {
    this.pool = new Pool({
      connectionString:
        connectionString ||
        process.env.DATABASE_URL ||
        'postgresql://smb_admin:smb_secure_password_2026@localhost:5432/smb_agent_os',
    });
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const res = await this.pool.query(sql, params);
    return res.rows as T[];
  }

  async execute(sql: string, params: any[] = []): Promise<number> {
    const res = await this.pool.query(sql, params);
    return res.rowCount || 0;
  }

  async transaction<T>(fn: (tx: IDatabase) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const txDb: IDatabase = {
        query: async <U = any>(sql: string, params: any[] = []) => {
          const res = await client.query(sql, params);
          return res.rows as U[];
        },
        execute: async (sql: string, params: any[] = []) => {
          const res = await client.query(sql, params);
          return res.rowCount || 0;
        },
        transaction: async <U>(nestedFn: (tx: IDatabase) => Promise<U>) => {
          return nestedFn(txDb);
        },
        close: async () => {},
      };
      const result = await fn(txDb);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// In-Memory Database Engine for fast local testing & isolated unit/integration tests
export class MemoryDatabase implements IDatabase {
  private tables: Map<string, Array<Record<string, any>>> = new Map();

  constructor() {
    this.initTables();
  }

  public initTables() {
    const tableNames = [
      'tenants',
      'workspaces',
      'roles',
      'permissions',
      'users',
      'agents',
      'agent_versions',
      'workflows',
      'workflow_versions',
      'workflow_executions',
      'workflow_steps',
      'approvals',
      'tools',
      'tool_credentials',
      'knowledge_sources',
      'documents',
      'document_chunks',
      'customers',
      'leads',
      'audit_events',
      'evaluations',
      'usage_events',
    ];
    for (const t of tableNames) {
      if (!this.tables.has(t)) {
        this.tables.set(t, []);
      }
    }
  }

  public clear() {
    for (const [table] of this.tables) {
      this.tables.set(table, []);
    }
  }

  private normalizeVal(val: any): any {
    if (typeof val === 'string' && val.startsWith('{') && val.endsWith('}')) {
      try {
        return JSON.parse(val);
      } catch {
        return val;
      }
    }
    return val;
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const trimmed = sql.trim().replace(/;/g, '');
    const lower = trimmed.toLowerCase();

    // SELECT handling
    if (lower.startsWith('select')) {
      const fromIdx = lower.indexOf('from ');
      if (fromIdx === -1) return [] as T[];
      
      const rest = trimmed.substring(fromIdx + 5).trim();
      const parts = rest.split(/\s+/);
      const tableName = parts[0].replace(/["`]/g, '');

      const rows = this.tables.get(tableName) || [];
      let result = [...rows];

      // Simple WHERE filter parser for memory test driver
      const whereIdx = lower.indexOf('where ');
      if (whereIdx !== -1) {
        const whereClause = trimmed.substring(whereIdx + 6).split(/order by|limit/i)[0].trim();
        result = this.filterRows(result, whereClause, params);
      }

      // ORDER BY handling
      const orderByIdx = lower.indexOf('order by ');
      if (orderByIdx !== -1) {
        const orderClause = trimmed.substring(orderByIdx + 9).split(/limit/i)[0].trim();
        const [col, dir] = orderClause.split(/\s+/);
        result.sort((a, b) => {
          const valA = a[col] ?? '';
          const valB = b[col] ?? '';
          if (dir && dir.toLowerCase() === 'desc') {
            return valA > valB ? -1 : valA < valB ? 1 : 0;
          }
          return valA > valB ? 1 : valA < valB ? -1 : 0;
        });
      }

      // LIMIT handling
      const limitIdx = lower.indexOf('limit ');
      if (limitIdx !== -1) {
        const limitStr = trimmed.substring(limitIdx + 6).trim().split(/\s+/)[0];
        const limitNum = parseInt(limitStr, 10);
        if (!isNaN(limitNum)) {
          result = result.slice(0, limitNum);
        }
      }

      // Deep copy and parse JSON columns
      const jsonFields = [
        'settings',
        'contract_json',
        'definition_json',
        'input_payload',
        'extracted_data',
        'context_data',
        'plan_data',
        'execution_result',
        'inputs',
        'outputs',
        'data_used',
        'generated_content',
        'schema',
        'credential_payload',
        'configuration',
        'metadata',
        'extracted_fields',
        'metrics',
        'raw_results',
      ];

      result = result.map((r) => {
        const cloned = { ...r };
        for (const field of jsonFields) {
          if (cloned[field] && typeof cloned[field] === 'string') {
            try {
              cloned[field] = JSON.parse(cloned[field]);
            } catch {
              // keep as string
            }
          }
        }
        return cloned;
      });

      return result as unknown as T[];
    }

    // INSERT handling
    if (lower.startsWith('insert into')) {
      const match = trimmed.match(/insert\s+into\s+([a-zA-Z0-9_]+)\s*\(([\s\S]+?)\)\s*values\s*\(([\s\S]+?)\)/i);
      if (match) {
        const tableName = match[1];
        const cols = match[2].split(',').map((c) => c.trim().replace(/["`]/g, ''));
        const valTokens = match[3].split(',').map((v) => v.trim());
        const table = this.tables.get(tableName) || [];
        
        const row: Record<string, any> = {};
        cols.forEach((col, idx) => {
          const token = valTokens[idx];
          if (!token) {
            row[col] = null;
          } else if (token.startsWith('$')) {
            const pIdx = parseInt(token.substring(1), 10) - 1;
            let val = params[pIdx];
            if (typeof val === 'object' && val !== null) {
              val = JSON.parse(JSON.stringify(val));
            }
            row[col] = val !== undefined ? val : null;
          } else if (token.toLowerCase() === 'now()') {
            row[col] = new Date().toISOString();
          } else if (token.toLowerCase() === 'null') {
            row[col] = null;
          } else {
            row[col] = token.replace(/^['"]|['"]$/g, '');
          }
        });

        if (!row.created_at) row.created_at = new Date().toISOString();
        if (!row.updated_at) row.updated_at = new Date().toISOString();

        // Enforce unique constraints (e.g. tenant_id + email, tenant_id + idempotency_key, tenant_id + external_lead_id)
        if (tableName === 'users' && row.tenant_id && row.email) {
          const exists = table.some(
            (r) => r.tenant_id === row.tenant_id && r.email.toLowerCase() === row.email.toLowerCase()
          );
          if (exists) {
            throw new Error(`Unique constraint violation: tenant_id + email already exists`);
          }
        }
        if (tableName === 'workflow_executions' && row.tenant_id && row.idempotency_key) {
          const exists = table.some(
            (r) => r.tenant_id === row.tenant_id && r.idempotency_key === row.idempotency_key
          );
          if (exists) {
            throw new Error(`Unique constraint violation: tenant_id + idempotency_key already exists`);
          }
        }
        if (tableName === 'leads' && row.tenant_id && row.external_lead_id) {
          const exists = table.some(
            (r) => r.tenant_id === row.tenant_id && r.external_lead_id === row.external_lead_id
          );
          if (exists) {
            throw new Error(`Unique constraint violation: tenant_id + external_lead_id already exists`);
          }
        }

        table.push(row);
        this.tables.set(tableName, table);

        if (lower.includes('returning')) {
          return [row] as unknown as T[];
        }
        return [row] as unknown as T[];
      }
    }

    return [] as T[];
  }

  async execute(sql: string, params: any[] = []): Promise<number> {
    const trimmed = sql.trim();
    const lower = trimmed.toLowerCase();

    // UPDATE handling
    if (lower.startsWith('update')) {
      const match = trimmed.match(/update\s+([a-zA-Z0-9_]+)\s+set\s+([\s\S]+?)(?:\s+where\s+([\s\S]+))?$/i);
      if (match) {
        const tableName = match[1];
        const setClause = match[2];
        const whereClause = match[3];

        const table = this.tables.get(tableName) || [];
        const filtered = whereClause ? this.filterRows(table, whereClause, params) : table;

        // Split set clause by top-level commas (not inside parentheses)
        const setPairs: string[] = [];
        let currentPair = '';
        let depth = 0;
        for (let i = 0; i < setClause.length; i++) {
          const char = setClause[i];
          if (char === '(') depth++;
          else if (char === ')') depth--;
          if (char === ',' && depth === 0) {
            setPairs.push(currentPair.trim());
            currentPair = '';
          } else {
            currentPair += char;
          }
        }
        if (currentPair.trim()) setPairs.push(currentPair.trim());

        let count = 0;
        for (const row of filtered) {
          for (const pair of setPairs) {
            const eqIdx = pair.indexOf('=');
            if (eqIdx === -1) continue;
            const col = pair.substring(0, eqIdx).trim().replace(/["`]/g, '');
            let valRef = pair.substring(eqIdx + 1).trim();

            if (valRef.toLowerCase().startsWith('coalesce')) {
              const coalesceMatch = valRef.match(/coalesce\s*\(\s*(\$[0-9]+)\s*,\s*([a-zA-Z0-9_]+)\s*\)/i);
              if (coalesceMatch) {
                const pIndex = parseInt(coalesceMatch[1].substring(1), 10) - 1;
                const fallbackCol = coalesceMatch[2];
                const paramVal = params[pIndex];
                row[col] = paramVal !== null && paramVal !== undefined ? paramVal : row[fallbackCol];
              }
            } else if (valRef.startsWith('$')) {
              const pIndex = parseInt(valRef.substring(1), 10) - 1;
              row[col] = params[pIndex];
            } else if (valRef.toLowerCase() === 'now()') {
              row[col] = new Date().toISOString();
            } else {
              row[col] = valRef.replace(/^['"]|['"]$/g, '');
            }
          }
          row.updated_at = new Date().toISOString();
          count++;
        }
        return count;
      }
    }

    // DELETE handling
    if (lower.startsWith('delete from')) {
      const match = trimmed.match(/delete\s+from\s+([a-zA-Z0-9_]+)(?:\s+where\s+([\s\S]+))?$/i);
      if (match) {
        const tableName = match[1];
        const whereClause = match[2];
        const table = this.tables.get(tableName) || [];
        if (!whereClause) {
          const count = table.length;
          this.tables.set(tableName, []);
          return count;
        }

        const toDelete = this.filterRows(table, whereClause, params);
        const toDeleteIds = new Set(toDelete.map((r) => r.id));
        const remaining = table.filter((r) => !toDeleteIds.has(r.id));
        this.tables.set(tableName, remaining);
        return toDelete.length;
      }
    }

    return 0;
  }

  private filterRows(rows: any[], whereClause: string, params: any[]): any[] {
    const conditions = whereClause.split(/\s+and\s+/i);
    return rows.filter((row) => {
      return conditions.every((cond) => {
        const trimmedCond = cond.trim();
        const match = trimmedCond.match(/^([a-zA-Z0-9_]+)\s*(=|!=|>=|<=|>|<|\bIN\b|\bLIKE\b|\bIS\b)\s*([\s\S]+)$/i);
        if (!match) return true;
        
        const col = match[1].trim().replace(/["`]/g, '');
        const op = match[2].trim().toUpperCase();
        let valRef = match[3].trim();

        let expectedVal: any;
        if (valRef.startsWith('$')) {
          const pIdx = parseInt(valRef.substring(1), 10) - 1;
          expectedVal = params[pIdx];
        } else if (valRef === 'NULL' || valRef === 'null') {
          expectedVal = null;
        } else {
          expectedVal = valRef.replace(/^['"]|['"]$/g, '');
        }

        const rowVal = row[col];
        if (op === '=') {
          return String(rowVal) === String(expectedVal);
        }
        if (op === '!=') {
          return String(rowVal) !== String(expectedVal);
        }
        if (op === 'IS') {
          return expectedVal === null ? rowVal == null : rowVal === expectedVal;
        }
        return true;
      });
    });
  }

  async transaction<T>(fn: (tx: IDatabase) => Promise<T>): Promise<T> {
    return fn(this);
  }

  async close(): Promise<void> {}
}

let dbInstance: IDatabase | null = null;

export function getDatabase(forceMemory = false): IDatabase {
  if (dbInstance) return dbInstance;
  if (forceMemory || process.env.NODE_ENV === 'test' || !process.env.DATABASE_URL) {
    dbInstance = new MemoryDatabase();
  } else {
    dbInstance = new PgDatabase();
  }
  return dbInstance;
}

export function setDatabase(db: IDatabase): void {
  dbInstance = db;
}
