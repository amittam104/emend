"use client"

import type { ComponentProps, ReactNode } from "react"
import { Fragment, useMemo } from "react"
import { Cancel01Icon, SidebarLeft01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  SidebarDrawerContent,
  SidebarDrawerOverlay,
  useSidebar as useBaseSidebar,
} from "fumadocs-ui/components/sidebar/base"
import type { SidebarPageTreeComponents } from "fumadocs-ui/components/sidebar/page-tree"
import { useTreeContext } from "fumadocs-ui/contexts/tree"
import { useGlassLayout } from "fumadocs-ui/layouts/glass"
import { useSidebar } from "fumadocs-ui/layouts/glass/slots/sidebar"
import type { LinkItemType } from "fumadocs-ui/layouts/shared"
import Link from "fumadocs-core/link"
import { usePathname } from "fumadocs-core/framework"
import type * as PageTree from "fumadocs-core/page-tree"

import { cn } from "@workspace/ui/lib/utils"

import {
  BranchedMenu,
  type BranchedMenuLink,
  type BranchedMenuSection,
} from "./branched-menu"

function pageLinks(nodes: PageTree.Node[]): BranchedMenuLink[] {
  return nodes.flatMap((node) => {
    if (node.type === "page") {
      return [
        {
          external: node.external,
          icon: node.icon,
          label: node.name,
          url: node.url,
        },
      ]
    }

    if (node.type === "folder") {
      return [
        ...(node.index
          ? [
              {
                external: node.index.external,
                icon: node.index.icon ?? node.icon,
                label: node.index.name,
                url: node.index.url,
              },
            ]
          : []),
        ...pageLinks(node.children),
      ]
    }

    return []
  })
}

function menuSections(nodes: PageTree.Node[]): BranchedMenuSection[] {
  const sections: BranchedMenuSection[] = []
  let current: BranchedMenuSection = { label: "Overview", children: [] }

  const commit = () => {
    if (current.children.length > 0) sections.push(current)
  }

  for (const node of nodes) {
    if (node.type === "separator") {
      commit()
      current = { label: node.name ?? "Documentation", children: [] }
    } else if (node.type === "folder") {
      const links = pageLinks([node])
      if (current.children.length === 0 && sections.length === 0) {
        current = { label: node.name, children: links }
      } else {
        current.children.push(...links)
      }
    } else {
      current.children.push(...pageLinks([node]))
    }
  }

  commit()
  return sections
}

function IconLinks({ items }: { items: LinkItemType[] }) {
  return items.map((item, index) => {
    if (item.type !== "icon") return null
    return (
      <Link
        key={`${item.url}-${index}`}
        href={item.url}
        external={item.external}
        aria-label={item.label}
        className="text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-accent-foreground focus-visible:outline-fd-ring inline-flex size-8 items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 [&_svg]:size-5"
      >
        {item.icon}
      </Link>
    )
  })
}

function ResourceLinks({
  items,
  onNavigate,
}: {
  items: LinkItemType[]
  onNavigate?: () => void
}) {
  return items.map((item, index) => {
    if (
      item.type === "icon" ||
      item.type === "custom" ||
      item.type === "menu"
    ) {
      return null
    }
    if (item.url === "/docs") return null

    return (
      <Link
        key={`${item.url}-${index}`}
        href={item.url}
        external={item.external}
        onClick={onNavigate}
        className="text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-accent-foreground rounded-lg px-2.5 py-2 text-sm transition-colors"
      >
        {item.text}
      </Link>
    )
  })
}

function DocsNavigation() {
  const pathname = usePathname()
  const { root } = useTreeContext()
  const { prefetch } = useBaseSidebar()
  const sections = useMemo(() => menuSections(root.children), [root.children])

  return (
    <BranchedMenu activeUrl={pathname} items={sections} prefetch={prefetch} />
  )
}

function HiddenItem() {
  return null
}

function HiddenFolder() {
  return null
}

function DocsTreeSeparator({ item }: { item: PageTree.Separator }) {
  const { root } = useTreeContext()
  const firstSeparator = root.children.find(
    (node): node is PageTree.Separator => node.type === "separator"
  )

  return item === firstSeparator ? <DocsNavigation /> : null
}

export const docsSidebarComponents: Partial<SidebarPageTreeComponents> = {
  Folder: HiddenFolder,
  Item: HiddenItem,
  Separator: DocsTreeSeparator,
}

function SidebarHeader({
  action,
  className,
}: {
  action: ReactNode
  className?: string
}) {
  const { slots } = useGlassLayout()

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <slots.navTitle className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold" />
      {action}
    </div>
  )
}

function SidebarSearch({ className }: { className?: string }) {
  const { slots } = useGlassLayout()

  if (!slots.searchTrigger) return null

  return (
    <div className={className}>
      <slots.searchTrigger.full className="bg-fd-secondary/60 w-full" />
    </div>
  )
}

export function DocsSidebar({ className, ...props }: ComponentProps<"aside">) {
  const { menuItems } = useGlassLayout()
  const { collapsible, collapsed, setCollapsed } = useSidebar()

  return (
    <aside
      id="nd-sidebar"
      className={cn(
        "bg-fd-popover/80 text-fd-popover-foreground shadow-docs-sidebar md:layout:[--fd-left-width:280px] sticky top-2 z-30 my-2 ms-2 flex h-[calc(100dvh-1rem)] flex-col rounded-2xl border backdrop-blur-sm transition-transform [grid-area:left] max-md:hidden",
        collapsed &&
          "md:layout:[--fd-left-width:0px] w-[272px] -translate-x-[280px]",
        className
      )}
      {...props}
    >
      <SidebarHeader
        className="px-4 pt-4 pb-3"
        action={
          <div className="flex items-center gap-0.5">
            <IconLinks items={menuItems} />
            {collapsible ? (
              <button
                type="button"
                aria-label="Hide sidebar"
                onClick={() => setCollapsed(true)}
                className="text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-accent-foreground focus-visible:outline-fd-ring inline-flex size-8 items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <HugeiconsIcon icon={SidebarLeft01Icon} size={17} />
              </button>
            ) : null}
          </div>
        }
      />

      <SidebarSearch className="px-3 pb-3" />

      <div className="fd-scroll-container min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <DocsNavigation />
      </div>

      <div className="mx-3 flex flex-col border-t py-3 empty:hidden">
        <ResourceLinks items={menuItems} />
      </div>
    </aside>
  )
}

export function DocsSidebarDrawer() {
  const { menuItems, slots } = useGlassLayout()
  const { setOpen } = useBaseSidebar()

  return (
    <Fragment>
      <SidebarDrawerOverlay className="bg-fd-overlay data-[state=open]:animate-fd-fade-in data-[state=closed]:animate-fd-fade-out fixed inset-0 z-40 backdrop-blur-sm" />
      <SidebarDrawerContent className="bg-fd-background text-fd-foreground data-[state=open]:animate-fd-sidebar-in data-[state=closed]:animate-fd-sidebar-out fixed inset-y-0 end-0 z-40 flex w-[360px] max-w-[calc(100vw-3rem)] flex-col border-s shadow-md">
        <SidebarHeader
          className="px-4 py-4"
          action={
            <button
              type="button"
              aria-label="Close sidebar"
              onClick={() => setOpen(false)}
              className="bg-fd-secondary text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-accent-foreground inline-flex size-9 items-center justify-center rounded-full border transition-colors"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={18} />
            </button>
          }
        />

        <SidebarSearch className="px-4 pb-4" />

        <div className="fd-scroll-container min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <DocsNavigation />
        </div>

        <div className="flex items-center gap-1 border-t px-3 py-3">
          <div className="flex flex-1 flex-col">
            <ResourceLinks
              items={menuItems}
              onNavigate={() => setOpen(false)}
            />
          </div>
          <IconLinks items={menuItems} />
          {slots.themeSwitch ? <slots.themeSwitch className="p-0" /> : null}
        </div>
      </SidebarDrawerContent>
    </Fragment>
  )
}
