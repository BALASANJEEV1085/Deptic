"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Lock, EyeOff, ShieldCheck } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--lp-bg)] text-[var(--lp-text)] font-sans selection:bg-[var(--lp-green)]/30 selection:text-[var(--lp-green)]">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-[100] px-6 md:px-12 py-6 flex items-center justify-between border-b border-[var(--lp-border)] bg-[var(--lp-bg)]/90 backdrop-blur-xl">
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
        <Link href="/" className="text-sm font-medium text-[var(--lp-text2)] hover:text-white transition-colors flex items-center gap-2">
          <ArrowLeft size={16} /> Back to home
        </Link>
      </nav>

      <main className="pt-32 pb-20 px-6 max-w-3xl mx-auto">
        <header className="mb-16">
          <div className="text-[#3b82f6] text-xs font-bold uppercase tracking-[0.2em] mb-4">Security First</div>
          <h1 className="font-syne text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-6">Privacy Policy</h1>
          <p className="text-[var(--lp-text2)] font-light">Last Updated: May 10, 2026</p>
        </header>

        <article className="prose prose-invert max-w-none space-y-12">
          <section>
            <h2 className="text-xl font-bold text-white mb-4">1. Data we collect</h2>
            <p className="text-[var(--lp-text2)] font-light leading-relaxed">
              To provide our services, we collect minimal information:
            </p>
            <ul className="list-disc list-inside mt-4 text-[var(--lp-text2)] font-light space-y-2">
              <li>Authentication data from GitHub (email and username).</li>
              <li>Public repository metadata when you initiate a scan.</li>
              <li>Dependency manifest files required to generate SBOMs.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">2. How we use your data</h2>
            <p className="text-[var(--lp-text2)] font-light leading-relaxed">
              Your source code is never stored on our permanent disks. We analyze manifest files in volatile memory to extract dependency trees and perform vulnerability matching against public databases (NVD, OSV).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">3. Third-party disclosure</h2>
            <p className="text-[var(--lp-text2)] font-light leading-relaxed">
              We do not sell, trade, or otherwise transfer your data to outside parties. Vulnerability scans are performed using local databases or anonymous API calls to security data providers.
            </p>
          </section>

          <section className="bg-[var(--lp-card)] border border-[var(--lp-border)] rounded-xl p-8">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Lock className="text-[#3b82f6]" size={20} /> Data Encryption
            </h3>
            <p className="text-sm text-[var(--lp-text2)] font-light leading-relaxed">
              All data transmitted between your browser and our servers is encrypted using TLS 1.3. Generated SBOMs are stored using AES-256 encryption at rest.
            </p>
          </section>
        </article>
      </main>
    </div>
  );
}
