import type { Metadata } from "next"

import { LandingPage } from "@/components/landing-page"
import { pageMetadata, siteDescription, siteTitle, siteUrl } from "@/lib/site"

import "./landing-page.css"

export const metadata: Metadata = pageMetadata(siteTitle, siteDescription, "/")

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareSourceCode",
  name: "emend",
  description: siteDescription,
  url: siteUrl,
  codeRepository: "https://github.com/amittam104/emend",
  license: "https://opensource.org/license/mit",
  programmingLanguage: "TypeScript",
}

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <LandingPage />
    </>
  )
}
