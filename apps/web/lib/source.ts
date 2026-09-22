import ApiIcon from "@hugeicons/core-free-icons/ApiIcon"
import BookOpen02Icon from "@hugeicons/core-free-icons/BookOpen02Icon"
import BracesIcon from "@hugeicons/core-free-icons/BracesIcon"
import Bug01Icon from "@hugeicons/core-free-icons/Bug01Icon"
import FileCodeIcon from "@hugeicons/core-free-icons/FileCodeIcon"
import FunctionIcon from "@hugeicons/core-free-icons/FunctionIcon"
import InstallingUpdates02Icon from "@hugeicons/core-free-icons/InstallingUpdates02Icon"
import Rocket02Icon from "@hugeicons/core-free-icons/Rocket02Icon"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import type * as PageTree from "fumadocs-core/page-tree"
import { llms, loader } from "fumadocs-core/source"
import { defineDocs } from "fumadocs-mdx/macro"
import { createElement } from "react"

const docs = defineDocs({
  dir: "content/docs",
  docs: {
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
})

export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
  icon(name) {
    const icon = docsIcons[name as keyof typeof docsIcons]
    if (!icon) return

    return createElement(HugeiconsIcon, {
      icon,
      "aria-hidden": true,
      className: "size-4",
      strokeWidth: 2,
    })
  },
})

const docsIcons = {
  ApiIcon,
  BookOpen02Icon,
  BracesIcon,
  Bug01Icon,
  FileCodeIcon,
  FunctionIcon,
  InstallingUpdates02Icon,
  Rocket02Icon,
} satisfies Record<string, IconSvgElement>

function groupSeparatorNodes(nodes: PageTree.Node[]): PageTree.Node[] {
  const grouped: PageTree.Node[] = []
  let currentFolder: PageTree.Folder | undefined

  for (const node of nodes) {
    if (node.type === "separator") {
      currentFolder = {
        type: "folder",
        name: node.name ?? "",
        icon: node.icon,
        children: [],
        defaultOpen: true,
        $id: `${node.$id ?? node.name ?? "section"}-folder`,
      }
      grouped.push(currentFolder)
      continue
    }

    if (currentFolder) {
      currentFolder.children.push(node)
    } else {
      grouped.push(node)
    }
  }

  return grouped
}

export function getDocsPageTree(): PageTree.Root {
  const tree = source.getPageTree()
  const introduction = tree.children.find(
    (node): node is PageTree.Item =>
      node.type === "page" && node.url === "/docs"
  )
  const apiReference = tree.children.find(
    (node): node is PageTree.Folder =>
      node.type === "folder" &&
      (node.index?.url === "/docs/api-reference" ||
        node.children.some(
          (child) =>
            child.type === "page" && child.url === "/docs/api-reference"
        ))
  )

  if (!introduction || !apiReference) return tree

  const { index: apiIndexFromTree, ...apiReferenceWithoutIndex } = apiReference
  const apiIndex =
    apiIndexFromTree ??
    apiReference.children.find(
      (node): node is PageTree.Item =>
        node.type === "page" && node.url === "/docs/api-reference"
    )
  const apiReferenceRoot: PageTree.Folder = {
    ...apiReferenceWithoutIndex,
    children: [
      ...(apiIndex ? [apiIndex] : []),
      ...apiReference.children.filter((node) => node !== apiIndex),
    ],
  }

  const documentation: PageTree.Folder = {
    type: "folder",
    name: "Documentation",
    description: "Guides for installing, integrating, and shipping Emend.",
    root: true,
    index: introduction,
    icon: createElement(HugeiconsIcon, {
      icon: BookOpen02Icon,
      "aria-hidden": true,
      className: "size-4",
      strokeWidth: 2,
    }),
    children: groupSeparatorNodes(
      tree.children.filter((node) => node !== apiReference)
    ),
    $id: "documentation",
  }

  return { ...tree, children: [documentation, apiReferenceRoot] }
}

export const docsLlms = llms(source, {
  renderPage: async (page) => `# ${page.data.title} (${page.url})

${await page.data.getText("processed")}`,
})
