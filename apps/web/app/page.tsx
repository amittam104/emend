import type { Metadata } from "next"

import { LandingPage } from "@/components/landing-page"

import "./landing-page.css"

export const metadata: Metadata = {
  title: "Emend - AI editing for Tiptap",
  description:
    "Open-source AI editing components and a complete editor starter for Tiptap.",
}

export default function Page() {
  return <LandingPage />
}
