import AiChat02Icon from "@hugeicons/core-free-icons/AiChat02Icon"
import ApiIcon from "@hugeicons/core-free-icons/ApiIcon"
import BookOpen02Icon from "@hugeicons/core-free-icons/BookOpen02Icon"
import BracesIcon from "@hugeicons/core-free-icons/BracesIcon"
import Bug01Icon from "@hugeicons/core-free-icons/Bug01Icon"
import CodeIcon from "@hugeicons/core-free-icons/CodeIcon"
import FileCodeIcon from "@hugeicons/core-free-icons/FileCodeIcon"
import FunctionIcon from "@hugeicons/core-free-icons/FunctionIcon"
import InstallingUpdates02Icon from "@hugeicons/core-free-icons/InstallingUpdates02Icon"
import Layers01Icon from "@hugeicons/core-free-icons/Layers01Icon"
import LayoutBottomIcon from "@hugeicons/core-free-icons/LayoutBottomIcon"
import PencilEdit02Icon from "@hugeicons/core-free-icons/PencilEdit02Icon"
import Plug01Icon from "@hugeicons/core-free-icons/Plug01Icon"
import PuzzleIcon from "@hugeicons/core-free-icons/PuzzleIcon"
import Rocket02Icon from "@hugeicons/core-free-icons/Rocket02Icon"
import ServerStack01Icon from "@hugeicons/core-free-icons/ServerStack01Icon"
import TextSelectionIcon from "@hugeicons/core-free-icons/TextSelectionIcon"
import WorkflowSquare10Icon from "@hugeicons/core-free-icons/WorkflowSquare10Icon"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

/** Icons that page frontmatter and MDX components can refer to by name. */
export const docsIcons = {
  AiChat02Icon,
  ApiIcon,
  BookOpen02Icon,
  BracesIcon,
  Bug01Icon,
  CodeIcon,
  FileCodeIcon,
  FunctionIcon,
  InstallingUpdates02Icon,
  Layers01Icon,
  LayoutBottomIcon,
  PencilEdit02Icon,
  Plug01Icon,
  PuzzleIcon,
  Rocket02Icon,
  ServerStack01Icon,
  TextSelectionIcon,
  WorkflowSquare10Icon,
} satisfies Record<string, IconSvgElement>

export type DocsIconName = keyof typeof docsIcons

export function DocsIcon({
  name,
  className,
}: {
  readonly name: DocsIconName
  readonly className?: string
}) {
  return (
    <HugeiconsIcon
      icon={docsIcons[name]}
      aria-hidden
      className={className}
      strokeWidth={1.75}
    />
  )
}
