import { NextResponse } from 'next/server'

import { createEmailTransporter } from '@quitou/core/email'
import { renderEmailDocument } from '@quitou/core/email-document'
import { z } from 'zod'

import { requireAdmin } from '@/lib/auth'
import { formatEmailFrom } from '@/lib/email-helpers'
import { createApiHandler } from '@/lib/errors'
import { loadInstanceConfig, toSmtpOverrides } from '@/lib/platform/instance-config'

const testEmailSchema = z.object({
  to: z.string().email().optional(),
})

export const POST = createApiHandler(
  async (request: Request) => {
    const authResult = await requireAdmin()
    if (!authResult.success) {
      return authResult.response
    }

    const body = await request.json().catch(() => ({}))
    const parsed = testEmailSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'E-mail de destino inválido.' }, { status: 400 })
    }

    const recipient = parsed.data.to ?? authResult.user.email
    if (!recipient) {
      return NextResponse.json({ error: 'Informe um e-mail de destino.' }, { status: 400 })
    }

    const instance = await loadInstanceConfig()
    const fromEmail = instance.smtp.emailFrom || instance.smtp.user
    if (!fromEmail) {
      return NextResponse.json(
        { error: 'Defina o e-mail remetente (EMAIL_FROM ou usuário SMTP) antes de testar.' },
        { status: 422 }
      )
    }

    const transporter = createEmailTransporter(toSmtpOverrides(instance))
    const subject = `[Teste] Configuração de e-mail — ${instance.brand.name}`
    const html = renderEmailDocument({
      title: subject,
      brandName: instance.brand.name,
      footerText: instance.smtp.emailFooterText,
      companyLine: instance.brand.companyLine,
      body: `
        <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;">Envio de teste confirmado</h1>
        <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">
          Se você recebeu esta mensagem, o SMTP e a identidade visual dos e-mails de <strong>${instance.brand.name}</strong> estão funcionando corretamente.
        </p>
        <p style="margin:0;font-size:13px;color:#65758b;">
          Remetente: ${instance.smtp.emailFromName} &lt;${fromEmail}&gt;
        </p>
      `,
    })
    const text = [
      `${instance.brand.name} — Teste de envio`,
      '',
      'Se você recebeu esta mensagem, o SMTP e o rodapé dos e-mails estão funcionando corretamente.',
      instance.smtp.emailFooterText ?? '',
      instance.brand.companyLine ?? '',
    ]
      .filter(Boolean)
      .join('\n')

    await transporter.sendMail({
      from: formatEmailFrom(fromEmail, instance.smtp.emailFromName),
      to: recipient,
      subject,
      html,
      text,
    })

    return NextResponse.json({ ok: true, recipient })
  },
  { module: 'admin', action: 'test_email' }
)
