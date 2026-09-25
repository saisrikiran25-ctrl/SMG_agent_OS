import { LeadExtractionResult, ProductContextItem } from '@smb/shared';

export interface AIProvider {
  detectLanguage(text: string): Promise<string>;
  extractLeadFields(text: string, language: string): Promise<LeadExtractionResult>;
  draftFollowup(params: {
    lead: LeadExtractionResult;
    context: ProductContextItem[];
    language: string;
    businessName: string;
  }): Promise<{ draft_text: string; confidence: number }>;
}

export class MockAIProvider implements AIProvider {
  async detectLanguage(text: string): Promise<string> {
    const lower = text.toLowerCase();
    // Telugu detection
    if (/[\u0C00-\u0C7F]/.test(text) || /\b(namaskaram|kavali|dhanyavadalu|meeku|unnaya|enti|repu|basta)\b/i.test(lower)) {
      return 'te';
    }
    // Hindi detection
    if (/[\u0900-\u097F]/.test(text) || /\b(namaste|chahiye|kitna|dam|kripya|bhejo|hai|bhaiya|kal)\b/i.test(lower)) {
      return 'hi';
    }
    // Tamil detection
    if (/[\u0B80-\u0BFF]/.test(text) || /\b(vanakkam|thevai|vilai|eppothu|irukka|naalai)\b/i.test(lower)) {
      return 'ta';
    }
    // Kannada detection
    if (/[\u0C80-\u0CFF]/.test(text) || /\b(namaskara|beku|eshtu|yavaga|naale)\b/i.test(lower)) {
      return 'kn';
    }
    // Malayalam detection
    if (/[\u0D00-\u0D7F]/.test(text) || /\b(namaskaram|venam|ethra)\b/i.test(lower)) {
      return 'ml';
    }
    // Marathi detection
    if (/\b(namaskar|pahije|kiti|dya)\b/i.test(lower)) {
      return 'mr';
    }
    // Bengali detection
    if (/[\u0980-\u09FF]/.test(text) || /\b(nomoshkar|lagbe|koto)\b/i.test(lower)) {
      return 'bn';
    }
    // Gujarati detection
    if (/[\u0A80-\u0AFF]/.test(text) || /\b(namaste|joie|ketla)\b/i.test(lower)) {
      return 'gu';
    }
    return 'en';
  }

  async extractLeadFields(text: string, language: string): Promise<LeadExtractionResult> {
    const lower = text.toLowerCase();
    
    // Adversarial / Injection Detection
    if (
      lower.includes('ignore previous instructions') ||
      lower.includes('system override') ||
      lower.includes('system prompt') ||
      lower.includes('bypass approval') ||
      lower.includes('send 1000 free units') ||
      lower.includes('drop table') ||
      lower.includes('--') ||
      lower.includes(';')
    ) {
      return {
        missing_information: ['invalid_prompt_injection_attempt'],
        recommended_action: 'escalate_to_security',
        confidence: 0.2,
        intent: 'spam',
        sentiment: 'frustrated',
        questions: ['Security Alert: Adversarial injection or forbidden syntax detected'],
      };
    }

    // Refund Request Detection
    if (
      lower.includes('refund') ||
      lower.includes('return') ||
      lower.includes('wapas') ||
      lower.includes('dabbu wapas') ||
      lower.includes('damaged')
    ) {
      return {
        missing_information: ['order_id', 'reason_for_refund'],
        recommended_action: 'escalate_to_owner',
        confidence: 0.7,
        intent: 'refund_request',
        sentiment: 'frustrated',
        questions: ['Customer is asking for a refund / reporting damaged stock.'],
      };
    }

    // Extraction: Quantity (supports English digits, Telugu, Hindi numerals)
    let quantity: number | undefined;
    const qtyMatch = text.match(/(\d+)\s*(units|pieces|boxes|bags|kg|pcs|quintal|nos|బస్తాలు|बस्ता|பல்புகள்|ಬ್ಯಾಗ್)?/i);
    if (qtyMatch) {
      quantity = parseInt(qtyMatch[1], 10);
    }

    // Extraction: Location (Indian Cities in English & Indian Scripts)
    let delivery_location: string | undefined;
    const locationMap: Array<{ pattern: RegExp; canonical: string }> = [
      { pattern: /tirupati|తిరుపతి/i, canonical: 'Tirupati' },
      { pattern: /hyderabad|హైదరాబాద్|हैदराबाद/i, canonical: 'Hyderabad' },
      { pattern: /bengaluru|bangalore|ಬೆಂಗಳೂರು|बेंगलुरु/i, canonical: 'Bengaluru' },
      { pattern: /chennai|சென்னை|चेन्नई/i, canonical: 'Chennai' },
      { pattern: /mumbai|मुंबई|बॉम्बे/i, canonical: 'Mumbai' },
      { pattern: /delhi|दिल्ली/i, canonical: 'Delhi' },
      { pattern: /vijayawada|విజయవాడ/i, canonical: 'Vijayawada' },
      { pattern: /visakhapatnam|vizag|విశాఖపట్నం/i, canonical: 'Visakhapatnam' },
      { pattern: /guntur|గుంటూరు/i, canonical: 'Guntur' },
      { pattern: /pune|पुणे/i, canonical: 'Pune' },
      { pattern: /kolkata|কলকাতা/i, canonical: 'Kolkata' },
      { pattern: /ahmedabad|અમદાવાદ/i, canonical: 'Ahmedabad' },
    ];

    for (const loc of locationMap) {
      if (loc.pattern.test(text)) {
        delivery_location = loc.canonical;
        break;
      }
    }

    // Extraction: Timeframe
    let requested_time: string | undefined;
    if (/next week|వచ్చే వారం|अगले हफ्ते/i.test(text)) requested_time = 'next week';
    else if (/tomorrow|repu|రేపు|kal|कल|naalai|நாளை|naale|ನಾಳೆ/i.test(text)) requested_time = 'tomorrow';
    else if (/urgent|asap|త్వరగా|जल्दी/i.test(text)) requested_time = 'immediately';
    else if (/this month|ఈ నెల|इस महीने/i.test(text)) requested_time = 'this month';

    // Extraction: Phone
    let phone: string | undefined;
    const phoneMatch = text.match(/(\+?91[-.\s]?)?[6789]\d{9}/);
    if (phoneMatch) {
      phone = phoneMatch[0].replace(/\s+/g, '');
    }

    // Extraction: Name
    let name: string | undefined;
    const nameMatch = text.match(/(?:i am|my name is|nenu|mera naam|నా పేరు|मेरा नाम|என் பெயர்)\s+([A-Za-z\u0900-\u0D7F]+(?:\s+[A-Za-z\u0900-\u0D7F]+)?)/i);
    if (nameMatch) {
      name = nameMatch[1];
    }

    // Extraction: Product
    let product: string | undefined;
    const productPatterns: Array<{ pattern: RegExp; name: string }> = [
      { pattern: /organic fertilizer|సేంద్రీయ ఎరువులు|जैविक खाद/i, name: 'Organic Fertilizer' },
      { pattern: /basmati rice|బాస్మతి బియ్యం|बासमती चावल/i, name: 'Basmati Rice' },
      { pattern: /sona masoori|సోనా మసూరి/i, name: 'Sona Masoori Rice' },
      { pattern: /cotton saree|కాటన్ చీరలు|कॉटन साड़ी/i, name: 'Cotton Saree' },
      { pattern: /silk saree|పట్టు చీరలు|सिल्क साड़ी/i, name: 'Silk Saree' },
      { pattern: /cement|సిమెంట్|सीमेंट/i, name: 'Cement Bag' },
      { pattern: /led bulb|ఎల్ఇడి బల్బు|एलईडी बल्ब/i, name: 'LED Bulbs' },
    ];

    for (const p of productPatterns) {
      if (p.pattern.test(text)) {
        product = p.name;
        break;
      }
    }

    const missing_information: string[] = [];
    if (!product) missing_information.push('product_variant');
    if (!delivery_location) missing_information.push('delivery_location');

    return {
      name,
      phone,
      product,
      quantity,
      delivery_location,
      requested_time,
      budget: text.match(/(?:budget|rs|inr|₹|రూ|దర|వెల)\s*(\d+(?:,\d+)?)/i)?.[1],
      timeframe: requested_time,
      questions: [],
      intent: 'purchase_inquiry',
      sentiment: /urgent|asap|త్వరగా/i.test(text) ? 'urgent' : 'positive',
      missing_information,
      recommended_action: 'salesperson_followup',
      confidence: 0.92,
    };
  }

  async draftFollowup(params: {
    lead: LeadExtractionResult;
    context: ProductContextItem[];
    language: string;
    businessName: string;
  }): Promise<{ draft_text: string; confidence: number }> {
    const { lead, context, language, businessName } = params;

    const matchedProduct = context.find((c) =>
      lead.product ? c.name.toLowerCase().includes(lead.product.toLowerCase()) : false
    ) || context[0];

    let draft = '';

    if (language === 'te') {
      if (matchedProduct && matchedProduct.verification_status === 'verified') {
        draft = `నమస్కారం! ${businessName} నుండి ధన్యవాదాలు. మీరు అడిగిన ${matchedProduct.name} ధర యూనిట్‌కి ₹${matchedProduct.price}. ${
          lead.quantity ? `${lead.quantity} యూనిట్లు అందుబాటులో ఉన్నాయి.` : ''
        } ${lead.delivery_location ? `${lead.delivery_location} కి డెలివరీ వివరాలను` : 'ఆర్డర్ ని'} నిర్ధారించడానికి మా మేనేజర్ మిమ్మల్ని సంప్రదిస్తారు.`;
      } else {
        draft = `నమస్కారం! ${businessName} నుండి ధన్యవాదాలు. మీ ఆర్డర్ వివరాలను పరిశీలిస్తున్నాము. మా సేల్స్ టీమ్ త్వరలో మీకు పూర్తి ధర మరియు డెలివరీ వివరాలు తెలియజేస్తారు.`;
      }
    } else if (language === 'hi') {
      if (matchedProduct && matchedProduct.verification_status === 'verified') {
        draft = `नमस्ते! ${businessName} में आपका स्वागत है। ${matchedProduct.name} की कीमत ₹${matchedProduct.price} प्रति यूनिट है। ${
          lead.quantity ? `${lead.quantity} यूनिट्स का ऑर्डर` : ''
        } ${lead.delivery_location ? `${lead.delivery_location} डिलीवरी के लिए` : ''} हमारे सेल्स मैनेजर आपसे जल्द संपर्क करेंगे।`;
      } else {
        draft = `नमस्ते! ${businessName} से संपर्क करने के लिए धन्यवाद। हम आपके अनुरोध की पुष्टि कर रहे हैं और हमारे प्रतिनिधि जल्द आपसे संपर्क करेंगे।`;
      }
    } else {
      if (matchedProduct && matchedProduct.verification_status === 'verified') {
        draft = `Hello! Thank you for reaching out to ${businessName}. For ${matchedProduct.name}, our verified price is ₹${matchedProduct.price} per unit. ${
          lead.quantity ? `We have ${lead.quantity} units available.` : ''
        } ${
          lead.delivery_location
            ? `Our sales manager will confirm delivery schedule to ${lead.delivery_location}.`
            : 'Our team will assist with final delivery confirmation.'
        }`;
      } else {
        draft = `Hello! Thank you for contacting ${businessName}. We have received your inquiry${
          lead.quantity ? ` for ${lead.quantity} units` : ''
        }. Our sales executive will review our updated catalogue and get back to you shortly.`;
      }
    }

    return {
      draft_text: draft,
      confidence: matchedProduct && matchedProduct.verification_status === 'verified' ? 0.95 : 0.85,
    };
  }
}
