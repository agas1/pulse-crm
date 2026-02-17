import nodemailer from 'nodemailer';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId: string;
  error?: string;
}

export class EmailClient {
  private transporter: nodemailer.Transporter;
  private config: SmtpConfig;

  constructor(config: SmtpConfig) {
    this.config = config;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }

  async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    trackingId?: string;
    baseUrl?: string;
    enrollmentId?: string;
  }): Promise<SendEmailResult> {
    let html = params.html;

    // Inject unsubscribe link
    if (params.enrollmentId && params.baseUrl) {
      html += `\n<p style="font-size:11px;color:#999;margin-top:40px;text-align:center;border-top:1px solid #eee;padding-top:12px;">Nao deseja mais receber? <a href="${params.baseUrl}/api/unsubscribe/${params.enrollmentId}" style="color:#666;">Cancelar inscricao</a></p>`;
    }

    // Inject open tracking pixel
    if (params.trackingId && params.baseUrl) {
      html += `<img src="${params.baseUrl}/api/track/open/${params.trackingId}" width="1" height="1" style="display:none" />`;

      // Rewrite links for click tracking
      html = html.replace(
        /href="(https?:\/\/[^"]+)"/g,
        (_match, url) => `href="${params.baseUrl}/api/track/click/${params.trackingId}?url=${encodeURIComponent(url)}"`
      );
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
        to: params.to,
        subject: params.subject,
        html,
      });
      return { success: true, messageId: info.messageId };
    } catch (err) {
      return { success: false, messageId: '', error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
}
