import type { Metadata } from "next"
import { Geist, Geist_Mono, Manrope } from "next/font/google"
import { RootProvider } from "fumadocs-ui/provider/next"

import { TooltipProvider } from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"

import "./globals.css"

const manropeHeading = Manrope({
  subsets: ["latin"],
  variable: "--font-heading",
})
const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
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
      className={cn(
        "font-sans antialiased",
        fontMono.variable,
        geist.variable,
        manropeHeading.variable
      )}
    >
      <body className="flex min-h-screen flex-col">
        <RootProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </RootProvider>
      </body>
    </html>
  )
}
