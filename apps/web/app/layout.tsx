import type { Metadata } from "next"
import { Inter } from "next/font/google"

import "@workspace/ui/globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: { default: "aghost", template: "%s · aghost" },
  description:
    "Agent-first Instagram automation with MCP and REST API access. Create, manage and monitor comment-to-DM automations from your AI agent or workflows.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} font-sans antialiased`}>
      <body>{children}</body>
    </html>
  )
}
