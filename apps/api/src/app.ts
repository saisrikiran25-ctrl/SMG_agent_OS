import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.routes';
import { workspaceRouter } from './routes/workspace.routes';
import { knowledgeRouter } from './routes/knowledge.routes';
import { approvalRouter } from './routes/approval.routes';
import { workflowRouter } from './routes/workflow.routes';
import { auditRouter } from './routes/audit.routes';
import { evalRouter } from './routes/eval.routes';
import { dashboardRouter } from './routes/dashboard.routes';
import { webhookRouter } from './routes/webhook.routes';

export const app = express();

app.use(cors());
app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'smb-agent-os-api', timestamp: new Date().toISOString() });
});

// Mount Routes
app.use('/api/auth', authRouter);
app.use('/api/workspaces', workspaceRouter);
app.use('/api/knowledge', knowledgeRouter);
app.use('/api/approvals', approvalRouter);
app.use('/api/workflows', workflowRouter);
app.use('/api/audit', auditRouter);
app.use('/api/evaluations', evalRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/webhooks', webhookRouter);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled API Error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});
