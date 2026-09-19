"use client"

import type { CSSProperties, ReactNode } from "react"
import { useId, useLayoutEffect, useRef, useState } from "react"
import Link from "fumadocs-core/link"
import { useOnChange } from "fumadocs-core/utils/use-on-change"

export interface BranchedMenuLink {
  external?: boolean
  icon?: ReactNode
  label: ReactNode
  url: string
}

export interface BranchedMenuSection {
  children: BranchedMenuLink[]
  label: ReactNode
}

interface BranchedMenuProps {
  activeUrl: string
  items: BranchedMenuSection[]
  prefetch?: boolean
}

const PAD = 6
const MARK = 16
const ROW_HEIGHT = 36
const INDENT = 38
const TRUNK = 12
const RADIUS = 9

function matchesPath(pathname: string, url: string) {
  const normalize = (value: string) => value.replace(/\/$/, "") || "/"
  return normalize(pathname) === normalize(url)
}

export function BranchedMenu({
  activeUrl,
  items,
  prefetch,
}: BranchedMenuProps) {
  const [open, setOpen] = useState(() => new Set(items.map((_, i) => i)))
  const navRef = useRef<HTMLElement>(null)
  const heads = useRef<(HTMLButtonElement | null)[]>([])
  const markerRef = useRef<HTMLSpanElement>(null)
  const menuId = useId()

  const activeSection = items.findIndex((item) =>
    item.children.some((child) => matchesPath(activeUrl, child.url))
  )
  const markerShown = activeSection >= 0 && open.has(activeSection)

  useOnChange(activeUrl, () => {
    if (activeSection < 0) return
    setOpen((current) => new Set(current).add(activeSection))
  })

  useLayoutEffect(() => {
    const placeMarker = (animate: boolean) => {
      const marker = markerRef.current
      const heading = heads.current[activeSection]
      if (!marker) return

      if (!animate) marker.style.transition = "none"
      if (markerShown && heading) {
        marker.style.top = `${heading.offsetTop + (heading.offsetHeight - MARK) / 2}px`
      }
      marker.toggleAttribute("data-on", Boolean(markerShown && heading))

      if (!animate) {
        void marker.offsetHeight
        marker.style.transition = ""
      }
    }

    placeMarker(true)
    const observer = new ResizeObserver(() => placeMarker(false))
    if (navRef.current) observer.observe(navRef.current)
    return () => observer.disconnect()
  }, [activeSection, markerShown])

  const rowY = (index: number) => PAD + index * ROW_HEIGHT + ROW_HEIGHT / 2
  const branch = (index: number) =>
    `M ${TRUNK} ${rowY(index) - RADIUS} A ${RADIUS} ${RADIUS} 0 0 0 ${TRUNK + RADIUS} ${rowY(index)} H ${INDENT - 8}`
  const reach = (index: number) =>
    `M ${TRUNK} 0 V ${rowY(index) - RADIUS} A ${RADIUS} ${RADIUS} 0 0 0 ${TRUNK + RADIUS} ${rowY(index)} H ${INDENT - 8}`
  const length = (index: number) =>
    rowY(index) -
    RADIUS +
    (Math.PI * RADIUS) / 2 +
    (INDENT - 8 - TRUNK - RADIUS)

  return (
    <nav
      ref={navRef}
      aria-label="Documentation"
      className="relative flex w-full flex-col pl-3.5 text-sm leading-[1.2] [color:var(--bm-ink)] before:absolute before:top-2 before:bottom-0 before:left-0 before:w-0.5 before:rounded-full before:content-[''] before:[background:linear-gradient(to_bottom,var(--bm-line)_0%,var(--bm-line)_55%,transparent_100%)]"
      style={
        {
          "--bm-accent": "var(--color-fd-primary)",
          "--bm-draw": "400ms",
          "--bm-fold": "300ms",
          "--bm-indent": `${INDENT}px`,
          "--bm-ink": "var(--color-fd-popover-foreground)",
          "--bm-line":
            "color-mix(in srgb, var(--color-fd-foreground) 18%, transparent)",
          "--bm-muted": "var(--color-fd-muted-foreground)",
          "--bm-row": `${ROW_HEIGHT}px`,
        } as CSSProperties
      }
    >
      <span
        ref={markerRef}
        className="absolute -top-px left-0 z-[1] h-4 w-0.5 rounded-full opacity-0 [background:var(--bm-accent)] [transition:top_220ms_cubic-bezier(0.23,1,0.32,1),opacity_150ms_ease] data-[on]:opacity-100 motion-reduce:[transition:opacity_150ms_ease]"
        aria-hidden
      />

      {items.map((item, sectionIndex) => {
        const isOpen = open.has(sectionIndex)
        const bodyHeight = PAD * 2 + item.children.length * ROW_HEIGHT
        const sectionId = `${menuId}-${sectionIndex}`

        return (
          <div
            key={sectionId}
            className="group/section flex flex-col"
            data-open={isOpen ? "" : undefined}
          >
            <button
              ref={(element) => {
                heads.current[sectionIndex] = element
              }}
              type="button"
              className="focus-visible:outline-fd-ring m-0 block border-0 bg-transparent py-2.5 pb-2 text-left text-xs font-semibold tracking-[0.08em] text-[var(--bm-muted)] uppercase transition-colors outline-none [-webkit-tap-highlight-color:transparent] group-data-[open]/section:text-[var(--bm-ink)] hover:text-[var(--bm-ink)] focus-visible:rounded-md focus-visible:outline-2 focus-visible:outline-offset-2"
              aria-controls={sectionId}
              aria-expanded={isOpen}
              onClick={() => {
                setOpen((current) => {
                  const next = new Set(current)
                  if (next.has(sectionIndex)) next.delete(sectionIndex)
                  else next.add(sectionIndex)
                  return next
                })
              }}
            >
              {item.label}
            </button>

            <div
              id={sectionId}
              className="grid [grid-template-rows:0fr] [transition:grid-template-rows_var(--bm-fold)_cubic-bezier(0.23,1,0.32,1)] group-data-[open]/section:[grid-template-rows:1fr] motion-reduce:transition-none"
            >
              <div className="min-h-0 overflow-hidden">
                <div
                  className="relative box-border py-1.5"
                  style={{ height: bodyHeight }}
                >
                  <svg
                    className="pointer-events-none absolute top-0 left-0 overflow-visible opacity-0 [transition:opacity_200ms_ease] group-data-[open]/section:opacity-100 group-data-[open]/section:[transition:opacity_250ms_ease_100ms]"
                    width={INDENT}
                    height={bodyHeight}
                    aria-hidden
                  >
                    <path
                      className="fill-none [stroke:var(--bm-line)] [stroke-width:1.5] [stroke-linecap:round] [stroke-linejoin:round]"
                      d={`M ${TRUNK} 0 V ${rowY(item.children.length - 1) - RADIUS}`}
                    />
                    {item.children.map((child, childIndex) => (
                      <path
                        key={child.url}
                        className="fill-none [stroke:var(--bm-line)] [stroke-width:1.5] [stroke-linecap:round] [stroke-linejoin:round]"
                        d={branch(childIndex)}
                      />
                    ))}
                    {item.children.map((child, childIndex) => {
                      const pathLength = length(childIndex)
                      return (
                        <path
                          key={child.url}
                          className="fill-none [stroke:var(--bm-accent)] [stroke-width:1.5] [stroke-linecap:round] [stroke-linejoin:round] [transition:stroke-dashoffset_var(--bm-draw)_cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"
                          d={reach(childIndex)}
                          style={{
                            strokeDasharray: pathLength,
                            strokeDashoffset: matchesPath(activeUrl, child.url)
                              ? 0
                              : pathLength,
                          }}
                        />
                      )
                    })}
                  </svg>

                  {item.children.map((child) => {
                    const active = matchesPath(activeUrl, child.url)
                    return (
                      <Link
                        key={child.url}
                        href={child.url}
                        external={child.external}
                        prefetch={prefetch}
                        aria-current={active ? "page" : undefined}
                        className="focus-visible:outline-fd-ring hover:bg-fd-accent/65 m-0 box-border flex [height:var(--bm-row)] w-full items-center gap-2 rounded-lg border-0 bg-transparent py-0 pr-2 [padding-left:var(--bm-indent)] text-left text-[var(--bm-muted)] no-underline transition-colors outline-none [-webkit-tap-highlight-color:transparent] hover:text-[var(--bm-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 data-[active]:font-medium data-[active]:text-[var(--bm-accent)]"
                        data-active={active ? "" : undefined}
                        tabIndex={isOpen ? 0 : -1}
                      >
                        {child.icon ? (
                          <span
                            className="inline-flex flex-none [&_svg]:size-4"
                            aria-hidden
                          >
                            {child.icon}
                          </span>
                        ) : null}
                        <span className="truncate">{child.label}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </nav>
  )
}
