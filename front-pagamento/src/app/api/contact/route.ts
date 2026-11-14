import { NextResponse } from 'next/server'

import { createEmailTransporter } from '@quitou/core/email'
import { z } from 'zod'

import { renderFaleConoscoEmail } from '@/lib/contact-email-template'
import { formatEmailFrom } from '@/lib/email-helpers'
import { createApiHandler } from '@/lib/errors'
import { loadInstanceConfig, toSmtpOverrides } from '@/lib/platform/instance-config'

const contactSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  message: z.string().min(10, 'Mensagem deve ter pelo menos 10 caracteres'),
})

/**
 * POST /api/contact
 * Envia o formulário para o e-mail de contato da instância.
 */
export const POST = createApiHandler(
  async (request: Request) => {
    const body = await request.json()
    const parsed = contactSchema.safeParse(body)

    if (!parsed.success) {
      const firstError = parsed.error.flatten().fieldErrors
      const message = Object.values(firstError).flat().join(' ') || 'Dados inválidos'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const instance = await loadInstanceConfig()
    const { brand, smtp } = instance
    if (!brand.contactEmail) {
      return NextResponse.json({ error: 'E-mail de contato não configurado.' }, { status: 422 })
    }

    const { name, email, message } = parsed.data
    const safeSubjectName = name.replace(/[\r\n]+/g, ' ').trim()

    const transporter = createEmailTransporter(toSmtpOverrides(instance))
    const { html, text } = renderFaleConoscoEmail({
      name,
      email,
      message,
      brandName: brand.name,
      companyLine: brand.companyLine,
    })

    const fromAddress = smtp.emailFrom ?? smtp.user ?? 'noreply@quitou.local'
    await transporter.sendMail({
      from: formatEmailFrom(fromAddress, smtp.emailFromName),
      to: brand.contactEmail,
      replyTo: email,
      subject: `[Fale conosco] Mensagem de ${safeSubjectName}`,
      text,
      html,
    })

    return NextResponse.json({ success: true, message: 'Mensagem enviada com sucesso!' })
  },
  { module: 'contact', action: 'submit' }
)
