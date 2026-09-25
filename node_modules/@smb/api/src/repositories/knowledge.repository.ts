import { BaseRepository } from './base.repository';
import { v4 as uuidv4 } from 'uuid';
import { DocumentVerificationStatus, ProductContextItem } from '@smb/shared';

export interface DocumentRecord {
  id: string;
  tenant_id: string;
  source_id?: string;
  title: string;
  category: string;
  verification_status: DocumentVerificationStatus;
  raw_content: string;
  metadata: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface DocumentChunkRecord {
  id: string;
  tenant_id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  metadata: Record<string, any>;
  keywords: string[];
  created_at?: string;
}

export class KnowledgeRepository extends BaseRepository {
  async createDocument(data: {
    tenant_id: string;
    title: string;
    category?: string;
    verification_status?: DocumentVerificationStatus;
    raw_content: string;
    metadata?: Record<string, any>;
  }): Promise<DocumentRecord> {
    this.assertTenant(data.tenant_id);
    const id = `doc_${uuidv4().substring(0, 8)}`;
    const category = data.category || 'catalogue';
    const status = data.verification_status || 'verified';
    const metadata = data.metadata || {};

    const rows = await this.db.query<DocumentRecord>(
      `INSERT INTO documents (id, tenant_id, title, category, verification_status, raw_content, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [id, data.tenant_id, data.title, category, status, data.raw_content, JSON.stringify(metadata)]
    );

    // Auto-chunk document content into searchable segments
    await this.chunkAndStore(data.tenant_id, id, data.raw_content, metadata);

    return rows[0];
  }

  private async chunkAndStore(
    tenantId: string,
    documentId: string,
    rawContent: string,
    metadata: Record<string, any>
  ): Promise<void> {
    const lines = rawContent.split(/\n+/).filter((l) => l.trim().length > 0);
    const chunkSize = 3; // group lines
    let chunkIdx = 0;

    for (let i = 0; i < lines.length; i += chunkSize) {
      const chunkText = lines.slice(i, i + chunkSize).join('\n');
      const chunkId = `chk_${uuidv4().substring(0, 8)}`;
      const keywords = chunkText
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 2);

      await this.db.query(
        `INSERT INTO document_chunks (id, tenant_id, document_id, chunk_index, content, metadata, keywords, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [chunkId, tenantId, documentId, chunkIdx++, chunkText, JSON.stringify(metadata), keywords]
      );
    }
  }

  async listDocuments(tenantId: string): Promise<DocumentRecord[]> {
    this.assertTenant(tenantId);
    return this.db.query<DocumentRecord>(
      `SELECT * FROM documents WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
  }

  async findDocumentById(tenantId: string, docId: string): Promise<DocumentRecord | null> {
    this.assertTenant(tenantId);
    const rows = await this.db.query<DocumentRecord>(
      `SELECT * FROM documents WHERE tenant_id = $1 AND id = $2`,
      [tenantId, docId]
    );
    return rows[0] || null;
  }

  async updateVerificationStatus(
    tenantId: string,
    docId: string,
    status: DocumentVerificationStatus
  ): Promise<void> {
    this.assertTenant(tenantId);
    await this.db.execute(
      `UPDATE documents SET verification_status = $3, updated_at = NOW() WHERE tenant_id = $1 AND id = $2`,
      [tenantId, docId, status]
    );
  }

  async searchProductKnowledge(
    tenantId: string,
    query: string,
    onlyVerified = true
  ): Promise<ProductContextItem[]> {
    this.assertTenant(tenantId);
    const normalizedQuery = query.toLowerCase();
    const queryTokens = normalizedQuery
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((t) => t.length > 2);

    const docs = await this.listDocuments(tenantId);
    const filteredDocs = onlyVerified
      ? docs.filter((d) => d.verification_status === 'verified')
      : docs;

    const matchedProducts: ProductContextItem[] = [];

    for (const doc of filteredDocs) {
      const docLower = doc.raw_content.toLowerCase();
      // Match score
      let score = 0;
      for (const token of queryTokens) {
        if (docLower.includes(token)) {
          score += 1;
        }
      }

      if (score > 0 || queryTokens.length === 0) {
        // Parse metadata or extract product specs
        const meta = doc.metadata || {};
        matchedProducts.push({
          id: meta.product_id || doc.id,
          name: meta.product_name || doc.title,
          description: meta.description || doc.raw_content.substring(0, 200),
          price: meta.price !== undefined ? Number(meta.price) : 0,
          currency: meta.currency || 'INR',
          in_stock: meta.in_stock !== undefined ? Boolean(meta.in_stock) : true,
          stock_quantity: meta.stock_quantity !== undefined ? Number(meta.stock_quantity) : 100,
          category: doc.category,
          source_document_id: doc.id,
          verification_status: doc.verification_status,
        });
      }
    }

    return matchedProducts;
  }
}
