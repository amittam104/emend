import type { Metadata } from "next"

export const siteUrl = "https://getemend.vercel.app"
export const siteTitle = "emend — Open-source AI editing for Tiptap"
export const siteDescription =
  "Add reviewable AI editing to your Tiptap editor, or start with a complete rich text editor. Open-source components, your model provider, and full ownership."

export function pageMetadata(
  title: string,
  description: string,
  url: string,
  image = "/og.png"
): Metadata {
  const canonical = new URL(url, siteUrl).href
  const images = [{ url: image, width: 1200, height: 630, alt: title }]
  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      siteName: "emend",
      locale: "en_US",
      title,
      description,
      url: canonical,
      images,
    },
    twitter: { card: "summary_large_image", title, description, images },
  }
}
