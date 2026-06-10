'use client'

const TESTIMONIALS = [
  {
    quote: 'Deptic caught a critical transitive CVE our previous scanner missed entirely. Shipped a fix in minutes.',
    name: 'Sarah Chen',
    role: 'Staff Engineer, Lattice',
  },
  {
    quote: 'The NTIA compliance score alone saved us a week of manual audit work before our SOC 2.',
    name: 'Marcus Webb',
    role: 'Head of Security, Northwind',
  },
  {
    quote: 'Multi-ecosystem scanning in one pass. Our monorepo spans npm, Go, and Python — finally one tool.',
    name: 'Priya Nair',
    role: 'Platform Lead, Cobalt',
  },
  {
    quote: 'Fix-with-PR is magic. It opened a clean diff patching four dependencies. We just clicked merge.',
    name: 'Diego Alvarez',
    role: 'Senior SRE, Helios',
  },
  {
    quote: 'Vendor sharing with no login meant our customers could verify our SBOM without friction.',
    name: 'Emma Larsson',
    role: 'VP Engineering, Veridian',
  },
  {
    quote: 'Auto-scan on push gives us continuous assurance. Every deploy is verified against the latest CVEs.',
    name: 'Tom Okafor',
    role: 'DevOps Manager, Apex',
  },
  {
    quote: 'We replaced three separate tools with Deptic. One dashboard, all ecosystems, zero blind spots.',
    name: 'Anika Patel',
    role: 'CTO, StackLayer',
  },
  {
    quote: 'The PDF report export made our compliance reviews painless. Auditors love the format.',
    name: 'James Thornton',
    role: 'Compliance Officer, Finsecure',
  },
  {
    quote: 'Deptic found 23 vulnerable transitive deps we had no idea existed. That alone justified the switch.',
    name: 'Yuki Tanaka',
    role: 'Security Architect, Kaizen',
  },
  {
    quote: 'Setup took five minutes. First scan surfaced a log4j variant hiding three layers deep in our graph.',
    name: 'Rachel Gomez',
    role: 'Engineering Manager, Cloudrift',
  },
  {
    quote: 'The CycloneDX and SPDX exports saved us from building custom tooling. Standards out of the box.',
    name: 'Oliver Brandt',
    role: 'Lead Developer, Neovault',
  },
  {
    quote: 'Our CI pipeline now gates on Deptic scores. No build ships with unresolved critical CVEs anymore.',
    name: 'Fatima Al-Rashid',
    role: 'Principal Engineer, Orion',
  },
  {
    quote: 'Deptic gives us peace of mind. We know exactly what is in our software at all times.',
    name: 'David Chen',
    role: 'Security Analyst, Sentinel',
  },
  {
    quote: 'The integration with GitHub Actions was flawless. We were up and running in minutes.',
    name: 'Elena Rodriguez',
    role: 'DevOps Engineer, CloudNative',
  },
  {
    quote: 'I love how it prioritizes vulnerabilities based on actual exploitability. Less noise, more action.',
    name: 'Michael Chang',
    role: 'AppSec Manager, FinTech Solutions',
  },
  {
    quote: 'Generating SBOMs used to take days. Now it is completely automated with every release.',
    name: 'Jessica Lee',
    role: 'Release Manager, GlobalSoft',
  },
  {
    quote: 'The visual dependency graph helped us identify and remove several redundant libraries.',
    name: 'Brian Smith',
    role: 'Senior Developer, WebWorks',
  },
  {
    quote: 'Deptic is the first tool that our developers actually enjoy using. It is fast and intuitive.',
    name: 'Amanda Taylor',
    role: 'VP Engineering, Innovate',
  },
  {
    quote: 'We caught a malicious package update before it even hit our staging environment.',
    name: 'Kevin Davis',
    role: 'SecOps Lead, DefendTech',
  },
  {
    quote: 'The reporting features are top-notch. It makes communicating risk to the board much easier.',
    name: 'Laura Martinez',
    role: 'CISO, EnterpriseCorp',
  },
  {
    quote: 'I highly recommend Deptic to any team serious about securing their supply chain.',
    name: 'Steven Wilson',
    role: 'Security Consultant, Independent',
  },
  {
    quote: 'It found vulnerabilities that other popular commercial scanners missed completely.',
    name: 'Samantha Brown',
    role: 'Cybersecurity Researcher, InfoSec Labs',
  },
  {
    quote: 'The automated PR feature is a game-changer. It literally does the work for us.',
    name: 'Christopher Jones',
    role: 'Lead Architect, BuildFast',
  },
  {
    quote: 'Deptic helps us maintain compliance with the latest industry regulations effortlessly.',
    name: 'Ashley Garcia',
    role: 'Compliance Director, SecureHealth',
  },
  {
    quote: 'The support team is incredibly responsive and helpful. They really listen to feedback.',
    name: 'Matthew Miller',
    role: 'IT Manager, TechCorp',
  },
  {
    quote: 'A must-have tool for modern software development. I would not build without it.',
    name: 'Emily Anderson',
    role: 'Full Stack Developer, StartupInc',
  },
  {
    quote: 'It gives us a clear picture of our technical debt and where we need to focus our efforts.',
    name: 'Joshua Thomas',
    role: 'Engineering Director, ScaleUp',
  },
  {
    quote: 'The zero-configuration setup is brilliant. It just works right out of the box.',
    name: 'Olivia Jackson',
    role: 'Systems Administrator, CloudSys',
  },
  {
    quote: 'Deptic has significantly reduced the time we spend managing open-source dependencies.',
    name: 'Andrew White',
    role: 'Software Engineer, DataDrive',
  },
  {
    quote: 'The insights provided by Deptic have helped us make better architectural decisions.',
    name: 'Megan Harris',
    role: 'Principal Architect, NextGen',
  },
  {
    quote: 'It is simply the best SBOM and dependency scanning tool on the market today.',
    name: 'Daniel Martin',
    role: 'CTO, TechVision',
  },
]

function Card({ t }: { t: (typeof TESTIMONIALS)[number] }) {
  return (
    <figure className="w-80 shrink-0 rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a] p-6 transition-colors duration-300 hover:border-[#333333]">
      <blockquote className="text-sm italic leading-relaxed text-white">
        &ldquo;{t.quote}&rdquo;
      </blockquote>
      <figcaption className="mt-4">
        <p className="text-[13px] font-bold text-white">{t.name}</p>
        <p className="text-xs text-[#888888]">{t.role}</p>
      </figcaption>
    </figure>
  )
}

function Row({
  direction,
  duration,
}: {
  direction: 'left' | 'right'
  duration: number
}) {
  const items = [...TESTIMONIALS, ...TESTIMONIALS]
  return (
    <div className="marquee-pause overflow-hidden">
      <div
        className={`marquee-track gap-5 ${
          direction === 'left' ? 'marquee-left' : 'marquee-right'
        }`}
        style={{ ['--marquee-duration' as string]: `${duration}s` }}
      >
        {items.map((t, i) => (
          <Card key={`${t.name}-${i}`} t={t} />
        ))}
      </div>
    </div>
  )
}

export function Testimonials() {
  return (
    <section className="bg-black py-24 md:py-28">
      <div className="mx-auto mb-12 max-w-7xl px-5">
        <h2 className="text-center font-heading text-3xl font-bold tracking-[-0.02em] text-white md:text-4xl">
          Trusted by security-first teams
        </h2>
      </div>
      <div className="flex flex-col gap-5">
        <Row direction="left" duration={180} />
        <Row direction="right" duration={220} />
      </div>
    </section>
  )
}
