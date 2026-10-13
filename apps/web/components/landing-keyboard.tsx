import { readFile } from "node:fs/promises"
import path from "node:path"

import { LandingKeyboardFrame } from "./landing-keyboard-reveal"

export async function LandingKeyboard() {
  const svg = await readFile(
    path.join(process.cwd(), "public/landing/keyboard.svg"),
    "utf8"
  )

  return (
    <section className="landing-keyboard flex justify-center px-4 pt-6 pb-[calc(30px+4rem)] max-md:pt-4">
      <LandingKeyboardFrame>
        <div
          className="[&_svg]:block [&_svg]:h-auto [&_svg]:w-full [&_svg]:font-sans"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </LandingKeyboardFrame>
    </section>
  )
}
