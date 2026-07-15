import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Caelum Intelligence — The intelligence layer for autonomous agents',
  description: 'Caelum Intelligence verifies AI agents, enforces user permissions, records every decision, and keeps post-purchase exceptions inside one trusted, auditable path via AgentPass.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mode="noir">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
