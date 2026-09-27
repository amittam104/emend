"use client"

import { useEffect, useId, useState } from "react"

import { DocsIcon, type DocsIconName } from "./docs-icons"
import { ShowcaseClip, type ShowcaseClipName } from "@/components/showcase-clip"
import { cn } from "@/lib/utils"

const surfaces: readonly {
  readonly clip: ShowcaseClipName
  readonly label: string
  readonly icon: DocsIconName
}[] = [
  {
    clip: "bubble",
    label: "Bubble Menu",
    icon: "AiReplaceIcon",
  },
  {
    clip: "composer",
    label: "Composer",
    icon: "AiBackgroundIcon",
  },
  {
    clip: "assistant",
    label: "AI Assistant",
    icon: "AiDrawingIcon",
  },
  {
    clip: "starter",
    label: "Editor starter",
    icon: "PencilEdit02Icon",
  },
]

const rotateMs = 10_000

/**
 * A short tour of the four surfaces at the top of the introduction. Each tab
 * plays the clip recorded from the live landing page, and the tabs advance on
 * their own until the visitor hovers or focuses the tour.
 */
export function DocsHero() {
  const id = useId()
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const surface = surfaces[active]!

  useEffect(() => {
    if (paused) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const timer = window.setTimeout(
      () => setActive((index) => (index + 1) % surfaces.length),
      rotateMs
    )
    return () => window.clearTimeout(timer)
  }, [active, paused])

  return (
    <section
      aria-label="emend components"
      className="not-prose bg-fd-card relative my-8 overflow-hidden rounded-2xl border"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false)
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(color-mix(in_oklch,var(--color-fd-foreground)_22%,transparent)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)] bg-[size:16px_16px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-80 w-[90%] -translate-x-1/2 bg-[radial-gradient(closest-side,color-mix(in_oklch,var(--color-fd-foreground)_8%,transparent),transparent)]"
      />

      <div className="relative flex flex-col items-center gap-5 px-4 py-6 sm:px-8 sm:py-8">
        <div
          role="tablist"
          aria-label="Choose a component"
          className="bg-fd-background/80 shadow-elevation-1 flex max-w-full flex-wrap justify-center gap-1 rounded-full border p-1 backdrop-blur"
        >
          {surfaces.map((item, index) => {
            const selected = index === active
            return (
              <button
                key={item.clip}
                type="button"
                role="tab"
                id={`${id}-tab-${item.clip}`}
                aria-selected={selected}
                aria-controls={`${id}-panel`}
                onClick={() => setActive(index)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-[background-color,color,box-shadow] duration-200 ease-out",
                  selected
                    ? "bg-fd-foreground text-fd-background shadow-elevation-1"
                    : "text-fd-muted-foreground hover:bg-fd-muted hover:text-fd-foreground"
                )}
              >
                <DocsIcon name={item.icon} className="size-3.5" />
                {item.label}
              </button>
            )
          })}
        </div>

        <div
          role="tabpanel"
          id={`${id}-panel`}
          aria-labelledby={`${id}-tab-${surface.clip}`}
          className="w-full max-w-[600px]"
        >
          <div className="bg-fd-background shadow-elevation-3 aspect-[16/10] overflow-hidden rounded-xl border">
            <div
              key={surface.clip}
              className="size-full animate-in duration-500 ease-out fade-in-0 zoom-in-[0.985] motion-reduce:animate-none"
            >
              <ShowcaseClip clip={surface.clip} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
