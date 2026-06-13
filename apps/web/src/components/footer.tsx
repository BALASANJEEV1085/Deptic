const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '/#features' },
      { label: 'API', href: '/#api' },
      { label: 'Pricing', href: '/#pricing' },
      { label: 'Docs', href: '/docs' }
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '/docs' }
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' }
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t border-[var(--lp-border)] bg-[var(--lp-bg)] px-6 pb-10 pt-16 md:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <span className="text-lg font-bold tracking-tight text-[var(--lp-text)]">
              Deptic
            </span>
            <p className="mt-3 max-w-xs text-sm text-[var(--lp-text-muted)]">
              SBOM intelligence for modern engineering teams. Complete visibility
              into your software supply chain.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold text-[var(--lp-text)]">{col.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-[var(--lp-text-muted)] transition-colors hover:text-[var(--lp-text)]"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-[var(--lp-border)] pt-6 md:flex-row md:items-center">
          <p className="text-sm text-[var(--lp-text-muted)]">
            © {new Date().getFullYear()} Deptic. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[var(--green)] animate-dot-pulse" />
            <span className="text-sm text-[var(--lp-text-muted)]">All systems online</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
