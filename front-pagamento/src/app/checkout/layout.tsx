import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Checkout',
  description:
    'Finalize sua compra com segurança. O pagamento é processado em ambiente protegido pelo provedor.',
}

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children
}
