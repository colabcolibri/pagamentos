// ==========================================
// EMAIL ADAPTER - Interface genérica
// ==========================================
// Implemente esta interface para seu provider de email

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  from?: {
    name: string;
    email: string;
  };
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: string | Uint8Array;
    contentType?: string;
  }>;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: any;
}

/**
 * Interface que qualquer provider de email deve implementar
 */
export interface EmailAdapter {
  send(message: EmailMessage): Promise<EmailSendResult>;
}

// ==========================================
// EMAIL SERVICE - Agnóstico de provider
// ==========================================

export class EmailService {
  constructor(private adapter: EmailAdapter) {}

  /**
   * Envia email de link de pagamento
   */
  async sendPaymentLink(data: {
    to: string;
    userName: string;
    productName: string;
    paymentLinkUrl: string;
    fromName?: string;
    fromEmail?: string;
  }): Promise<EmailSendResult> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Olá, ${data.userName}!</h2>
        <p>Falta pouco para você garantir seu acesso ao <strong>${data.productName}</strong>.</p>
        <p>Clique no botão abaixo para finalizar sua compra:</p>
        <div style="margin: 25px 0; text-align: center;">
          <a href="${data.paymentLinkUrl}" 
             style="background-color: #2563eb; color: white; padding: 15px 25px; text-decoration: none; border-radius: 8px; display: inline-block;">
            Finalizar Compra
          </a>
        </div>
        <p style="font-size: 12px; color: #666;">
          Ou acesse: ${data.paymentLinkUrl}
        </p>
      </div>
    `;

    return this.adapter.send({
      to: data.to,
      subject: `Finalize sua compra - ${data.productName}`,
      html,
      from: data.fromName && data.fromEmail 
        ? { name: data.fromName, email: data.fromEmail }
        : undefined,
    });
  }

  /**
   * Envia email de confirmação de pagamento
   */
  async sendPaymentConfirmation(data: {
    to: string;
    userName: string;
    productName: string;
    amount: string;
    paymentMethod: string;
    orderId: string;
    fromName?: string;
    fromEmail?: string;
  }): Promise<EmailSendResult> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>🎉 Pagamento confirmado!</h2>
        <p>Olá <strong>${data.userName}</strong>,</p>
        <p>Seu pagamento foi confirmado com sucesso!</p>
        <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Detalhes da compra:</h3>
          <p><strong>Produto:</strong> ${data.productName}</p>
          <p><strong>Valor:</strong> ${data.amount}</p>
          <p><strong>Forma de pagamento:</strong> ${data.paymentMethod}</p>
          <p><strong>ID do pedido:</strong> ${data.orderId}</p>
        </div>
        <p>Obrigado pela confiança!</p>
      </div>
    `;

    return this.adapter.send({
      to: data.to,
      subject: `✅ Pagamento confirmado - ${data.productName}`,
      html,
      from: data.fromName && data.fromEmail
        ? { name: data.fromName, email: data.fromEmail }
        : undefined,
    });
  }

  /**
   * Método genérico para enviar qualquer email
   */
  async send(message: EmailMessage): Promise<EmailSendResult> {
    return this.adapter.send(message);
  }
}

