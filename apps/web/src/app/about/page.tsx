"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Shield, Zap, Globe, Package, Layers, Search, CheckCircle2 } from "lucide-react";

export default function AboutPage() {
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
              <g transform="translate(48, 78)"><path d="M12 2L22 7L12 12L2 7L12 12L2 7L12 2Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="8" strokeLinejoin="round" /><path d="M22 7V17L12 22V12L22 7Z" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="8" strokeLinejoin="round" /><path d="M2 7V17L12 22V12L2 7Z" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="8" strokeLinejoin="round" /></g>
              <g transform="translate(18, 48)"><path d="M12 2L22 7L12 12L2 7L12 2Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="8" strokeLinejoin="round" /><path d="M22 7V17L12 22V12L22 7Z" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="8" strokeLinejoin="round" /><path d="M2 7V17L12 22V12L2 7Z" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="8" strokeLinejoin="round" /></g>
            </svg>
          </div>
          SBOM.io
        </Link>
        <Link href="/" className="text-sm font-medium text-[#8b91a8] hover:text-white transition-colors flex items-center gap-2">
          <ArrowLeft size={16} /> Back to home
        </Link>
      </nav>

      <main className="pt-32 pb-20 px-6 max-w-4xl mx-auto">
        <header className="mb-20">
          <div className="text-[#22c55e] text-xs font-bold uppercase tracking-[0.2em] mb-4">Our Mission</div>
          <h1 className="font-syne text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-8">Standardizing software transparency.</h1>
          <p className="text-xl text-[#8b91a8] font-light leading-relaxed">
            In an era where software supply chain attacks are increasing by 700% annually, knowing what's inside your code isn't just a best practice—it's a necessity for survival.
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-24">
          <div>
            <h2 className="font-syne text-2xl font-bold text-white mb-4">Who we are</h2>
            <p className="text-[#8b91a8] font-light leading-relaxed mb-6">
              SBOM.io was founded by a group of security engineers and open-source contributors who realized that compliance is the biggest bottleneck in modern software delivery. 
            </p>
            <p className="text-[#8b91a8] font-light leading-relaxed">
              We built this platform to automate the tedious parts of security—generating reports, tracking CVEs, and verifying licenses—so developers can get back to building what matters.
            </p>
          </div>
          <div className="bg-[#0f1117] border border-[#1e2230] rounded-2xl p-8">
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-[#22c55e]/10 rounded-lg flex items-center justify-center shrink-0">
                  <Shield className="text-[#22c55e]" size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-white mb-1">Precision</h4>
                  <p className="text-xs text-[#8b91a8] font-light">Deep-first dependency resolution that leaves no package unmapped.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-[#3b82f6]/10 rounded-lg flex items-center justify-center shrink-0">
                  <Layers className="text-[#3b82f6]" size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-white mb-1">Community First</h4>
                  <p className="text-xs text-[#8b91a8] font-light">Always free for open-source projects and independent researchers.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-[#8b5cf6]/10 rounded-lg flex items-center justify-center shrink-0">
                  <Shield className="text-[#8b5cf6]" size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-white mb-1">Security by Design</h4>
                  <p className="text-xs text-[#8b91a8] font-light">Built on the foundation of CycloneDX and SPDX standards.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-[#1e2230] pt-16">
          <h2 className="font-syne text-3xl font-bold text-white mb-12 text-center">Built for the future of compliance</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl font-syne font-bold text-white mb-2">24/7</div>
              <div className="text-xs text-[#4a5068] uppercase tracking-widest font-bold">CVE Monitoring</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-syne font-bold text-white mb-2">100%</div>
              <div className="text-xs text-[#4a5068] uppercase tracking-widest font-bold">NTIA Compliant</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-syne font-bold text-white mb-2">0</div>
              <div className="text-xs text-[#4a5068] uppercase tracking-widest font-bold">Agents required</div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#1e2230] py-12 px-6">
        <div className="max-w-4xl mx-auto flex justify-between items-center opacity-50">
          <div className="text-xs">© 2026 SBOM.io</div>
          <div className="flex gap-6 text-xs">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
