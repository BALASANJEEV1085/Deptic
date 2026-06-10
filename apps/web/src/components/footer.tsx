const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '/#features' },
      { label: 'API', href: '/#api' },
      { label: 'Pricing', href: '/#pricing' },
      { label: 'Docs', href: '/docs' },
      { label: 'Blog', href: '/blog' }
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '/docs' },
      { label: 'GitHub', href: '#' },
      { label: 'Changelog', href: '#' }
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
    <footer className="border-t border-[#1a1a1a] bg-black px-6 pb-10 pt-16 md:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <span className="text-lg font-bold tracking-tight text-white">
              Deptic
            </span>
            <p className="mt-3 max-w-xs text-sm text-[#888888]">
              SBOM intelligence for modern engineering teams. Complete visibility
              into your software supply chain.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold text-white">{col.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-[#888888] transition-colors hover:text-white"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-[#1a1a1a] pt-6 md:flex-row md:items-center">
          <p className="text-sm text-[#666666]">
            © {new Date().getFullYear()} Deptic. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-white animate-dot-pulse" />
            <span className="text-sm text-[#888888]">All systems online</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
