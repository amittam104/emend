"use client"

import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

export type ShowcaseClipName = "assistant" | "bubble" | "composer" | "starter"

/**
 * Plays only while on screen, and not at all when the visitor prefers reduced
 * motion; the poster frame stands in for the clip in both cases. A hidden
 * video never intersects, so it never plays or downloads.
 */
function ThemedVideo({
  src,
  poster,
  className,
}: {
  readonly src: string
  readonly poster: string
  readonly className: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) video.play().catch(() => {})
        else video.pause()
      },
      { threshold: 0.4 }
    )
    observer.observe(video)
    return () => observer.disconnect()
  }, [])

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden
      className={cn("size-full object-cover", className)}
    />
  )
}

/**
 * Clips are recorded from the landing page in both themes. CSS picks the one
 * that matches the page, so it works under any theme provider and switches
 * instantly when the theme changes.
 */
export function ShowcaseClip({ clip }: { readonly clip: ShowcaseClipName }) {
  return (
    <>
      <ThemedVideo
        src={`/landing/${clip}-light.webm`}
        poster={`/landing/${clip}-light.jpg`}
        className="dark:hidden"
      />
      <ThemedVideo
        src={`/landing/${clip}-dark.webm`}
        poster={`/landing/${clip}-dark.jpg`}
        className="hidden dark:block"
      />
    </>
  )
}
