import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared"
import Image from "next/image"
import { createElement } from "react"

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: createElement(
        "span",
        {
          className:
            "inline-flex items-center gap-1.5 whitespace-nowrap font-sans",
        },
        createElement(Image, {
          src: "/emend-logo.svg",
          alt: "",
          width: 20,
          height: 20,
        }),
        createElement(
          "span",
          { className: "font-medium tracking-[-0.01em]" },
          "emend"
        )
      ),
      url: "/",
    },
    githubUrl: "https://github.com/amittam104/emend",
  }
}
