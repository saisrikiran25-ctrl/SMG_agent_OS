import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/database';
import { AgentRuntimeEngine } from '../engine/agent_runtime';
import { ToolGatewayService } from '../tools/tool_gateway';
import { AuditRepository, TenantRepository } from '../repositories';

export const webhookRouter = Router();
const db = getDatabase();
const toolGateway = new ToolGatewayService(db);
const runtimeEngine = new AgentRuntimeEngine(db, toolGateway);
const auditRepo = new AuditRepository(db);
const tenantRepo = new TenantRepository(db);

// WhatsApp Webhook Verification (Meta API Challenge)
webhookRouter.get('/whatsapp', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'smb_agent_wa_token_2026';

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// WhatsApp Inbound Message Webhook
webhookRouter.post('/whatsapp', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    // Extract Meta WhatsApp Cloud API format or Mock payload format
    let tenantId = req.headers['x-tenant-id'] as string;
    let senderPhone = '+919988776655';
    let senderName = 'WhatsApp Customer';
    let messageText = '';
    let messageId = `wa_msg_${Date.now()}`;

    if (body.object === 'whatsapp_business_account' && body.entry?.[0]?.changes?.[0]?.value) {
      const value = body.entry[0].changes[0].value;
      const msg = value.messages?.[0];
      const contact = value.contacts?.[0];

      if (msg) {
        messageId = msg.id;
        senderPhone = msg.from;
        messageText = msg.text?.body || '';
        senderName = contact?.profile?.name || senderPhone;
      }
    } else {
      // Direct / Mock webhook format
      tenantId = body.tenant_id || tenantId;
      senderPhone = body.sender_phone || senderPhone;
      senderName = body.sender_name || senderName;
      messageText = body.message_text || body.text || '';
      messageId = body.external_lead_id || messageId;
    }

    if (!tenantId) {
      // Use fallback default tenant if configured
      const defaultTenant = (await db.query('SELECT id FROM tenants LIMIT 1'))[0];
      tenantId = defaultTenant?.id;
    }

    if (!tenantId || !messageText) {
      return res.status(400).json({ error: 'tenant_id and message_text are required' });
    }

    const result = await runtimeEngine.processInboundLead({
      tenant_id: tenantId,
      channel: 'whatsapp',
      external_lead_id: messageId,
      sender_phone: senderPhone,
      sender_name: senderName,
      message_text: messageText,
    });

    res.status(200).json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Web-Form Submission Webhook
webhookRouter.post('/form', async (req: Request, res: Response) => {
  try {
    const { tenant_id, name, phone, email, product, quantity, message, location } = req.body;

    if (!tenant_id) {
      return res.status(400).json({ error: 'tenant_id is required' });
    }

    const fullMessage = message || `Inquiry for ${quantity || ''} ${product || 'items'}. Delivery to ${location || ''}.`;
    const extId = `form_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const result = await runtimeEngine.processInboundLead({
      tenant_id,
      channel: 'web_form',
      external_lead_id: extId,
      sender_phone: phone,
      sender_name: name,
      message_text: fullMessage,
    });

    res.status(201).json({ success: true, lead_id: extId, result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
