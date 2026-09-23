import type { Metadata } from "next"
import { Instrument_Sans } from "next/font/google"
import { RootProvider } from "fumadocs-ui/provider/next"

import { TooltipProvider } from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"

import "./globals.css"

const instrumentSans = Instrument_Sans({
  weight: "variable",
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: {
    default: "Emend",
    template: "%s | Emend",
  },
  description: "AI editing components and editor starters for Tiptap.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("font-sans antialiased", instrumentSans.variable)}
    >
      <body className="flex min-h-screen flex-col">
        <RootProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </RootProvider>
      </body>
    </html>
  )
}
