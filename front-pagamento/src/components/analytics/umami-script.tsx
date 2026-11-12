import Script from 'next/script'

export function UmamiScript() {
  const src = process.env.NEXT_PUBLIC_UMAMI_SRC?.trim()
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID?.trim()
  if (!src || !websiteId) return null

  return <Script src={src} data-website-id={websiteId} strategy="afterInteractive" />
}
