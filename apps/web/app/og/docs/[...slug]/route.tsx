import { readFile } from "node:fs/promises"
import { join } from "node:path"

import { generateOGImage } from "fumadocs-ui/og"
import { notFound } from "next/navigation"

import { getPageImage, source } from "@/lib/source"

export const dynamicParams = false

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params
  if (slug.at(-1) !== "image.png") notFound()
  const page = source.getPage(slug.slice(0, -1))
  if (!page) notFound()

  const logo = await readFile(join(process.cwd(), "public/emend-logo.png"))
  return generateOGImage({
    icon: (
      <svg width="56" height="56" viewBox="0 0 56 56">
        <image
          href={`data:image/png;base64,${logo.toString("base64")}`}
          width="56"
          height="56"
        />
      </svg>
    ),
    title: <span style={{ fontSize: 64 }}>{page.data.title}</span>,
    description: <span style={{ fontSize: 32 }}>{page.data.description}</span>,
    site: "emend / docs",
    primaryColor: "rgba(59, 130, 246, 0.3)",
    primaryTextColor: "rgb(147, 197, 253)",
  })
}

export function generateStaticParams() {
  return source
    .getPages()
    .map((page) => ({ slug: getPageImage(page).segments }))
}
