import type { ReactNode } from "react"

export function LandingKeyboardFrame({
  children,
}: {
  readonly children: ReactNode
}) {
  return <div className="w-full max-w-[955px]">{children}</div>
}
