import pg from 'pg'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('DATABASE_URL ausente. Execute com: node --env-file=.env.local scripts/seed-dev.mjs')
  process.exit(1)
}

if (process.env.NODE_ENV === 'production') {
  console.error('Abortado: seed-dev.mjs não deve ser executado em NODE_ENV=production')
  process.exit(1)
}

const DEFAULT_EMAIL_CONFIG = {
  order_created: {
    from_name: 'Quitou',
    from_email: 'naoresponda@quitou.dev',
    reply_to: 'suporte@quitou.dev',
    subject: 'Seu pedido {{product_name}} foi gerado',
    custom_message: 'Recebemos seu pedido e estamos aguardando a confirmação do pagamento.',
    instructions: 'Finalize o pagamento usando o link ou código PIX abaixo.',
    include_next_steps: true,
    next_steps: [
      'Conclua o pagamento antes do vencimento',
      'Você receberá a confirmação automática por e-mail',
    ],
  },
  payment_confirmed: {
    from_name: 'Quitou',
    from_email: 'naoresponda@quitou.dev',
    reply_to: 'suporte@quitou.dev',
    subject: 'Pagamento confirmado — {{product_name}}',
    custom_message: 'Tudo certo! Seu pagamento foi confirmado com sucesso.',
    instructions: 'Acesse sua área do aluno com o mesmo e-mail usado na compra.',
    include_next_steps: true,
    next_steps: [
      'Acesse sua conta na plataforma',
      'Confira o material liberado no seu perfil',
      'Se precisar de ajuda, responda este e-mail',
    ],
  },
}

const DEFAULT_REFUND_POLICY = {
  title: 'Garantia incondicional de 7 dias',
  subtitle: 'Cancelamento simples dentro do prazo legal',
  sections: [
    {
      title: 'Direito de arrependimento',
      content:
        'Você pode solicitar o reembolso integral em até 7 dias corridos após a confirmação do pagamento.',
      highlighted: true,
    },
    {
      title: 'Prazo de estorno',
      content:
        'PIX é estornado em até 1 dia útil; cartão de crédito conforme fechamento da fatura.',
      highlighted: false,
    },
  ],
  footer: 'Dúvidas? Fale com nosso suporte pelo email suporte@quitou.dev.',
  checkout: {
    buttonText: 'Ver política de reembolso',
    acceptanceText: 'Li e concordo com a política de reembolso',
    acceptanceRequired: true,
  },
}

const CUSTOMERS = [
  {
    id: 'a1000001-0000-4000-8000-000000000001',
    name: 'Mariana Costa',
    email: 'mariana.costa@exemplo.dev',
    document: '39053344705',
    phone: '11991234501',
  },
  {
    id: 'a1000001-0000-4000-8000-000000000002',
    name: 'Rafael Almeida',
    email: 'rafael.almeida@exemplo.dev',
    document: '52998224725',
    phone: '11991234502',
  },
  {
    id: 'a1000001-0000-4000-8000-000000000003',
    name: 'Camila Ferreira',
    email: 'camila.ferreira@exemplo.dev',
    document: '11144477735',
    phone: '21991234503',
  },
  {
    id: 'a1000001-0000-4000-8000-000000000004',
    name: 'Lucas Oliveira',
    email: 'lucas.oliveira@exemplo.dev',
    document: '71428793860',
    phone: '31991234504',
  },
  {
    id: 'a1000001-0000-4000-8000-000000000005',
    name: 'Beatriz Santos',
    email: 'beatriz.santos@exemplo.dev',
    document: '96518274002',
    phone: '41991234505',
  },
  {
    id: 'a1000001-0000-4000-8000-000000000006',
    name: 'Thiago Mendes',
    email: 'thiago.mendes@exemplo.dev',
    document: '28471935008',
    phone: '51991234506',
  },
]

const PRODUCTS = [
  {
    id: 'b2000001-0000-4000-8000-000000000001',
    name: 'Curso Next.js Pro',
    ref: 'curso-nextjs-pro-seed',
    description: 'Formação completa em Next.js, TypeScript e arquitetura fullstack.',
    active: true,
    metadata: { admin_group: 'Cursos' },
    prices: [
      {
        id: 'c3000001-0000-4000-8000-000000000001',
        ref: 'curso-nextjs-avista-seed',
        amount: 29700,
        recurring: false,
        interval: null,
        interval_count: null,
        metadata: { title: 'Acesso Vitalício', max_installments: 12 },
      },
      {
        id: 'c3000001-0000-4000-8000-000000000002',
        ref: 'curso-nextjs-vip-seed',
        amount: 49700,
        recurring: false,
        interval: null,
        interval_count: null,
        metadata: { title: 'Turma VIP + Mentoria', max_installments: 12 },
      },
    ],
  },
  {
    id: 'b2000001-0000-4000-8000-000000000002',
    name: 'Comunidade Quitou',
    ref: 'comunidade-quitou-seed',
    description: 'Assinatura com calls semanais, templates e suporte direto.',
    active: true,
    metadata: { admin_group: 'Assinaturas' },
    prices: [
      {
        id: 'c3000001-0000-4000-8000-000000000003',
        ref: 'comunidade-mensal-seed',
        amount: 4900,
        recurring: true,
        interval: 'month',
        interval_count: 1,
        metadata: { title: 'Plano Mensal' },
      },
      {
        id: 'c3000001-0000-4000-8000-000000000004',
        ref: 'comunidade-anual-seed',
        amount: 47000,
        recurring: true,
        interval: 'year',
        interval_count: 1,
        metadata: { title: 'Plano Anual (2 meses grátis)' },
      },
    ],
  },
  {
    id: 'b2000001-0000-4000-8000-000000000003',
    name: 'Workshop Design System Base UI',
    ref: 'workshop-base-ui-seed',
    description: 'Imersão prática de arquitetura de componentes sóbrios e acessíveis.',
    active: true,
    metadata: { admin_group: 'Workshops' },
    prices: [
      {
        id: 'c3000001-0000-4000-8000-000000000005',
        ref: 'workshop-base-ui-lote1',
        amount: 14900,
        recurring: false,
        interval: null,
        interval_count: null,
        metadata: { title: '1º Lote', max_installments: 6 },
      },
    ],
  },
]

async function run() {
  const client = new pg.Client({ connectionString: databaseUrl })
  await client.connect()

  try {
    await client.query('BEGIN')

    // 1) Corrigir produtos existentes sem email_config ou refund_policy
    const updatedProducts = await client.query(
      `UPDATE payments.products
       SET
         email_config = CASE
           WHEN email_config IS NULL
             OR email_config->'order_created' IS NULL
             OR email_config->'payment_confirmed' IS NULL
           THEN COALESCE(email_config, '{}'::jsonb) || $1::jsonb
           ELSE email_config
         END,
         refund_policy = COALESCE(refund_policy, $2::jsonb)
       WHERE email_config IS NULL
          OR email_config->'order_created' IS NULL
          OR email_config->'payment_confirmed' IS NULL
          OR refund_policy IS NULL`,
      [JSON.stringify(DEFAULT_EMAIL_CONFIG), JSON.stringify(DEFAULT_REFUND_POLICY)]
    )
    console.log(`Produtos existentes atualizados com email_config/refund_policy: ${updatedProducts.rowCount}`)

    // 2) Seed clientes
    for (const c of CUSTOMERS) {
      await client.query(
        `INSERT INTO payments.profiles (id, name, email, document, phone)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email`,
        [c.id, c.name, c.email, c.document, c.phone]
      )
    }

    // 3) Seed produtos e preços
    for (const p of PRODUCTS) {
      await client.query(
        `INSERT INTO payments.products (id, name, ref, description, active, payment_methods, email_config, refund_policy, metadata)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb)
         ON CONFLICT (ref) DO NOTHING`,
        [
          p.id,
          p.name,
          p.ref,
          p.description,
          p.active,
          JSON.stringify(['credit_card', 'pix', 'boleto']),
          JSON.stringify(DEFAULT_EMAIL_CONFIG),
          JSON.stringify(DEFAULT_REFUND_POLICY),
          JSON.stringify(p.metadata),
        ]
      )

      const prodRow = await client.query(`SELECT id FROM payments.products WHERE ref = $1`, [p.ref])
      const productId = prodRow.rows[0].id

      for (const pr of p.prices) {
        await client.query(
          `INSERT INTO payments.prices (id, product_id, ref, amount, currency, recurring, interval, interval_count, active, email_addon, stock_sold, metadata)
           VALUES ($1, $2, $3, $4, 'BRL', $5, $6, $7, true, '{}'::jsonb, 0, $8::jsonb)
           ON CONFLICT (ref) DO NOTHING`,
          [
            pr.id,
            productId,
            pr.ref,
            pr.amount,
            pr.recurring,
            pr.interval,
            pr.interval_count,
            JSON.stringify(pr.metadata),
          ]
        )
      }
    }

    // Buscar product_id/price_id reais dos nossos seeds
    const getPrice = async (ref) => {
      const res = await client.query(
        `SELECT id, product_id, amount FROM payments.prices WHERE ref = $1`,
        [ref]
      )
      return res.rows[0]
    }
    const pAvista = await getPrice('curso-nextjs-avista-seed')
    const pVip = await getPrice('curso-nextjs-vip-seed')
    const pMensal = await getPrice('comunidade-mensal-seed')
    const pAnual = await getPrice('comunidade-anual-seed')
    const pWorkshop = await getPrice('workshop-base-ui-lote1')

    // 4) Seed pedidos + pagamentos (Asaas e Pagar.me)
    const now = Date.now()
    const hoursAgo = (h) => new Date(now - h * 3600 * 1000).toISOString()

    const ORDERS = [
      {
        id: 'd4000001-0000-4000-8000-000000000001',
        user_id: CUSTOMERS[0].id,
        price: pAvista,
        status: 'paid',
        order_type: 'one_time',
        payment_gateway: 'asaas',
        payment_method: 'pix',
        created_at: hoursAgo(48),
        paid_at: hoursAgo(47),
      },
      {
        id: 'd4000001-0000-4000-8000-000000000002',
        user_id: CUSTOMERS[1].id,
        price: pVip,
        status: 'paid',
        order_type: 'one_time',
        payment_gateway: 'pagarme',
        payment_method: 'credit_card',
        created_at: hoursAgo(36),
        paid_at: hoursAgo(36),
      },
      {
        id: 'd4000001-0000-4000-8000-000000000003',
        user_id: CUSTOMERS[2].id,
        price: pWorkshop,
        status: 'pending',
        order_type: 'one_time',
        payment_gateway: 'asaas',
        payment_method: 'boleto',
        created_at: hoursAgo(12),
        paid_at: null,
      },
      {
        id: 'd4000001-0000-4000-8000-000000000004',
        user_id: CUSTOMERS[3].id,
        price: pMensal,
        status: 'paid',
        order_type: 'subscription',
        payment_gateway: 'asaas',
        payment_method: 'pix',
        created_at: hoursAgo(24),
        paid_at: hoursAgo(24),
      },
      {
        id: 'd4000001-0000-4000-8000-000000000005',
        user_id: CUSTOMERS[4].id,
        price: pAnual,
        status: 'cancelled',
        order_type: 'subscription',
        payment_gateway: 'pagarme',
        payment_method: 'credit_card',
        created_at: hoursAgo(72),
        paid_at: null,
      },
      {
        id: 'd4000001-0000-4000-8000-000000000006',
        user_id: CUSTOMERS[5].id,
        price: pAvista,
        status: 'pending',
        order_type: 'one_time',
        payment_gateway: 'pagarme',
        payment_method: 'pix',
        created_at: hoursAgo(3),
        paid_at: null,
      },
    ]

    for (const o of ORDERS) {
      await client.query(
        `INSERT INTO payments.orders (id, user_id, product_id, price_id, amount_cents, status, order_type, payment_gateway, payment_method, created_at, paid_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO NOTHING`,
        [
          o.id,
          o.user_id,
          o.price.product_id,
          o.price.id,
          o.price.amount,
          o.status,
          o.order_type,
          o.payment_gateway,
          o.payment_method,
          o.created_at,
          o.paid_at,
        ]
      )

      if (o.payment_gateway === 'asaas') {
        await client.query(
          `INSERT INTO payments.asaas_payments (id, user_id, order_id, product_id, price_id, amount_cents, status, payment_method, billing_type, asaas_customer_id, asaas_payment_id, installments, created_at, paid_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           ON CONFLICT (id) DO NOTHING`,
          [
            o.id.replace('d4000001', 'e5000001'),
            o.user_id,
            o.id,
            o.price.product_id,
            o.price.id,
            o.price.amount,
            o.status,
            o.payment_method,
            o.payment_method === 'boleto' ? 'BOLETO' : 'PIX',
            `cus_seed_${o.user_id.slice(-4)}`,
            `pay_asaas_${o.id.slice(-4)}`,
            1,
            o.created_at,
            o.paid_at,
          ]
        )
      } else {
        await client.query(
          `INSERT INTO payments.pagarme_payments (id, user_id, order_id, product_id, price_id, amount_cents, status, payment_method, payment_link_id, payment_link_url, created_at, paid_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (id) DO NOTHING`,
          [
            o.id.replace('d4000001', 'e5000002'),
            o.user_id,
            o.id,
            o.price.product_id,
            o.price.id,
            o.price.amount,
            o.status,
            o.payment_method,
            `pl_seed_${o.id.slice(-4)}`,
            `https://pay.pagar.me/seed/${o.id.slice(-4)}`,
            o.created_at,
            o.paid_at,
          ]
        )
      }
    }

    // 5) Seed assinaturas
    const SUBS = [
      {
        id: 'f6000001-0000-4000-8000-000000000001',
        user_id: CUSTOMERS[3].id,
        price_id: pMensal.id,
        status: 'active',
        start: hoursAgo(24 * 10),
        end: new Date(now + 20 * 24 * 3600 * 1000).toISOString(),
        cancel_at_period_end: false,
      },
      {
        id: 'f6000001-0000-4000-8000-000000000002',
        user_id: CUSTOMERS[0].id,
        price_id: pAnual.id,
        status: 'past_due',
        start: hoursAgo(24 * 360),
        end: hoursAgo(24 * 2),
        cancel_at_period_end: false,
      },
      {
        id: 'f6000001-0000-4000-8000-000000000003',
        user_id: CUSTOMERS[4].id,
        price_id: pMensal.id,
        status: 'canceled',
        start: hoursAgo(24 * 40),
        end: hoursAgo(24 * 10),
        cancel_at_period_end: true,
      },
    ]

    for (const s of SUBS) {
      await client.query(
        `INSERT INTO payments.subscriptions (id, user_id, price_id, status, current_period_start, current_period_end, cancel_at_period_end)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [s.id, s.user_id, s.price_id, s.status, s.start, s.end, s.cancel_at_period_end]
      )
    }

    // 6) Seed cupons
    const COUPONS = [
      {
        id: 'a7000001-0000-4000-8000-000000000001',
        code: 'QUITOU20',
        description: '20% de desconto para lançamento',
        discount_type: 'percent',
        discount_percent: 20,
        discount_amount_cents: null,
        active: true,
      },
      {
        id: 'a7000001-0000-4000-8000-000000000002',
        code: 'BEMVINDO50',
        description: 'R$ 50,00 OFF na primeira compra',
        discount_type: 'fixed_amount',
        discount_percent: null,
        discount_amount_cents: 5000,
        active: true,
      },
      {
        id: 'a7000001-0000-4000-8000-000000000003',
        code: 'BLACK30',
        description: 'Campanha encerrada',
        discount_type: 'percent',
        discount_percent: 30,
        discount_amount_cents: null,
        active: false,
      },
    ]

    for (const c of COUPONS) {
      await client.query(
        `INSERT INTO payments.discount_coupons (id, code, description, discount_type, discount_percent, discount_amount_cents, applies_to, active, public_message_bands, public_show_remaining, public_show_valid_until, created_at, updated_at)
         SELECT $1, $2, $3, $4, $5, $6, 'both', $7, '[]'::jsonb, false, false, now(), now()
         WHERE NOT EXISTS (
           SELECT 1 FROM payments.discount_coupons WHERE lower(code) = lower($2)
         )
         ON CONFLICT (id) DO NOTHING`,
        [c.id, c.code, c.description, c.discount_type, c.discount_percent, c.discount_amount_cents, c.active]
      )
    }

    // 7) Seed logs de e-mail
    await client.query(
      `INSERT INTO payments.email_logs (id, order_id, recipient, subject, from_name, from_email, status, body_html, metadata, created_at)
       VALUES
         ('e8000001-0000-4000-8000-000000000001', $1, $2, 'Pagamento confirmado — Curso Next.js Pro', 'Quitou', 'naoresponda@quitou.dev', 'success', '<p>Seu pagamento foi confirmado!</p>', '{"type":"payment_confirmed"}'::jsonb, $3),
         ('e8000001-0000-4000-8000-000000000002', $4, $5, 'Seu pedido Workshop Design System Base UI foi gerado', 'Quitou', 'naoresponda@quitou.dev', 'success', '<p>Boleto gerado com sucesso.</p>', '{"type":"order_created"}'::jsonb, $6)
       ON CONFLICT (id) DO NOTHING`,
      [ORDERS[0].id, CUSTOMERS[0].email, hoursAgo(47), ORDERS[2].id, CUSTOMERS[2].email, hoursAgo(12)]
    )

    // 8) Seed webhooks
    await client.query(
      `INSERT INTO payments.webhook_events (id, provider, event_type, provider_event_id, processing_status, payload, created_at)
       VALUES
         ('f9000001-0000-4000-8000-000000000001', 'asaas', 'PAYMENT_CONFIRMED', 'evt_asaas_seed_01', 'success', '{"event":"PAYMENT_CONFIRMED","payment":{"value":297}}'::jsonb, $1),
         ('f9000001-0000-4000-8000-000000000002', 'pagarme', 'order.paid', 'evt_pagarme_seed_01', 'success', '{"type":"order.paid","data":{"amount":49700}}'::jsonb, $2)
       ON CONFLICT (id) DO NOTHING`,
      [hoursAgo(47), hoursAgo(36)]
    )

    // 9) Seed auditoria
    await client.query(
      `INSERT INTO payments.admin_audit_events (id, actor_id, action, target_type, target_id, detail, created_at)
       VALUES
         ('a9000001-0000-4000-8000-000000000001', $1, 'order.mark_paid', 'order', $2, 'Confirmação manual após comprovante PIX em dev', $3),
         ('a9000001-0000-4000-8000-000000000002', $1, 'coupon.create', 'coupon', $4, 'Cupom promocional 20% criado para testes', $5)
       ON CONFLICT (id) DO NOTHING`,
      [CUSTOMERS[0].id, ORDERS[0].id, hoursAgo(40), COUPONS[0].id, hoursAgo(20)]
    )

    await client.query('COMMIT')
    console.log('✅ Banco dev populado com sucesso!')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('❌ Erro ao popular banco dev:', err)
    process.exitCode = 1
  } finally {
    await client.end()
  }
}

run()
