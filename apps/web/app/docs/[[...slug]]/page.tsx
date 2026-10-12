import type { Metadata } from "next"
import { notFound } from "next/navigation"
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/notebook/page"

import { getMDXComponents } from "@/components/mdx"
import { getPageImage, source } from "@/lib/source"
import { pageMetadata } from "@/lib/site"

interface PageProps {
  params: Promise<{ slug?: string[] }>
}

export default async function Page({ params }: PageProps) {
  const page = source.getPage((await params).slug)
  if (!page) notFound()

  const MDX = page.data.body

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription className="-mt-2">
        {page.data.description}
      </DocsDescription>
      <DocsBody>
        <MDX components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  )
}

export function generateStaticParams() {
  return source.generateParams()
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const page = source.getPage((await params).slug)
  if (!page) notFound()

  return pageMetadata(
    `${page.data.title} | emend`,
    page.data.description ??
      "Documentation for emend AI editing and Tiptap editor components.",
    page.url,
    getPageImage(page).url
  )
}
