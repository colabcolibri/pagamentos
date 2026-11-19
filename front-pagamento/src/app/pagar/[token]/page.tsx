import { SessionCheckoutScreen } from '@/components/checkout/session-checkout-screen'

export const metadata = {
  title: 'Pagamento seguro',
  referrer: 'no-referrer',
}

export default async function PaySessionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <SessionCheckoutScreen token={token} />
}
