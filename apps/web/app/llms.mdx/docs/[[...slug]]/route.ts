import { notFound } from "next/navigation"

import { docsLlms, source } from "@/lib/source"

interface RouteProps {
  params: Promise<{ slug?: string[] }>
}

export const revalidate = false

export async function GET(_request: Request, { params }: RouteProps) {
  const { slug } = await params
  const slugs = slug?.slice(0, -1) ?? []
  if (slugs.at(-1) === "index") slugs.pop()

  const page = source.getPage(slugs)
  if (!page) notFound()

  return new Response(await docsLlms.page(page), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  })
}

export function generateStaticParams() {
  return source.generateParams().map((item) => ({
    ...item,
    slug: [...item.slug, "content.md"],
  }))
}
