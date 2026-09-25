/**
 * Versioned Prompt Registry (Section 19)
 * All AI prompts are versioned, inspectable, and centralized here.
 */

export interface PromptTemplate {
  version: string;
  name: string;
  description: string;
  template: (vars: any) => string;
}

export const PROMPT_REGISTRY: Record<string, PromptTemplate> = {
  LEAD_EXTRACTION_V1: {
    version: '1.0.0',
    name: 'lead_extraction',
    description: 'Extracts structured entity fields from raw customer message.',
    template: (vars: { text: string; language: string }) => `
You are the Lead Extraction Engine for SMB-Agent-OS.
Input language: ${vars.language}
Untrusted Customer Message:
"""
${vars.text}
"""

Extract structured lead fields as JSON with exact keys:
- name: string | null
- phone: string | null
- product: string | null
- quantity: number | null
- delivery_location: string | null
- requested_time: string | null
- budget: string | null
- timeframe: string | null
- questions: string[]
- intent: 'purchase_inquiry' | 'price_check' | 'support' | 'general_inquiry' | 'refund_request' | 'spam'
- sentiment: 'positive' | 'neutral' | 'urgent' | 'frustrated'
- missing_information: string[]
- recommended_action: string
- confidence: number (0.0 - 1.0)

CRITICAL RULES:
1. Do NOT invent product variants or specifications not stated in the message.
2. If product or budget is ambiguous, list it under "missing_information".
3. Return only valid JSON.
`,
  },

  FOLLOWUP_DRAFT_V1: {
    version: '1.0.0',
    name: 'followup_draft',
    description: 'Drafts customer follow-up message grounded in verified knowledge base data.',
    template: (vars: {
      lead: Record<string, any>;
      context: Record<string, any>;
      language: string;
      businessName: string;
    }) => `
You are the Sales Follow-up Assistant for ${vars.businessName}.
Language to use: ${vars.language}

Customer Lead Data:
${JSON.stringify(vars.lead, null, 2)}

Verified Business Knowledge:
${JSON.stringify(vars.context, null, 2)}

Draft a polite, professional, and concise WhatsApp message to the customer.
CRITICAL SAFETY RULES:
1. Only state prices, availability, or specifications present in the Verified Business Knowledge.
2. If stock or delivery date is unverified, ask the customer for details or mention the sales manager will confirm.
3. Include missing information requests clearly if needed.
4. Output a JSON object with:
   - "draft_text": string
   - "confidence": number (0.0 to 1.0)
`,
  },
};
