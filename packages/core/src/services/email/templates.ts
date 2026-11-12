// ==========================================
// EMAIL TEMPLATES - HTML and Text Generation
// ==========================================

import { emailBrand as BRAND, escapeEmailHtml as esc, renderEmailDocument } from './document'
import type { EmailTemplateData, PlatformSaleNotificationData } from './types'

/**
 * Gera a seção de detalhes da compra (HTML)
 */
function generateDetailsSection(data: EmailTemplateData): string {
  return `
    <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #1e40af;">Detalhes da compra:</h3>
      <p style="margin: 8px 0;"><strong>Produto:</strong> ${esc(data.productName)}</p>
      <p style="margin: 8px 0;"><strong>Valor:</strong> ${esc(data.priceDisplay)}</p>
      ${data.paymentOptions ? `<p style="margin: 8px 0;"><strong>Condições:</strong> ${esc(data.paymentOptions)}</p>` : ''}
      <p style="margin: 8px 0;"><strong>Forma de pagamento:</strong> ${esc(data.paymentMethod)}</p>
      <p style="margin: 8px 0;"><strong>ID do pedido:</strong> ${esc(data.orderId)}</p>
    </div>
  `;
}

/**
 * Gera a seção de informações de pagamento PIX/Boleto (HTML)
 */
function generatePaymentInfoSection(data: EmailTemplateData): string {
  if (!data.paymentInfo) return '';

  const { pixQrCode, pixCopyPaste, boletoLine, boletoUrl, paymentLinkUrl } = data.paymentInfo;

  // Se já tem dados específicos de PIX, mostrar só o PIX
  if (pixQrCode || pixCopyPaste) {
    return `
      <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #10b981;">
        <h3 style="margin-top: 0; color: #047857;">💳 Pague com PIX</h3>
        ${pixQrCode ? `
          <div style="text-align: center; margin: 15px 0;">
            <img src="${pixQrCode}" alt="QR Code PIX" style="max-width: 200px; height: auto;" />
          </div>
        ` : ''}
        ${pixCopyPaste ? `
          <p style="margin: 10px 0;"><strong>Código PIX (Copia e Cola):</strong></p>
          <div style="background-color: white; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px; word-break: break-all; border: 1px solid #d1d5db;">
            ${pixCopyPaste}
          </div>
        ` : ''}
        <p style="margin-top: 15px; font-size: 14px; color: #065f46;">
          ✅ Pagamento instantâneo • Disponível 24h
        </p>
      </div>
    `;
  }

  // Se já tem dados específicos de Boleto, mostrar só o Boleto
  if (boletoLine || boletoUrl) {
    const { boletoBarcode } = data.paymentInfo || {};
    return `
      <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #f59e0b;">
        <h3 style="margin-top: 0; color: #b45309;">📄 Pague com Boleto</h3>
        ${boletoLine ? `
          <p style="margin: 10px 0;"><strong>Linha digitável:</strong></p>
          <div style="background-color: white; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px; word-break: break-all; border: 1px solid #d1d5db;">
            ${boletoLine}
          </div>
        ` : ''}
        ${boletoBarcode ? `
          <div style="text-align: center; margin: 15px 0;">
            <img src="${boletoBarcode}" alt="Código de Barras" style="max-width: 100%; height: auto;" />
          </div>
        ` : ''}
        ${boletoUrl ? `
          <div style="margin: 20px 0; text-align: center;">
            <a href="${boletoUrl}" 
               style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Baixar Boleto
            </a>
          </div>
        ` : ''}
        <p style="margin-top: 15px; font-size: 14px; color: #92400e;">
          ⏰ Vencimento em 3 dias • Pague em qualquer banco ou lotérica
        </p>
      </div>
    `;
  }

  // Se NÃO tem dados específicos, mostrar link de pagamento (PIX, boleto ou cartão na página)
  if (paymentLinkUrl) {
    return `
      <div style="background-color: #ede9fe; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #8b5cf6;">
        <h3 style="margin-top: 0; color: #6d28d9;">🔗 Seu link de pagamento</h3>
        <p>Clique no botão abaixo para acessar a página de pagamento (PIX, boleto ou cartão):</p>
        <div style="margin: 20px 0; text-align: center;">
          <a href="${paymentLinkUrl}" 
             style="background-color: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Acessar pagamento
          </a>
        </div>
      </div>
    `;
  }

  return '';
}

/**
 * Gera a seção de próximos passos (HTML)
 */
function generateNextStepsSection(data: EmailTemplateData): string {
  if (!data.includeNextSteps || !data.nextSteps || data.nextSteps.length === 0) {
    return '';
  }

  return `
    <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #b45309;">📋 Próximos passos:</h3>
      <ol style="margin: 10px 0; padding-left: 20px;">
        ${data.nextSteps.map(step => `<li style="margin: 8px 0;">${esc(step)}</li>`).join('')}
      </ol>
    </div>
  `;
}

/**
 * Gera template HTML para email
 */
export function generateEmailHtml(data: EmailTemplateData): string {
  const content = `
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:${BRAND.foreground};">${esc(data.subject)}</h1>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Olá <strong>${esc(data.userName)}</strong>,</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;white-space:pre-line;">${esc(data.customMessage)}</p>
    ${data.instructions ? `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;white-space:pre-line;">${esc(data.instructions)}</p>` : ''}
    ${generateDetailsSection(data)}
    ${generatePaymentInfoSection(data)}
    ${generateNextStepsSection(data)}
    <p style="margin:24px 0 0;font-size:16px;line-height:1.6;">Obrigado pela confiança!<br><strong>${esc(data.fromName)}</strong></p>
  `
  return renderEmailDocument({ title: data.subject, brandName: data.fromName, body: content })
}

export function generatePlatformSaleHtml(data: PlatformSaleNotificationData): string {
  const content = `
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">Pagamento confirmado</h1>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.6;"><strong>Pedido:</strong> ${esc(data.orderId)}</p>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.6;"><strong>Produto:</strong> ${esc(data.productName)}</p>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.6;"><strong>Valor:</strong> ${esc(data.priceDisplay)}</p>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.6;"><strong>Cliente:</strong> ${esc(data.customerName)} &lt;${esc(data.customerEmail)}&gt;</p>
    <p style="margin:0;font-size:15px;line-height:1.6;"><strong>Meio:</strong> ${esc(data.paymentMethod)}</p>
  `
  return renderEmailDocument({
    title: 'Pagamento confirmado',
    brandName: 'Quitou',
    body: content,
  })
}

/**
 * Gera template de texto plano para email
 */
export function generateEmailText(data: EmailTemplateData): string {
  let text = `${data.subject}\n\n`;
  text += `Olá ${data.userName},\n\n`;
  text += `${data.customMessage}\n\n`;
  
  if (data.instructions) {
    text += `${data.instructions}\n\n`;
  }
  
  text += `DETALHES DA COMPRA:\n`;
  text += `• Produto: ${data.productName}\n`;
  text += `• Valor: ${data.priceDisplay}\n`;
  if (data.paymentOptions) {
    text += `• Condições: ${data.paymentOptions}\n`;
  }
  text += `• Forma de pagamento: ${data.paymentMethod}\n`;
  text += `• ID do pedido: ${data.orderId}\n\n`;
  
  // Payment info
  if (data.paymentInfo) {
    const { pixCopyPaste, boletoLine, boletoUrl, paymentLinkUrl } = data.paymentInfo;
    
    if (pixCopyPaste) {
      text += `💳 PAGUE COM PIX:\n`;
      text += `Código PIX (Copia e Cola):\n${pixCopyPaste}\n\n`;
    } else if (boletoLine || boletoUrl) {
      text += `📄 PAGUE COM BOLETO:\n`;
      if (boletoLine) {
        text += `Linha digitável:\n${boletoLine}\n`;
      }
      if (boletoUrl) {
        text += `Baixar boleto: ${boletoUrl}\n`;
      }
      text += '\n';
    } else if (paymentLinkUrl) {
      text += `🔗 SEU LINK DE PAGAMENTO:\n`;
      text += `Acesse: ${paymentLinkUrl}\n\n`;
    }
  }
  
  // Next steps
  if (data.includeNextSteps && data.nextSteps && data.nextSteps.length > 0) {
    text += `PRÓXIMOS PASSOS:\n`;
    data.nextSteps.forEach((step, index) => {
      text += `${index + 1}. ${step}\n`;
    });
    text += '\n';
  }
  
  text += `Obrigado pela confiança!\n\n`;
  text += `Até breve,\n${data.fromName}\n\n`;
  text += `--\n`;
  text += `Este é um email automático. Por favor, não responda.`;
  
  return text;
}

