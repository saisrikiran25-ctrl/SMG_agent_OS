import { BaseRepository } from './base.repository';
import { v4 as uuidv4 } from 'uuid';
import { LeadExtractionResult } from '@smb/shared';

export interface CustomerRecord {
  id: string;
  tenant_id: string;
  phone?: string;
  name?: string;
  email?: string;
  city?: string;
  state?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LeadRecord {
  id: string;
  tenant_id: string;
  customer_id?: string;
  external_lead_id: string;
  channel: string;
  contact_name?: string;
  phone?: string;
  product_requested?: string;
  quantity?: number;
  delivery_location?: string;
  budget?: string;
  status: string;
  qualification_score: number;
  extracted_fields: LeadExtractionResult | Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export class CustomerLeadRepository extends BaseRepository {
  async upsertCustomer(
    tenantId: string,
    phone: string,
    name?: string,
    city?: string
  ): Promise<CustomerRecord> {
    this.assertTenant(tenantId);
    const existing = await this.db.query<CustomerRecord>(
      `SELECT * FROM customers WHERE tenant_id = $1 AND phone = $2`,
      [tenantId, phone]
    );

    if (existing.length > 0) {
      if (name || city) {
        await this.db.execute(
          `UPDATE customers SET name = COALESCE($3, name), city = COALESCE($4, city), updated_at = NOW() WHERE tenant_id = $1 AND id = $2`,
          [tenantId, existing[0].id, name || null, city || null]
        );
      }
      return (await this.db.query<CustomerRecord>(
        `SELECT * FROM customers WHERE tenant_id = $1 AND id = $2`,
        [tenantId, existing[0].id]
      ))[0];
    }

    const id = `cust_${uuidv4().substring(0, 8)}`;
    const rows = await this.db.query<CustomerRecord>(
      `INSERT INTO customers (id, tenant_id, phone, name, city, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [id, tenantId, phone, name || null, city || null]
    );
    return rows[0];
  }

  async createLead(data: {
    tenant_id: string;
    customer_id?: string;
    external_lead_id: string;
    channel: string;
    contact_name?: string;
    phone?: string;
    product_requested?: string;
    quantity?: number;
    delivery_location?: string;
    budget?: string;
    status?: string;
    qualification_score?: number;
    extracted_fields?: any;
  }): Promise<LeadRecord> {
    this.assertTenant(data.tenant_id);

    // Check idempotency on tenant_id + external_lead_id
    const existing = await this.findByExternalId(data.tenant_id, data.external_lead_id);
    if (existing) {
      return existing;
    }

    const id = `lead_${uuidv4().substring(0, 8)}`;
    const rows = await this.db.query<LeadRecord>(
      `INSERT INTO leads (
        id, tenant_id, customer_id, external_lead_id, channel, contact_name,
        phone, product_requested, quantity, delivery_location, budget, status,
        qualification_score, extracted_fields, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
      RETURNING *`,
      [
        id,
        data.tenant_id,
        data.customer_id || null,
        data.external_lead_id,
        data.channel,
        data.contact_name || null,
        data.phone || null,
        data.product_requested || null,
        data.quantity || null,
        data.delivery_location || null,
        data.budget || null,
        data.status || 'new',
        data.qualification_score || 0.0,
        JSON.stringify(data.extracted_fields || {}),
      ]
    );
    return rows[0];
  }

  async findByExternalId(tenantId: string, externalLeadId: string): Promise<LeadRecord | null> {
    this.assertTenant(tenantId);
    const rows = await this.db.query<LeadRecord>(
      `SELECT * FROM leads WHERE tenant_id = $1 AND external_lead_id = $2`,
      [tenantId, externalLeadId]
    );
    return rows[0] || null;
  }

  async listLeads(tenantId: string): Promise<LeadRecord[]> {
    this.assertTenant(tenantId);
    return this.db.query<LeadRecord>(
      `SELECT * FROM leads WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
  }
}
