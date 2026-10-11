"use client"

import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function EditorToolbarScroller({
  children,
  className,
  size = "icon",
}: {
  readonly children: ReactNode
  readonly className?: string
  readonly size?: "icon" | "icon-xs"
}) {
  const viewport = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const [overflow, setOverflow] = useState({ start: false, end: false })

  useEffect(() => {
    const element = viewport.current
    if (!element || !content.current) return

    const update = () => {
      const maxScroll = element.scrollWidth - element.clientWidth
      setOverflow({
        start: element.scrollLeft > 1,
        end: element.scrollLeft < maxScroll - 1,
      })
    }
    const observer = new ResizeObserver(update)
    observer.observe(element)
    observer.observe(content.current)
    element.addEventListener("scroll", update, { passive: true })
    update()
    return () => {
      observer.disconnect()
      element.removeEventListener("scroll", update)
    }
  }, [])

  function scroll(direction: 1 | -1) {
    const element = viewport.current
    if (!element) return
    element.scrollBy({
      left: direction * element.clientWidth * 0.75,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    })
  }

  const scrollable = overflow.start || overflow.end

  return (
    <div className={cn("flex min-w-0 flex-1 items-center", className)}>
      {scrollable && (
        <ScrollButton
          direction={-1}
          size={size}
          disabled={!overflow.start}
          onClick={() => scroll(-1)}
        />
      )}
      <div
        ref={viewport}
        className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div ref={content} className="flex w-max items-center">
          {children}
        </div>
      </div>
      {scrollable && (
        <ScrollButton
          direction={1}
          size={size}
          disabled={!overflow.end}
          onClick={() => scroll(1)}
        />
      )}
    </div>
  )
}

function ScrollButton({
  direction,
  size,
  disabled,
  onClick,
}: {
  readonly direction: 1 | -1
  readonly size: "icon" | "icon-xs"
  readonly disabled: boolean
  readonly onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      className="data-disabled:opacity-40"
      aria-label={
        direction === 1 ? "Scroll toolbar right" : "Scroll toolbar left"
      }
      disabled={disabled}
      focusableWhenDisabled
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      <HugeiconsIcon
        icon={direction === 1 ? ArrowRight01Icon : ArrowLeft01Icon}
      />
    </Button>
  )
}
