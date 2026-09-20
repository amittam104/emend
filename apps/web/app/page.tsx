import type { Metadata } from "next"
import { Poppins } from "next/font/google"

import { LandingPage } from "@/components/landing-page"

import "./landing-page.css"

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: "Emend - AI editing for Tiptap",
  description:
    "Open-source AI editing components and a complete editor starter for Tiptap.",
}

export default function Page() {
  return (
    <div className={poppins.variable}>
      <LandingPage />
    </div>
  )
}
