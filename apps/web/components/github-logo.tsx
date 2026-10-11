import { cn } from "@workspace/ui/lib/utils"

export const githubRepositoryUrl = "https://github.com/amittam104/emend"

const githubLogoUrl =
  "https://upload.wikimedia.org/wikipedia/commons/1/10/Codicons_%E2%80%93_github-inverted.svg?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=original"

export function GitHubLogo({ className }: { readonly className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-4 shrink-0 bg-current", className)}
      style={{
        mask: `url("${githubLogoUrl}") center / contain no-repeat`,
        WebkitMask: `url("${githubLogoUrl}") center / contain no-repeat`,
      }}
    />
  )
}
