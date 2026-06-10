import { H1, H2, P, Callout, CodeBlock, Ul, Li, A } from '@/components/docs/ui-components'
import { ArrowRight, Zap, Terminal, Code2 } from 'lucide-react'
import Link from 'next/link'

export default function Page() {
  return (
    <>
      <div className="border-b border-[#1a1a1a] pb-8 mb-12">
        <h1 className="font-heading text-[36px] font-bold tracking-[-1px] text-white leading-tight mb-4">
          Deptic Documentation
        </h1>
        <p className="text-[#888888] text-lg leading-relaxed">
          Everything you need to understand, integrate, and get the most out of Deptic&apos;s software supply chain security platform.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
        <Link href="/docs/quick-start" className="group rounded-[10px] border border-[#1a1a1a] bg-[#111111] p-6 hover:border-[#333333] transition-colors">
          <div className="w-10 h-10 rounded-lg bg-[#1a1a1a] flex items-center justify-center mb-4">
            <Zap size={20} className="text-white" />
          </div>
          <h3 className="text-base font-semibold text-white mb-2">Quick Start</h3>
          <p className="text-sm text-[#888888] mb-6">Scan your first repository in 2 minutes</p>
          <div className="flex items-center text-xs font-semibold text-white group-hover:text-[#aaaaaa]">
            Get started <ArrowRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
        <Link href="/docs/api-scans" className="group rounded-[10px] border border-[#1a1a1a] bg-[#111111] p-6 hover:border-[#333333] transition-colors">
          <div className="w-10 h-10 rounded-lg bg-[#1a1a1a] flex items-center justify-center mb-4">
            <Code2 size={20} className="text-white" />
          </div>
          <h3 className="text-base font-semibold text-white mb-2">API Reference</h3>
          <p className="text-sm text-[#888888] mb-6">Integrate Deptic into your CI/CD pipeline</p>
          <div className="flex items-center text-xs font-semibold text-white group-hover:text-[#aaaaaa]">
            View endpoints <ArrowRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
        <Link href="/docs/cli-scanner" className="group rounded-[10px] border border-[#1a1a1a] bg-[#111111] p-6 hover:border-[#333333] transition-colors">
          <div className="w-10 h-10 rounded-lg bg-[#1a1a1a] flex items-center justify-center mb-4">
            <Terminal size={20} className="text-white" />
          </div>
          <h3 className="text-base font-semibold text-white mb-2">CLI Scanner</h3>
          <p className="text-sm text-[#888888] mb-6">Scan local projects from your terminal</p>
          <div className="flex items-center text-xs font-semibold text-white group-hover:text-[#aaaaaa]">
            Install CLI <ArrowRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      <H2 id="what-is-deptic">What is Deptic?</H2>
      <P>
        Deptic is a software supply chain security platform that automatically generates Software Bills of Materials (SBOMs), detects known vulnerabilities (CVEs) across all dependencies, and verifies compliance with government mandates including US Executive Order 14028 (NTIA) and the EU Cyber Resilience Act.
      </P>
      <P>
        Deptic supports 8 package ecosystems: npm, pip, Maven, Go, Rust, Ruby, PHP, and .NET. It resolves full transitive dependency trees — not just direct dependencies — giving complete visibility into every component your software ships with.
      </P>

      <Callout type="info" className="mt-8">
        <h4 className="text-sm font-semibold text-white mb-3">Key concepts</h4>
        <Ul className="mb-0 space-y-3">
          <Li><strong className="text-white">SBOM:</strong> A Software Bill of Materials is a complete inventory of all components in a software product</Li>
          <Li><strong className="text-white">NTIA Minimum Elements:</strong> 7 data fields required by US federal mandate for each component</Li>
          <Li><strong className="text-white">PURL:</strong> Package URL — a standard identifier format for packages across all ecosystems</Li>
          <Li><strong className="text-white">CVE:</strong> Common Vulnerabilities and Exposures — a public database of known security vulnerabilities</Li>
        </Ul>
      </Callout>
    </>
  )
}
