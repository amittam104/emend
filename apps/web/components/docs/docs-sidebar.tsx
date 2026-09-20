"use client"

import type { ComponentProps, ReactNode } from "react"
import { Fragment, useMemo } from "react"
import {
  Cancel01Icon,
  SidebarLeftIcon,
  SidebarRightIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  SidebarContent,
  SidebarDrawerContent,
  SidebarDrawerOverlay,
  SidebarTrigger as BaseSidebarTrigger,
  useSidebar as useBaseSidebar,
} from "fumadocs-ui/components/sidebar/base"
import { useTreeContext } from "fumadocs-ui/contexts/tree"
import { useDocsLayout } from "fumadocs-ui/layouts/docs"
import type { SidebarProps } from "fumadocs-ui/layouts/docs/slots/sidebar"
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
import { Button } from "@/components/ui/button"

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

function SidebarHeader({
  action,
  className,
}: {
  action: ReactNode
  className?: string
}) {
  const { slots } = useDocsLayout()

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <slots.navTitle className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold" />
      {action}
    </div>
  )
}

function SidebarSearch({ className }: { className?: string }) {
  const { slots } = useDocsLayout()

  if (!slots.searchTrigger) return null

  return (
    <div className={className}>
      <slots.searchTrigger.full className="bg-fd-secondary/60 w-full" />
    </div>
  )
}

export function DocsSidebar({
  banner,
  className,
  collapsible = true,
  footer,
  ...props
}: SidebarProps) {
  const { menuItems } = useDocsLayout()
  const { setCollapsed } = useBaseSidebar()

  return (
    <Fragment>
      <SidebarContent>
        {({ collapsed, hovered, ref, ...hoverProps }) => (
          <Fragment>
            <div
              data-sidebar-placeholder=""
              className="md:layout:[--fd-sidebar-width:280px] pointer-events-none sticky top-(--fd-docs-row-1) z-20 h-[calc(var(--fd-docs-height)-var(--fd-docs-row-1))] [grid-area:sidebar] *:pointer-events-auto max-md:hidden"
            >
              {collapsed ? (
                <div
                  className="inset-s-0 absolute inset-y-0 w-4"
                  {...hoverProps}
                />
              ) : null}

              <aside
                {...props}
                id="nd-sidebar"
                ref={ref}
                data-collapsed={collapsed}
                data-hovered={collapsed && hovered}
                className={cn(
                  "bg-fd-popover/80 text-fd-popover-foreground shadow-docs-sidebar flex h-full w-[272px] flex-col border-r backdrop-blur-sm transition-transform duration-250",
                  collapsed &&
                    !hovered &&
                    "-translate-x-[280px] rtl:translate-x-[280px]",
                  className
                )}
                {...hoverProps}
              >
                <SidebarHeader
                  className="px-4 pt-4 pb-3"
                  action={
                    <div className="flex items-center gap-0.5">
                      {collapsible ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Hide sidebar"
                          onClick={() => setCollapsed(true)}
                        >
                          <HugeiconsIcon icon={SidebarLeftIcon} size={16} />
                        </Button>
                      ) : null}
                    </div>
                  }
                />

                <SidebarSearch className="px-3 pb-3" />
                {banner}

                <div className="fd-scroll-container min-h-0 flex-1 overflow-y-auto px-3 pb-3">
                  <DocsNavigation />
                </div>

                <div className="mx-3 flex flex-col border-t py-3 empty:hidden">
                  <ResourceLinks items={menuItems} />
                  {footer}
                </div>
              </aside>
            </div>

            {collapsible ? (
              <div
                data-sidebar-panel=""
                className={cn(
                  "bg-fd-muted text-fd-muted-foreground inset-s-4 fixed top-[calc(var(--fd-docs-row-1)+1rem)] z-20 flex rounded-xl border p-0.5 shadow-lg transition-opacity",
                  (!collapsed || hovered) && "pointer-events-none opacity-0"
                )}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Show sidebar"
                  onClick={() => setCollapsed(false)}
                >
                  <HugeiconsIcon icon={SidebarRightIcon} size={16} />
                </Button>
              </div>
            ) : null}
          </Fragment>
        )}
      </SidebarContent>

      <DocsSidebarDrawer banner={banner} footer={footer} />
    </Fragment>
  )
}

export function DocsSidebarDrawer({
  banner,
  footer,
}: Pick<SidebarProps, "banner" | "footer"> = {}) {
  const { menuItems, slots } = useDocsLayout()
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
        {banner}

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
        {footer}
      </SidebarDrawerContent>
    </Fragment>
  )
}

export function DocsSidebarTrigger({ ...props }: ComponentProps<"button">) {
  return (
    <BaseSidebarTrigger {...props}>
      <HugeiconsIcon icon={SidebarLeftIcon} size={18} />
    </BaseSidebarTrigger>
  )
}
