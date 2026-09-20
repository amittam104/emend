"use client"

import type { ComponentProps } from "react"
import Link from "fumadocs-core/link"
import { useDocsLayout } from "fumadocs-ui/layouts/docs"
import { Github01Icon, Moon02Icon, Sun01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useTheme } from "next-themes"

import { cn } from "@workspace/ui/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"

const iconControlClassName =
  "text-fd-muted-foreground hover:text-fd-foreground focus-visible:outline-fd-ring inline-flex size-9 items-center justify-center rounded-lg border-0 bg-transparent p-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"

export function DocsThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      aria-label="Toggle Theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <HugeiconsIcon icon={isDark ? Moon02Icon : Sun01Icon} size={18} />
    </Button>
  )
}

export function DocsHeader({ className, ...props }: ComponentProps<"header">) {
  const {
    menuItems,
    props: { nav },
    slots,
  } = useDocsLayout()
  const githubItem = menuItems.find(
    (item) => item.type === "icon" && item.label === "GitHub"
  )
  const github = githubItem?.type === "icon" ? githubItem : null

  return (
    <header
      id="nd-subnav"
      {...props}
      className={cn(
        "layout:[--fd-header-height:--spacing(14)] max-md:bg-fd-background/80 sticky top-(--fd-docs-row-1) z-30 flex h-(--fd-header-height) items-center px-4 [grid-area:header] max-md:border-b max-md:backdrop-blur-sm",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-center md:hidden">
        {slots.navTitle ? (
          <slots.navTitle className="inline-flex items-center gap-2.5 font-semibold" />
        ) : null}
        <div className="flex-1">{nav?.children}</div>
        {slots.searchTrigger ? (
          <slots.searchTrigger.sm hideIfDisabled className="p-2" />
        ) : null}
        <slots.sidebar.trigger className={iconControlClassName} />
      </div>

      <div className="ms-auto hidden items-center gap-1 md:flex">
        {github ? (
          <Link
            href={github.url}
            className={buttonVariants({ variant: "secondary", size: "icon" })}
            external={github.external}
            aria-label={github.label}
          >
            <HugeiconsIcon icon={Github01Icon} size={18} />
          </Link>
        ) : null}
        {slots.themeSwitch ? <slots.themeSwitch /> : null}
      </div>
    </header>
  )
}
