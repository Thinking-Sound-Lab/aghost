import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Theme } from "@/components/theme"
import { openGraph, site } from "@/lib/site"

import "@workspace/ui/globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.title, template: `%s · ${site.name}` },
  description: site.description,
  applicationName: site.name,
  openGraph,
  twitter: { card: "summary_large_image" },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // The theme script sets the dark class before React hydrates.
    <html
      lang="en"
      className={`${inter.variable} font-sans antialiased`}
      suppressHydrationWarning
    >
      <head>
        <Theme />
      </head>
      <body>{children}</body>
    </html>
  )
}
