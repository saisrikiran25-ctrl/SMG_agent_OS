import { Router, Response } from 'express';
import { getDatabase } from '../db/database';
import { KnowledgeRepository } from '../repositories';
import { authenticate, AuthenticatedRequest, requireRole } from '../middleware/auth.middleware';

export const knowledgeRouter = Router();
const db = getDatabase();
const knowledgeRepo = new KnowledgeRepository(db);

knowledgeRouter.use(authenticate);

// List all documents
knowledgeRouter.get('/documents', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const docs = await knowledgeRepo.listDocuments(tenantId);
    res.json(docs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Upload document (JSON / text / parsed PDF / CSV)
knowledgeRouter.post(
  '/upload',
  requireRole(['Owner', 'Admin', 'Manager']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const { title, category, verification_status, raw_content, metadata } = req.body;

      if (!title || !raw_content) {
        return res.status(400).json({ error: 'Title and raw_content are required' });
      }

      const doc = await knowledgeRepo.createDocument({
        tenant_id: tenantId,
        title,
        category: category || 'catalogue',
        verification_status: verification_status || 'verified',
        raw_content,
        metadata: metadata || {},
      });

      res.status(201).json(doc);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

// Search Knowledge Base (Vector/Lexical RAG Search)
knowledgeRouter.get('/search', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const query = (req.query.q as string) || '';
    const onlyVerified = req.query.verified !== 'false';
    const results = await knowledgeRepo.searchProductKnowledge(tenantId, query, onlyVerified);
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update Verification Status (verified / draft / expired)
knowledgeRouter.patch(
  '/documents/:id/status',
  requireRole(['Owner', 'Admin', 'Manager']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const docId = req.params.id;
      const { status } = req.body;

      if (!['verified', 'draft', 'expired'].includes(status)) {
        return res.status(400).json({ error: 'Status must be verified, draft, or expired' });
      }

      await knowledgeRepo.updateVerificationStatus(tenantId, docId, status);
      res.json({ success: true, docId, status });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);
