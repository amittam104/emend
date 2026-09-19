export function SiteFooter() {
  return (
    <footer className="not-prose text-fd-muted-foreground mt-16 flex flex-col gap-2 border-t pt-6 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p>Emend documentation</p>
      <a
        className="hover:text-fd-foreground transition-colors"
        href="https://github.com/amittam104/emend"
        rel="noreferrer"
        target="_blank"
      >
        View the source on GitHub
      </a>
    </footer>
  )
}
