"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Scale, AlertCircle, FileText } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0a0c10] text-[#f0f2f8] font-sans selection:bg-[#22c55e]/30 selection:text-[#22c55e]">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-[100] px-6 md:px-12 py-6 flex items-center justify-between border-b border-[#1e2230] bg-[#0a0c10]/90 backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-3 font-syne font-bold text-xl text-white group">
          <div className="lp-logo-icon group-hover:scale-110 transition-transform">
            <svg width="18" height="18" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-black">
              <path d="M60 30L90 60" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M90 60L60 90" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M60 90L30 60" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M30 60L60 30" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
              <g transform="translate(48, 18)"><path d="M12 2L22 7L12 12L2 7L12 2Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="8" strokeLinejoin="round" /><path d="M22 7V17L12 22V12L22 7Z" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="8" strokeLinejoin="round" /><path d="M2 7V17L12 22V12L2 7Z" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="8" strokeLinejoin="round" /></g>
              <g transform="translate(78, 48)"><path d="M12 2L22 7L12 12L2 7L12 2Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="8" strokeLinejoin="round" /><path d="M22 7V17L12 22V12L22 7Z" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="8" strokeLinejoin="round" /><path d="M2 7V17L12 22V12L2 7Z" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="8" strokeLinejoin="round" /></g>
              <g transform="translate(48, 78)"><path d="M12 2L22 7L12 12L2 7L12 2Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="8" strokeLinejoin="round" /><path d="M22 7V17L12 22V12L22 7Z" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="8" strokeLinejoin="round" /><path d="M2 7V17L12 22V12L2 7Z" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="8" strokeLinejoin="round" /></g>
              <g transform="translate(18, 48)"><path d="M12 2L22 7L12 12L2 7L12 2Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="8" strokeLinejoin="round" /><path d="M22 7V17L12 22V12L22 7Z" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="8" strokeLinejoin="round" /><path d="M2 7V17L12 22V12L2 7Z" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="8" strokeLinejoin="round" /></g>
            </svg>
          </div>
          SBOM.io
        </Link>
        <Link href="/" className="text-sm font-medium text-[#8b91a8] hover:text-white transition-colors flex items-center gap-2">
          <ArrowLeft size={16} /> Back to home
        </Link>
      </nav>

      <main className="pt-32 pb-20 px-6 max-w-3xl mx-auto">
        <header className="mb-16">
          <div className="text-[#f97316] text-xs font-bold uppercase tracking-[0.2em] mb-4">Legal Framework</div>
          <h1 className="font-syne text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-6">Terms of Service</h1>
          <p className="text-[#8b91a8] font-light">Last Updated: May 10, 2026</p>
        </header>

        <article className="prose prose-invert max-w-none space-y-12">
          <section>
            <h2 className="text-xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
            <p className="text-[#8b91a8] font-light leading-relaxed">
              By accessing SBOM.io, you agree to be bound by these terms. If you are using the service on behalf of an organization, you agree to these terms for that organization.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">2. Usage Rights</h2>
            <p className="text-[#8b91a8] font-light leading-relaxed">
              You are granted a non-exclusive right to use the platform to generate SBOM reports and scan for vulnerabilities. You may not use the service for illegal activities or to intentionally bypass security measures.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">3. Limitation of Liability</h2>
            <p className="text-[#8b91a8] font-light leading-relaxed">
              SBOM.io provides reports based on public vulnerability databases. While we strive for 100% accuracy, we do not guarantee that our reports are free of errors or omissions. The service is provided "as is".
            </p>
          </section>

          <section className="bg-[#0f1117] border border-[#1e2230] rounded-xl p-8">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <AlertCircle className="text-[#f97316]" size={20} /> Fair Use
            </h3>
            <p className="text-sm text-[#8b91a8] font-light leading-relaxed">
              Automated scraping or excessive API requests that degrade the service for others may result in temporary or permanent suspension of your account.
            </p>
          </section>
        </article>
      </main>
    </div>
  );
}
