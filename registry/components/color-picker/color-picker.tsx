"use client"

// Adapted from Kibo UI's color picker (https://github.com/shadcnblocks/kibo).
// Copyright (c) 2023 — Present shadcnblocks. MIT License, see LICENSE.md.

import { Slider as SliderPrimitive } from "@base-ui/react/slider"
import { ColorPickerIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Color, { type ColorInstance } from "color"
import {
  createContext,
  useContext,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
} from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface Hsva {
  readonly h: number
  readonly s: number
  readonly v: number
  readonly a: number
}

const formats = ["hex", "rgb", "css", "hsl"] as const

export type ColorPickerMode = (typeof formats)[number]

interface ColorPickerContextValue {
  readonly hue: number
  readonly saturation: number
  readonly brightness: number
  readonly alpha: number
  readonly color: ColorInstance
  readonly mode: ColorPickerMode
  readonly setMode: (mode: ColorPickerMode) => void
  readonly update: (patch: Partial<Hsva>) => void
}

const ColorPickerContext = createContext<ColorPickerContextValue | undefined>(
  undefined
)

export const useColorPicker = () => {
  const context = useContext(ColorPickerContext)

  if (!context) {
    throw new Error("useColorPicker must be used within a ColorPicker")
  }

  return context
}

const clamp = (value: number, max = 100) =>
  Math.min(max, Math.max(0, Number.isFinite(value) ? value : 0))

function toColor({ h, s, v, a }: Hsva) {
  return Color.hsv(h, s, v).alpha(a / 100)
}

function toHsva(color: ColorInstance, previous?: Hsva): Hsva {
  const [h = 0, s = 0, v = 0] = color.hsv().array()
  const achromatic = s === 0 || v === 0

  return {
    h: achromatic && previous ? previous.h : h,
    s: v === 0 && previous ? previous.s : s,
    v,
    a: Math.round(color.alpha() * 100),
  }
}

function resolveCssColor(value: string) {
  if (typeof document === "undefined" || !CSS.supports("color", value)) {
    return null
  }

  const probe = document.createElement("span")
  probe.style.color = value
  document.body.append(probe)
  const computed = getComputedStyle(probe).color
  probe.remove()

  try {
    return Color(computed)
  } catch {
    const context = document
      .createElement("canvas")
      .getContext("2d", { willReadFrequently: true })
    if (!context) return null

    context.fillStyle = computed
    context.fillRect(0, 0, 1, 1)
    const [r = 0, g = 0, b = 0, a = 0] = context.getImageData(0, 0, 1, 1).data
    return Color.rgb(r, g, b).alpha(Math.round((a / 255) * 100) / 100)
  }
}

function parseColor(value: string | undefined | null) {
  const text = value?.trim()
  if (!text) return null

  try {
    return Color(text)
  } catch {
    return resolveCssColor(text)
  }
}

/** Returns hex for opaque colors and `rgba()` otherwise, both valid CSS. */
export function formatCssColor(color: ColorInstance) {
  if (color.alpha() >= 1) return color.hex().toLowerCase()

  const [r, g, b] = color.rgb().round().array()
  return `rgba(${r}, ${g}, ${b}, ${Number(color.alpha().toFixed(2))})`
}

export type ColorPickerProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "defaultValue" | "onChange"
> & {
  readonly value?: string
  readonly defaultValue?: string
  readonly onChange?: (value: string) => void
}

export const ColorPicker = ({
  value,
  defaultValue = "#000000",
  onChange,
  className,
  ...props
}: ColorPickerProps) => {
  const [hsva, setHsva] = useState<Hsva>(() =>
    toHsva(parseColor(value) ?? parseColor(defaultValue) ?? Color("#000000"))
  )
  const [syncedValue, setSyncedValue] = useState(value)
  const [mode, setMode] = useState<ColorPickerMode>("hex")
  const color = toColor(hsva)

  if (value !== syncedValue) {
    setSyncedValue(value)
    const next = parseColor(value)
    if (next && formatCssColor(next) !== formatCssColor(color)) {
      setHsva(toHsva(next, hsva))
    }
  }

  const update = (patch: Partial<Hsva>) => {
    const next = { ...hsva, ...patch }
    setHsva(next)
    onChange?.(formatCssColor(toColor(next)))
  }

  return (
    <ColorPickerContext.Provider
      value={{
        hue: hsva.h,
        saturation: hsva.s,
        brightness: hsva.v,
        alpha: hsva.a,
        color,
        mode,
        setMode,
        update,
      }}
    >
      <div
        className={cn("flex size-full flex-col gap-4", className)}
        {...props}
      />
    </ColorPickerContext.Provider>
  )
}

export type ColorPickerSelectionProps = HTMLAttributes<HTMLDivElement>

export const ColorPickerSelection = ({
  className,
  ...props
}: ColorPickerSelectionProps) => {
  const { hue, saturation, brightness, color, update } = useColorPicker()

  function moveTo(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = clamp((event.clientX - rect.left) / rect.width, 1)
    const y = clamp((event.clientY - rect.top) / rect.height, 1)

    update({ s: x * 100, v: (1 - y) * 100 })
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 10 : 1
    const moves: Record<string, Partial<Hsva>> = {
      ArrowLeft: { s: clamp(saturation - step) },
      ArrowRight: { s: clamp(saturation + step) },
      ArrowUp: { v: clamp(brightness + step) },
      ArrowDown: { v: clamp(brightness - step) },
    }
    const patch = moves[event.key]
    if (!patch) return

    event.preventDefault()
    update(patch)
  }

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="Saturation and brightness"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(saturation)}
      aria-valuetext={`Saturation ${Math.round(saturation)}%, brightness ${Math.round(brightness)}%`}
      className={cn(
        "relative size-full cursor-crosshair touch-none rounded outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className
      )}
      style={{
        background: `linear-gradient(0deg, rgba(0,0,0,1), rgba(0,0,0,0)),
          linear-gradient(90deg, rgba(255,255,255,1), rgba(255,255,255,0)),
          hsl(${hue}, 100%, 50%)`,
      }}
      onPointerDown={(event) => {
        if (event.button !== 0) return
        event.preventDefault()
        event.currentTarget.focus()
        event.currentTarget.setPointerCapture(event.pointerId)
        moveTo(event)
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          moveTo(event)
        }
      }}
      onKeyDown={handleKeyDown}
      {...props}
    >
      <div
        className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
        style={{
          left: `${saturation}%`,
          top: `${100 - brightness}%`,
          background: color.alpha(1).hex(),
          boxShadow: "0 0 0 1px rgba(0,0,0,0.5)",
        }}
      />
    </div>
  )
}

const sliderThumbClasses =
  "block size-4 rounded-full border border-primary/50 bg-background shadow transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50"

export type ColorPickerHueProps = SliderPrimitive.Root.Props<number>

export const ColorPickerHue = ({
  className,
  ...props
}: ColorPickerHueProps) => {
  const { hue, update } = useColorPicker()

  return (
    <SliderPrimitive.Root
      className={cn("w-full", className)}
      max={360}
      step={1}
      value={hue}
      onValueChange={(value) => update({ h: value })}
      {...props}
    >
      <SliderPrimitive.Control className="relative flex h-4 w-full touch-none items-center select-none">
        <SliderPrimitive.Track className="relative h-3 w-full grow rounded-full bg-[linear-gradient(90deg,#FF0000,#FFFF00,#00FF00,#00FFFF,#0000FF,#FF00FF,#FF0000)]">
          <SliderPrimitive.Thumb
            getAriaLabel={() => "Hue"}
            className={sliderThumbClasses}
          />
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export type ColorPickerAlphaProps = SliderPrimitive.Root.Props<number>

export const ColorPickerAlpha = ({
  className,
  ...props
}: ColorPickerAlphaProps) => {
  const { alpha, color, update } = useColorPicker()

  return (
    <SliderPrimitive.Root
      className={cn("w-full", className)}
      max={100}
      step={1}
      value={alpha}
      onValueChange={(value) => update({ a: value })}
      {...props}
    >
      <SliderPrimitive.Control className="relative flex h-4 w-full touch-none items-center select-none">
        <SliderPrimitive.Track className="relative h-3 w-full grow rounded-full bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==')] bg-center bg-repeat-x dark:bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAALklEQVR4nGP8+vWrCAMewM3N/QafPBM+SWLAqAGDwQBGQgoIpZOB98KoAVQwAADxzQcSVIRCfQAAAABJRU5ErkJggg==')]">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `linear-gradient(90deg, transparent, ${color.alpha(1).hex()})`,
            }}
          />
          <SliderPrimitive.Thumb
            getAriaLabel={() => "Opacity"}
            getAriaValueText={(_, value) => `${value}%`}
            className={sliderThumbClasses}
          />
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

type EyeDropperConstructor = new () => {
  open: () => Promise<{ sRGBHex: string }>
}

const subscribeToNothing = () => () => {}

export type ColorPickerEyeDropperProps = ComponentProps<typeof Button>

export const ColorPickerEyeDropper = ({
  className,
  ...props
}: ColorPickerEyeDropperProps) => {
  const { update } = useColorPicker()
  const supported = useSyncExternalStore(
    subscribeToNothing,
    () => "EyeDropper" in window,
    () => false
  )

  if (!supported) return null

  const handleEyeDropper = async () => {
    const EyeDropper = (
      window as Window & { EyeDropper?: EyeDropperConstructor }
    ).EyeDropper
    if (!EyeDropper) return

    try {
      const result = await new EyeDropper().open()
      const picked = parseColor(result.sRGBHex)
      if (picked) update({ ...toHsva(picked), a: 100 })
    } catch {
      // The user dismissed the eyedropper.
    }
  }

  return (
    <Button
      className={cn("shrink-0 text-muted-foreground", className)}
      onClick={handleEyeDropper}
      size="icon"
      type="button"
      variant="outline"
      aria-label="Pick a color from the screen"
      {...props}
    >
      <HugeiconsIcon icon={ColorPickerIcon} />
    </Button>
  )
}

export type ColorPickerOutputProps = ComponentProps<typeof SelectTrigger>

export const ColorPickerOutput = ({
  className,
  ...props
}: ColorPickerOutputProps) => {
  const { mode, setMode } = useColorPicker()

  return (
    <Select
      value={mode}
      onValueChange={(value) => {
        if (value) setMode(value)
      }}
    >
      <SelectTrigger
        size="sm"
        aria-label="Color format"
        className={cn("w-20 shrink-0 text-xs", className)}
        {...props}
      >
        <SelectValue>{mode.toUpperCase()}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {formats.map((format) => (
          <SelectItem className="text-xs" key={format} value={format}>
            {format.toUpperCase()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

type ColorInputProps = Omit<ComponentProps<typeof Input>, "value"> & {
  readonly value: string
  readonly onCommit: (value: string) => void
}

const ColorInput = ({
  value,
  onCommit,
  className,
  ...props
}: ColorInputProps) => {
  const [draft, setDraft] = useState(value)
  const [syncedValue, setSyncedValue] = useState(value)

  if (value !== syncedValue) {
    setSyncedValue(value)
    setDraft(value)
  }

  function commit() {
    if (draft !== value) onCommit(draft)
    setDraft(value)
  }

  return (
    <Input
      type="text"
      spellCheck={false}
      autoComplete="off"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault()
          commit()
        }
      }}
      className={cn(
        "h-8 bg-secondary px-2 text-xs shadow-none md:text-xs",
        className
      )}
      {...props}
    />
  )
}

const PercentageInput = ({ className, ...props }: ColorInputProps) => {
  return (
    <div className="relative shrink-0">
      <ColorInput
        inputMode="numeric"
        {...props}
        className={cn("w-[3.25rem] rounded-l-none pr-5", className)}
      />
      <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs text-muted-foreground">
        %
      </span>
    </div>
  )
}

export type ColorPickerFormatProps = HTMLAttributes<HTMLDivElement>

export const ColorPickerFormat = ({
  className,
  ...props
}: ColorPickerFormatProps) => {
  const { hue, saturation, brightness, alpha, color, mode, update } =
    useColorPicker()
  const current = { h: hue, s: saturation, v: brightness, a: alpha }

  const commitColor = (next: ColorInstance | null, keepAlpha = true) => {
    if (!next) return
    const hsva = toHsva(next, current)
    update(keepAlpha ? { ...hsva, a: alpha } : hsva)
  }

  const alphaInput = (
    <PercentageInput
      aria-label="Opacity"
      value={String(alpha)}
      onCommit={(text) => {
        const next = Number.parseFloat(text)
        if (Number.isFinite(next)) update({ a: Math.round(clamp(next)) })
      }}
    />
  )

  if (mode === "css") {
    return (
      <div className={cn("w-full", className)} {...props}>
        <ColorInput
          aria-label="CSS color"
          className="w-full"
          value={formatCssColor(color)}
          onCommit={(text) => commitColor(parseColor(text), false)}
        />
      </div>
    )
  }

  if (mode === "hex") {
    return (
      <div
        className={cn("flex w-full items-center -space-x-px", className)}
        {...props}
      >
        <ColorInput
          aria-label="Hex color"
          className="rounded-r-none"
          value={color.hex()}
          onCommit={(text) =>
            commitColor(parseColor(`#${text.trim().replace(/^#/, "")}`))
          }
        />
        {alphaInput}
      </div>
    )
  }

  const channels =
    mode === "rgb"
      ? {
          labels: ["Red", "Green", "Blue"],
          max: [255, 255, 255],
          values: color.rgb().round().array().slice(0, 3),
          build: (values: number[]) => Color.rgb(values),
        }
      : {
          labels: ["Hue", "Saturation", "Lightness"],
          max: [360, 100, 100],
          values: color.hsl().round().array().slice(0, 3),
          build: (values: number[]) => Color.hsl(values),
        }

  return (
    <div
      className={cn("flex w-full items-center -space-x-px", className)}
      {...props}
    >
      {channels.values.map((value, index) => (
        <ColorInput
          key={channels.labels[index]}
          aria-label={channels.labels[index]}
          inputMode="numeric"
          className={cn("min-w-0 rounded-r-none", index && "rounded-l-none")}
          value={String(value)}
          onCommit={(text) => {
            const next = Number.parseFloat(text)
            if (!Number.isFinite(next)) return
            const values = [...channels.values]
            values[index] = clamp(next, channels.max[index])
            commitColor(channels.build(values))
          }}
        />
      ))}
      {alphaInput}
    </div>
  )
}
