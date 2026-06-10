import React from 'react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { ContactCards } from './ContactCards';

export const metadata = {
  title: 'About | Deptic',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#000000] text-[#ffffff] font-sans selection:bg-white/10 selection:text-white flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-32 pb-24 px-6 md:px-[48px] w-full max-w-[860px] mx-auto">
        <header className="mb-16">
          <div className="text-[#888888] text-[12px] font-mono uppercase tracking-[0.1em] mb-4">About Deptic</div>
          <h1 className="font-syne text-[40px] md:text-[56px] font-bold tracking-[-1.5px] text-[#ffffff] mb-6 leading-[1.1] max-w-[700px]">
            Built to make software supply chains transparent
          </h1>
          <p className="text-[#888888] text-[20px] leading-[1.8] font-light">
            Deptic started with one question: how can a developer know exactly what their software is made of? We built the answer.
          </p>
          <div className="w-full h-px bg-[#1a1a1a] mt-[64px] mb-0"></div>
        </header>

        <section className="mb-20">
          <h2 className="font-syne text-[32px] font-bold text-[#ffffff] mb-8 pb-4 border-b border-[#1a1a1a]">The problem we're solving</h2>
          <div className="text-[#888888] text-[16px] leading-[1.85] space-y-6">
            <p>
              Modern software doesn't exist in isolation. A typical web application depends on hundreds — sometimes thousands — of third-party packages. A React frontend alone can have 1,200+ transitive dependencies. A Spring Boot backend routinely pulls in 300+ Maven artifacts. Most developers have no idea what's inside their stack.
            </p>
            <p>
              This isn't a theoretical risk. In December 2021, a single vulnerability in <code className="font-mono text-[#ffffff] bg-[#111111] px-1.5 py-0.5 rounded border border-[#1a1a1a]">log4j-core@2.14.1</code> — a logging library buried deep in the transitive dependency tree of millions of Java applications — became the most critical security incident in a decade. The majority of affected teams didn't even know they were using log4j.
            </p>
            <p>
              US Executive Order 14028 (May 2021) and the EU Cyber Resilience Act (2024) now legally require software vendors selling to government and enterprise to provide a complete Software Bill of Materials — a full inventory of every component in their product. Most teams have no way to generate one.
            </p>
            <p className="text-white font-medium">Deptic solves this.</p>
          </div>
        </section>

        <section className="mb-20">
          <h2 className="font-syne text-[32px] font-bold text-[#ffffff] mb-8 pb-4 border-b border-[#1a1a1a]">What Deptic does</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-[10px] p-[28px]">
              <h3 className="text-[#ffffff] text-[18px] font-bold mb-3">Complete dependency visibility</h3>
              <p className="text-[#888888] text-[16px] leading-[1.85]">
                Deptic scans any GitHub repository and resolves the full dependency tree — direct and transitive — across npm, pip, Maven, Go, Rust, Ruby, PHP, and .NET. A scan of <code className="font-mono text-[#ffffff] bg-[#111111] px-1 py-0.5 rounded border border-[#1a1a1a] text-[13px]">spring-projects/spring-petclinic</code> returns 63 components. <code className="font-mono text-[#ffffff] bg-[#111111] px-1 py-0.5 rounded border border-[#1a1a1a] text-[13px]">facebook/react</code> returns 845. <code className="font-mono text-[#ffffff] bg-[#111111] px-1 py-0.5 rounded border border-[#1a1a1a] text-[13px]">gin-gonic/gin</code> returns 35. Every package, every version, every license.
              </p>
            </div>
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-[10px] p-[28px]">
              <h3 className="text-[#ffffff] text-[18px] font-bold mb-3">Real vulnerability detection</h3>
              <p className="text-[#888888] text-[16px] leading-[1.85]">
                Every component is matched against OSV.dev and NVD — two authoritative CVE databases. Deptic doesn't use fuzzy name matching. It uses Package URLs (PURLs) for precise identification. CVEs are returned with severity scores, affected version ranges, and the exact version you need to upgrade to.
              </p>
            </div>
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-[10px] p-[28px]">
              <h3 className="text-[#ffffff] text-[18px] font-bold mb-3">Government-grade compliance</h3>
              <p className="text-[#888888] text-[16px] leading-[1.85]">
                Deptic automatically checks all 7 NTIA minimum elements defined in EO14028: supplier name, component name, version, unique identifiers, dependency relationships, SBOM author, and timestamp. It exports machine-readable SBOMs in CycloneDX 1.5 and SPDX 2.3 formats — both accepted by US federal agencies.
              </p>
            </div>
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-[10px] p-[28px]">
              <h3 className="text-[#ffffff] text-[18px] font-bold mb-3">Automated remediation</h3>
              <p className="text-[#888888] text-[16px] leading-[1.85]">
                When a vulnerability is found, Deptic doesn't just report it — it fixes it. The Fix with PR feature queries OSV for the complete affected version history, finds the latest release with zero known CVEs, and opens a GitHub Pull Request with the exact version bump needed. One click. Every CVE patched.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-20">
          <h2 className="font-syne text-[32px] font-bold text-[#ffffff] mb-8 pb-4 border-b border-[#1a1a1a]">Who built Deptic</h2>
          <div className="text-[#888888] text-[16px] leading-[1.85] space-y-6">
            <p>
              Deptic was built by Balasanjeev C, a computer science engineering student at Nandha Engnerring Collge, TamilNadu, India. What started as a final year capstone project grew into a production-grade platform after months of real engineering work — building Go scanners that call Maven Central, writing CVE resolution algorithms that cross-reference OSV.dev, and designing a UI that makes complex security data readable to non-security engineers.
            </p>
            <p>
              The name Deptic comes from dependency + diagnostic — the core of what the product does.
            </p>
            <p>
              Deptic is built on a modern stack: Go + Fiber for the backend API, Next.js 14 for the frontend, PostgreSQL via Supabase for persistence, Redis via Upstash for caching, and iDrive E2 (S3-compatible) for SBOM file storage. The scanner architecture supports all 8 major package ecosystems with transitive dependency resolution and PURL-based CVE matching.
            </p>
          </div>
        </section>

        <section className="mb-20">
          <h2 className="font-syne text-[32px] font-bold text-[#ffffff] mb-8 pb-4 border-b border-[#1a1a1a]">Why this matters now</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div>
              <div className="font-syne text-[48px] text-[#ffffff] font-bold leading-none mb-3">EO 14028</div>
              <div className="text-[#888888] text-[14px] leading-relaxed">US federal mandate requiring SBOMs for all government software vendors (2021)</div>
            </div>
            <div>
              <div className="font-syne text-[48px] text-[#ffffff] font-bold leading-none mb-3">EU CRA</div>
              <div className="text-[#888888] text-[14px] leading-relaxed">EU Cyber Resilience Act requiring SBOMs for all software sold in the EU (2024)</div>
            </div>
            <div>
              <div className="font-syne text-[48px] text-[#ffffff] font-bold leading-none mb-3">1 in 5</div>
              <div className="text-[#888888] text-[14px] leading-relaxed">npm packages have at least one known vulnerability in their transitive tree</div>
            </div>
          </div>
          <div className="text-[#888888] text-[16px] leading-[1.85] space-y-6">
            <p>
              The regulatory window is closing. US federal agencies have begun requiring CycloneDX or SPDX SBOMs as part of procurement. The EU CRA enforcement began in 2024. Companies that cannot produce a signed, compliant SBOM on demand are losing contracts.
            </p>
            <p>
              Deptic makes compliance the default — not an afterthought.
            </p>
          </div>
        </section>

        <section className="mb-20">
          <h2 className="font-syne text-[32px] font-bold text-[#ffffff] mb-8 pb-4 border-b border-[#1a1a1a]">How it's built</h2>
          <div className="flex flex-wrap gap-3 mb-8">
            {[
              "Go 1.22 + Fiber", "Next.js 14", "PostgreSQL (Supabase)", 
              "Redis (Upstash)", "iDrive E2 (S3)", "OSV.dev API", 
              "GitHub OAuth", "CycloneDX 1.5", "SPDX 2.3", "Web Push (VAPID)"
            ].map((tech) => (
              <div key={tech} className="bg-[#111111] border border-[#1a1a1a] rounded-[8px] px-[18px] py-[10px] text-[#ffffff] text-[14px] font-medium">
                {tech}
              </div>
            ))}
          </div>
          <div className="text-[#888888] text-[16px] leading-[1.85]">
            <p>
              The scanner core is written in Go for performance — resolving 1,000+ transitive npm dependencies takes under 30 seconds using a semaphore-controlled goroutine pool with Redis caching. The CVE matching engine sends batched parallel queries to OSV.dev, caching results by package+version with a 24-hour TTL. Every SBOM file is SHA-256 signed before being stored in object storage with pre-signed URLs that expire in 1 hour.
            </p>
          </div>
        </section>

        <section className="mb-20">
          <h2 className="font-syne text-[32px] font-bold text-[#ffffff] mb-8 pb-4 border-b border-[#1a1a1a]">Get in touch</h2>
          <ContactCards />
        </section>

      </main>

      <Footer />
    </div>
  );
}
