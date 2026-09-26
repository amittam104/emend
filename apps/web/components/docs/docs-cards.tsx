import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"
import type { ReactNode } from "react"

import { DocsIcon, type DocsIconName } from "./docs-icons"
import { cn } from "@/lib/utils"

const cardHover =
  "transition-[border-color,box-shadow,background-color] duration-300 ease-out hover:border-fd-foreground/20 hover:shadow-elevation-2"

/** A two-column grid of link cards. Replaces the Fumadocs default. */
export function Cards({
  children,
  className,
}: {
  readonly children: ReactNode
  readonly className?: string
}) {
  return (
    <div className={cn("not-prose my-6 grid gap-4 sm:grid-cols-2", className)}>
      {children}
    </div>
  )
}

function IconTile({
  icon,
  className,
}: {
  readonly icon: DocsIconName
  readonly className?: string
}) {
  return (
    <span
      className={cn(
        "bg-fd-muted/60 text-fd-foreground shadow-elevation-1 flex size-9 shrink-0 items-center justify-center rounded-lg border",
        className
      )}
    >
      <DocsIcon name={icon} className="size-[18px]" />
    </span>
  )
}

function CardArrow() {
  return (
    <HugeiconsIcon
      icon={ArrowRight01Icon}
      aria-hidden
      className="text-fd-muted-foreground group-hover:text-fd-foreground size-4 shrink-0 transition-[translate,color] duration-300 ease-out group-hover:translate-x-0.5"
    />
  )
}

export function Card({
  title,
  description,
  href,
  icon,
  children,
}: {
  readonly title: ReactNode
  readonly description?: ReactNode
  readonly href: string
  readonly icon?: DocsIconName
  readonly children?: ReactNode
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group bg-fd-card text-fd-card-foreground flex flex-col gap-3 rounded-xl border p-4",
        cardHover
      )}
    >
      <span className="flex items-start justify-between gap-3">
        {icon ? <IconTile icon={icon} /> : null}
        <CardArrow />
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-sm font-semibold">{title}</span>
        {description ? (
          <span className="text-fd-muted-foreground text-sm leading-normal text-pretty">
            {description}
          </span>
        ) : null}
        {children}
      </span>
    </Link>
  )
}

/** A larger card for choosing between setup paths. */
export function PathCard({
  title,
  description,
  href,
  icon,
  label,
  cta,
  children,
}: {
  readonly title: string
  readonly description: string
  readonly href: string
  readonly icon: DocsIconName
  readonly label: string
  readonly cta: string
  readonly children?: ReactNode
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group bg-fd-card text-fd-card-foreground relative flex flex-col overflow-hidden rounded-2xl border",
        cardHover
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(ellipse_at_top_left,color-mix(in_oklch,var(--color-fd-foreground)_6%,transparent),transparent_70%)] opacity-70 transition-opacity duration-300 ease-out group-hover:opacity-100"
      />
      <span className="relative flex flex-1 flex-col gap-4 p-5">
        <span className="flex items-center gap-3">
          <IconTile icon={icon} className="bg-fd-card size-10" />
          <span className="text-fd-muted-foreground text-xs font-medium tracking-wide uppercase">
            {label}
          </span>
        </span>
        <span className="flex flex-col gap-1.5">
          <span className="text-base font-semibold">{title}</span>
          <span className="text-fd-muted-foreground text-sm leading-normal text-pretty">
            {description}
          </span>
        </span>
        {children ? (
          <span className="text-fd-muted-foreground [&_li]:before:bg-fd-muted-foreground/60 flex flex-col gap-2 text-sm [&_li]:flex [&_li]:gap-2 [&_li]:before:mt-[0.55em] [&_li]:before:size-1 [&_li]:before:shrink-0 [&_li]:before:rounded-full [&_li]:before:content-[''] [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5">
            {children}
          </span>
        ) : null}
      </span>
      <span className="bg-fd-muted/30 relative flex items-center justify-between gap-3 border-t px-5 py-3 text-sm font-medium">
        {cta}
        <CardArrow />
      </span>
    </Link>
  )
}

export function PathCards({ children }: { readonly children: ReactNode }) {
  return (
    <div className="not-prose my-8 grid gap-4 sm:grid-cols-2">{children}</div>
  )
}
