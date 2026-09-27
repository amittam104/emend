import AiBackgroundIcon from "@hugeicons/core-free-icons/AiBackgroundIcon"
import AiDrawingIcon from "@hugeicons/core-free-icons/AiDrawingIcon"
import AiReplaceIcon from "@hugeicons/core-free-icons/AiReplaceIcon"
import PencilEdit02Icon from "@hugeicons/core-free-icons/PencilEdit02Icon"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

export const surfaceIcons = {
  assistant: AiDrawingIcon,
  "bubble-menu": AiReplaceIcon,
  composer: AiBackgroundIcon,
  editor: PencilEdit02Icon,
} satisfies Record<string, IconSvgElement>

export type SurfaceIconName = keyof typeof surfaceIcons

export function SurfaceIcon({
  name,
  size,
  strokeWidth = 2,
  className,
}: {
  readonly name: SurfaceIconName
  readonly size?: number
  readonly strokeWidth?: number
  readonly className?: string
}) {
  return (
    <HugeiconsIcon
      icon={surfaceIcons[name]}
      aria-hidden
      size={size}
      strokeWidth={strokeWidth}
      className={className}
    />
  )
}
