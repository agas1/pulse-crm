import crypto from 'crypto';

export interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  verifyToken: string;
  businessId: string;
}

export interface WhatsAppSendResult {
  success: boolean;
  messageId: string;
  error?: string;
}

const WA_API_BASE = 'https://graph.facebook.com/v21.0';

export class WhatsAppClient {
  private config: WhatsAppConfig;

  constructor(config: WhatsAppConfig) {
    this.config = config;
  }

  async sendTextMessage(to: string, text: string): Promise<WhatsAppSendResult> {
    try {
      const res = await fetch(`${WA_API_BASE}/${this.config.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to.replace(/\D/g, ''),
          type: 'text',
          text: { body: text },
        }),
      });
      const data = await res.json() as any;
      if (data.messages?.[0]?.id) {
        return { success: true, messageId: data.messages[0].id };
      }
      return { success: false, messageId: '', error: JSON.stringify(data.error || data) };
    } catch (err) {
      return { success: false, messageId: '', error: err instanceof Error ? err.message : 'Unknown' };
    }
  }

  async sendTemplateMessage(to: string, templateName: string, languageCode: string): Promise<WhatsAppSendResult> {
    try {
      const res = await fetch(`${WA_API_BASE}/${this.config.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to.replace(/\D/g, ''),
          type: 'template',
          template: { name: templateName, language: { code: languageCode } },
        }),
      });
      const data = await res.json() as any;
      if (data.messages?.[0]?.id) {
        return { success: true, messageId: data.messages[0].id };
      }
      return { success: false, messageId: '', error: JSON.stringify(data.error || data) };
    } catch (err) {
      return { success: false, messageId: '', error: err instanceof Error ? err.message : 'Unknown' };
    }
  }

  async markAsRead(messageId: string): Promise<void> {
    try {
      await fetch(`${WA_API_BASE}/${this.config.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        }),
      });
    } catch {
      // Best effort
    }
  }

  static simulate(to: string, text: string): WhatsAppSendResult {
    console.log(`[WhatsApp SIM] → ${to}: "${text.slice(0, 60)}..."`);
    return { success: true, messageId: `sim_wa_${crypto.randomUUID()}` };
  }
}
