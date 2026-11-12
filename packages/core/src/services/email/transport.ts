// ==========================================
// EMAIL TRANSPORT - Nodemailer Configuration
// ==========================================

import type { Transporter } from 'nodemailer';
import nodemailer from 'nodemailer';

/**
 * Configuração do servidor SMTP a partir de variáveis de ambiente
 */
export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

/**
 * Obtém configuração SMTP das variáveis de ambiente
 */
export function getSmtpConfig(): SmtpConfig {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true';

  if (!host || !user || !pass) {
    throw new Error(
      'Configuração SMTP incompleta. Defina SMTP_HOST, SMTP_USER e SMTP_PASS'
    );
  }

  return {
    host,
    port,
    secure,
    auth: { user, pass },
  };
}

/**
 * Obtém configuração SMTP para modo de teste (Inbucket)
 */
function getInbucketConfig() {
  const host = process.env.INBUCKET_SMTP_HOST;
  const port = process.env.INBUCKET_SMTP_PORT ? parseInt(process.env.INBUCKET_SMTP_PORT, 10) : undefined;
  const webPort = process.env.INBUCKET_WEB_PORT;

  if (!host || !port || !webPort) {
    throw new Error(
      'Configuração Inbucket incompleta. Defina INBUCKET_SMTP_HOST, INBUCKET_SMTP_PORT e INBUCKET_WEB_PORT'
    );
  }

  return { host, port, webPort };
}

/**
 * Cria um transporter Nodemailer com a configuração SMTP
 * 
 * MODO DE DESENVOLVIMENTO (Supabase Local Inbucket):
 * - Se NODE_ENV !== 'production', usa Inbucket do Supabase
 * - Requer variáveis de ambiente:
 *   - INBUCKET_SMTP_HOST (ex: localhost)
 *   - INBUCKET_SMTP_PORT (ex: 54325)
 *   - INBUCKET_WEB_PORT (ex: 54334)
 * - Não requer autenticação
 * 
 * MODO DE PRODUÇÃO:
 * - Requer variáveis de ambiente:
 *   - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE
 */
export function createEmailTransporter(): Transporter {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const devHost = process.env.SMTP_HOST?.trim();

  if (isDevelopment && devHost) {
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 1025;
    const secure = process.env.SMTP_SECURE === 'true';
    return nodemailer.createTransport({
      host: devHost,
      port,
      secure,
      ignoreTLS: !secure,
    });
  }

  if (isDevelopment) {
    const { host, port, webPort } = getInbucketConfig();
    
    console.log('📧 [EMAIL] Modo de desenvolvimento ativado - usando Inbucket (Supabase local)');
    
    const devTransporter = nodemailer.createTransport({
      host,
      port,
      secure: false,
      auth: {
        user: '',
        pass: '',
      },
    });

    console.log('✅ [EMAIL] Transporter de desenvolvimento criado');
    console.log(`📬 [EMAIL] SMTP: ${host}:${port}`);
    console.log(`🔗 [EMAIL] Visualizar emails em: http://localhost:${webPort}`);

    return devTransporter;
  }

  const config = getSmtpConfig();
  return nodemailer.createTransport(config);
}

