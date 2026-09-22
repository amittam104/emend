import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared"
import Image from "next/image"
import { createElement } from "react"

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: createElement(
        "span",
        { className: "inline-flex items-center gap-2" },
        createElement(Image, {
          src: "/emend-logo.svg",
          alt: "",
          width: 20,
          height: 20,
        }),
        createElement("span", null, "emend")
      ),
      url: "/",
    },
    githubUrl: "https://github.com/amittam104/emend",
  }
}
