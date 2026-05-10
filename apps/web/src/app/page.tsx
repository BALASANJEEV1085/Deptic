"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Shield, Lock, Zap, ChevronRight, Package, Layers, ShieldCheck, ShieldAlert, Share2, Globe, ArrowRight, CheckCircle2, FileText, Search, Menu, X, ArrowUpRight, Download } from 'lucide-react'

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll(".lp-reveal").forEach((el) => observer.observe(el));
    window.addEventListener("scroll", handleScroll);
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="bg-[#0a0c10] text-[#f0f2f8] font-sans selection:bg-[#22c55e]/30 selection:text-[#22c55e]">
      {/* NAV */}
      <nav id="nav" className={`fixed top-0 left-0 right-0 z-[100] px-6 md:px-12 py-4 flex items-center justify-between transition-all duration-300 ${scrolled ? 'border-b border-[#1e2230] bg-[#0a0c10]/90 backdrop-blur-xl' : ''}`}>
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

        <div className="hidden lg:flex items-center gap-8">
          <Link href="#how" className="text-sm font-medium text-[#8b91a8] hover:text-white transition-colors">How it works</Link>
          <Link href="#features" className="text-sm font-medium text-[#8b91a8] hover:text-white transition-colors">Features</Link>
          <Link href="#pricing" className="text-sm font-medium text-[#8b91a8] hover:text-white transition-colors">Pricing</Link>
          <Link href="/dashboard" className="text-sm font-medium text-[#8b91a8] hover:text-white transition-colors">Docs</Link>
        </div>

        <div className="hidden lg:flex items-center gap-3">
          <Link href="/login" className="lp-btn-ghost">Sign in</Link>
          <Link href="/login" className="lp-btn-primary group">
            Get started free
            <ArrowRight className="inline-block ml-1.5 h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <button className="lg:hidden p-2 text-[#8b91a8]" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </nav>

      {/* MOBILE MENU */}
      <div className={`fixed inset-0 z-[99] bg-[#0a0c10] pt-24 px-6 flex flex-col gap-2 transition-transform duration-500 lg:hidden ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <Link href="#how" onClick={() => setMobileMenuOpen(false)} className="py-4 border-b border-[#1e2230] text-lg font-medium text-[#8b91a8]">How it works</Link>
        <Link href="#features" onClick={() => setMobileMenuOpen(false)} className="py-4 border-b border-[#1e2230] text-lg font-medium text-[#8b91a8]">Features</Link>
        <Link href="#pricing" onClick={() => setMobileMenuOpen(false)} className="py-4 border-b border-[#1e2230] text-lg font-medium text-[#8b91a8]">Pricing</Link>
        <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="py-4 border-b border-[#1e2230] text-lg font-medium text-[#8b91a8]">Docs</Link>
        <div className="mt-8 flex flex-col gap-4">
          <Link href="/login" className="lp-btn-ghost text-center py-3 text-base">Sign in</Link>
          <Link href="/login" className="lp-btn-primary text-center py-3 text-base">Get started free</Link>
        </div>
      </div>

      {/* HERO */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-32 pb-20 overflow-hidden">
        <div className="lp-grid-bg"></div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#22c55e]/30 bg-[#22c55e]/5 text-[#22c55e] text-xs font-semibold mb-8 lp-animate-fade-up">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse"></span>
            Now with EU Cyber Resilience Act compliance
          </div>
          <h1 className="font-syne text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6 max-w-[900px] mx-auto lp-animate-fade-up [animation-delay:100ms]">
            Know exactly what's <br className="hidden md:block" /> inside your <em className="not-italic text-[#22c55e]">software</em>
          </h1>
          <p className="text-[#8b91a8] text-base md:text-lg max-w-[600px] mx-auto mb-10 font-light lp-animate-fade-up [animation-delay:200ms]">
            Automatically generate SBOMs, detect vulnerabilities, and prove compliance — for every repo, every release, every time.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 lp-animate-fade-up [animation-delay:300ms]">
            <Link href="/login" className="lp-btn-primary px-8 py-4 text-base rounded-xl">
              Start scanning free <ArrowRight className="inline-block ml-2 h-4 w-4" />
            </Link>
            <Link href="#how" className="px-8 py-4 border border-[#252836] rounded-xl text-base font-medium text-[#8b91a8] hover:text-white transition-colors">
              See how it works
            </Link>
          </div>

          <div className="mt-20 flex flex-wrap justify-center gap-12 lp-animate-fade-up [animation-delay:400ms]">
            <div className="text-center">
              <div className="lp-stat-num text-white">1,200+</div>
              <div className="text-xs font-medium text-[#4a5068] uppercase tracking-widest mt-1">Components per scan</div>
            </div>
            <div className="text-center">
              <div className="lp-stat-num text-white">3</div>
              <div className="text-xs font-medium text-[#4a5068] uppercase tracking-widest mt-1">Ecosystems</div>
            </div>
            <div className="text-center">
              <div className="lp-stat-num text-white">100%</div>
              <div className="text-xs font-medium text-[#4a5068] uppercase tracking-widest mt-1">Free to start</div>
            </div>
          </div>
        </div>
      </section>

      {/* DASHBOARD PREVIEW */}
      <section className="px-6 pb-32">
        <div className="max-w-[1100px] mx-auto relative group">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-full max-w-[800px] h-[400px] bg-[#22c55e]/10 blur-[120px] pointer-events-none rounded-full"></div>
          <div className="relative z-10 bg-[#0f1117] border border-[#1e2230] rounded-2xl overflow-hidden shadow-2xl shadow-black/50 group-hover:border-[#22c55e]/20 transition-colors duration-500">
            <div className="bg-[#0a0c10] px-4 py-3 border-b border-[#1e2230] flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e]"></div>
              </div>
              <div className="ml-4 px-3 py-1 bg-[#0f1117] border border-[#1e2230] rounded text-[10px] font-mono text-[#4a5068]">
                app.sbom.io/dashboard
              </div>
            </div>
            <div className="p-4 md:p-8">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Total Components', val: '6,890', sub: 'across 24 scans', color: 'text-white' },
                  { label: 'Critical CVEs', val: '47', sub: '814 total vulns', color: 'text-[#ef4444]' },
                  { label: 'NTIA Compliant', val: '10/17', sub: '59% rate', color: 'text-[#22c55e]' },
                  { label: 'Clean Projects', val: '23', sub: 'of 26 total', color: 'text-white' },
                ].map((stat, i) => (
                  <div key={i} className="bg-[#0a0c10] border border-[#1e2230] rounded-xl p-4">
                    <div className="text-[10px] font-bold text-[#4a5068] uppercase tracking-wider mb-2">{stat.label}</div>
                    <div className={`text-2xl font-syne font-bold ${stat.color}`}>{stat.val}</div>
                    <div className="text-[10px] text-[#4a5068] mt-1">{stat.sub}</div>
                  </div>
                ))}
              </div>
              <div className="bg-[#0a0c10] border border-[#1e2230] rounded-xl overflow-hidden">
                <div className="grid grid-cols-4 md:grid-cols-5 p-3 border-b border-[#1e2230] text-[10px] font-bold text-[#4a5068] uppercase tracking-widest bg-[#0a0c10]/50">
                  <span className="col-span-1 md:col-span-2">Package</span>
                  <span>Version</span>
                  <span className="hidden md:block">License</span>
                  <span className="text-right">Severity</span>
                </div>
                {[
                  { name: 'org.postgresql:postgresql', ver: '42.7.7', lic: 'BSD-2', sev: 'HIGH', color: 'text-[#f97316]' },
                  { name: 'spring-boot-actuator', ver: '3.5.3', lic: 'Apache 2.0', sev: 'HIGH', color: 'text-[#f97316]' },
                  { name: '@babel/code-frame', ver: '7.8.3', lic: 'MIT', sev: 'LOW', color: 'text-[#22c55e]' },
                ].map((row, i) => (
                  <div key={i} className="grid grid-cols-4 md:grid-cols-5 p-3 items-center border-b border-[#1e2230] last:border-0 hover:bg-white/[0.02] transition-colors">
                    <span className="col-span-1 md:col-span-2 font-mono text-xs text-[#8b91a8] truncate">{row.name}</span>
                    <span className="font-mono text-xs text-[#4a5068]">{row.ver}</span>
                    <span className="hidden md:block font-mono text-[11px] text-[#4a5068]">{row.lic}</span>
                    <div className="text-right">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${row.sev === 'HIGH' ? 'bg-[#f97316]/10 text-[#f97316]' : 'bg-[#22c55e]/10 text-[#22c55e]'}`}>
                        {row.sev}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CVE TICKER */}
      <div className="py-12 overflow-hidden bg-[#0a0c10]">
        <div className="text-center text-[10px] font-bold text-[#4a5068] uppercase tracking-[0.2em] mb-8">Live vulnerability detections</div>
        <div className="lp-ticker-track">
          {[1, 2].map((group) => (
            <React.Fragment key={group}>
              <div className="flex items-center gap-3 px-3 py-2 bg-[#0f1117] border border-[#1e2230] rounded-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-[#ef4444]"></div>
                <span className="font-mono text-xs text-[#8b91a8]">CVE-2026-42198</span>
                <span className="text-xs text-[#4a5068]">org.postgresql@42.7.7</span>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 bg-[#0f1117] border border-[#1e2230] rounded-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-[#ef4444]"></div>
                <span className="font-mono text-xs text-[#8b91a8]">CVE-2021-44228</span>
                <span className="text-xs text-[#4a5068]">log4j-core@2.14.1</span>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 bg-[#0f1117] border border-[#1e2230] rounded-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-[#f97316]"></div>
                <span className="font-mono text-xs text-[#8b91a8]">CVE-2026-22731</span>
                <span className="text-xs text-[#4a5068]">spring-boot@3.5.3</span>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 bg-[#0f1117] border border-[#1e2230] rounded-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-[#ef4444]"></div>
                <span className="font-mono text-xs text-[#8b91a8]">CVE-2022-22965</span>
                <span className="text-xs text-[#4a5068]">spring-web@5.3.18</span>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 bg-[#0f1117] border border-[#1e2230] rounded-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-[#f97316]"></div>
                <span className="font-mono text-xs text-[#8b91a8]">CVE-2021-3749</span>
                <span className="text-xs text-[#4a5068]">axios@0.21.1</span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section id="how" className="lp-reveal py-32 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <div className="text-[#22c55e] text-xs font-bold uppercase tracking-[0.2em] mb-4">How it works</div>
          <h2 className="font-syne text-4xl md:text-5xl font-bold tracking-tight text-white mb-6">From repo URL to compliance report in minutes</h2>
          <p className="text-[#8b91a8] text-lg max-w-[500px] mx-auto font-light">No installation. No agents. Paste a GitHub URL and SBOM.io does the rest.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { id: '01', icon: <Search className="text-[#22c55e]" />, title: 'Connect your repo', desc: 'Sign in with GitHub and paste any repository URL. SBOM.io fetches your dependency manifests automatically — no config needed.' },
            { id: '02', icon: <Package className="text-[#22c55e]" />, title: 'Scan all dependencies', desc: 'Our engine resolves every package — direct and transitive — across npm, pip, and Maven. Most apps have 10× more dependencies than developers expect.' },
            { id: '03', icon: <FileText className="text-[#22c55e]" />, title: 'Export & share SBOM', desc: 'Download a signed CycloneDX 1.5 or SPDX 2.3 file. Share a secure link with auditors — no login required on their end.' },
          ].map((step, i) => (
            <div key={i} className="group relative bg-[#0f1117] border border-[#1e2230] rounded-2xl p-8 hover:border-[#22c55e]/30 transition-all duration-300">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#22c55e] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="font-mono text-[10px] text-[#22c55e]/60 font-bold mb-6">{step.id} /</div>
              <div className="w-12 h-12 bg-[#22c55e]/10 rounded-xl flex items-center justify-center mb-6">
                {step.icon}
              </div>
              <h3 className="font-syne text-lg font-bold text-white mb-3">{step.title}</h3>
              <p className="text-sm text-[#8b91a8] leading-relaxed font-light">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="lp-reveal py-32 px-6 bg-[#0a0c10]/50">
        <div className="max-w-7xl mx-auto">
          <div className="mb-20">
            <div className="text-[#22c55e] text-xs font-bold uppercase tracking-[0.2em] mb-4">Features</div>
            <h2 className="font-syne text-4xl md:text-5xl font-bold tracking-tight text-white mb-6">Everything compliance needs. <br className="hidden md:block" /> Nothing it doesn't.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: <ShieldAlert className="text-[#ef4444]" />, title: 'Real-time CVE detection', desc: 'Every component checked against NVD and OSV.dev. Critical vulnerabilities flagged with severity scores.', tag: 'CRITICAL / HIGH / MEDIUM', tagColor: 'bg-[#ef4444]/10 text-[#ef4444]' },
              { icon: <ShieldCheck className="text-[#22c55e]" />, title: 'NTIA & EU CRA compliance', desc: 'Verify all 7 NTIA minimum elements automatically. Check EU Cyber Resilience Act requirements.', tag: 'EO 14028 · EU CRA · NTIA', tagColor: 'bg-[#22c55e]/10 text-[#22c55e]' },
              { icon: <Download className="text-[#f97316]" />, title: 'CycloneDX & SPDX export', desc: 'One click to download government-compliant SBOM files. SHA-256 signed and verified.', tag: 'CycloneDX 1.5 · SPDX 2.3', tagColor: 'bg-[#f97316]/10 text-[#f97316]' },
              { icon: <Share2 className="text-[#8b5cf6]" />, title: 'Vendor sharing portal', desc: 'Generate a secure, expiring link to your SBOM report. Clients see the full view without an account.', tag: 'Public/Secure Share Links', tagColor: 'bg-[#8b5cf6]/10 text-[#8b5cf6]' },
              { icon: <Zap className="text-[#22c55e]" />, title: 'GitHub Actions CI/CD', desc: 'Add SBOM.io to any pipeline in 3 lines. Automatically scan on every push and block critical CVEs.', tag: 'Blocks critical CVEs in CI/CD', tagColor: 'bg-[#22c55e]/10 text-[#22c55e]' },
              { icon: <Layers className="text-[#eab308]" />, title: 'npm · pip · Maven', desc: 'Resolves full transitive dependency trees across JavaScript, Python, and Java ecosystems.', tag: '3 ecosystems · auto-detected', tagColor: 'bg-[#eab308]/10 text-[#eab308]' },
            ].map((feat, i) => (
              <div key={i} className="bg-[#0f1117] border border-[#1e2230] rounded-2xl p-8 hover:border-[#252836] transition-colors">
                <div className="w-10 h-10 bg-white/[0.03] rounded-lg flex items-center justify-center mb-6">
                  {React.cloneElement(feat.icon as React.ReactElement, { size: 20 })}
                </div>
                <h3 className="font-syne text-lg font-bold text-white mb-3">{feat.title}</h3>
                <p className="text-sm text-[#8b91a8] leading-relaxed font-light mb-6">{feat.desc}</p>
                <span className={`inline-block px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${feat.tagColor}`}>{feat.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPLIANCE */}
      <section className="lp-reveal py-32 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div>
            <div className="text-[#22c55e] text-xs font-bold uppercase tracking-[0.2em] mb-4">Compliance</div>
            <h2 className="font-syne text-4xl md:text-5xl font-bold tracking-tight text-white mb-6">NTIA compliant <br /> in one scan</h2>
            <p className="text-[#8b91a8] text-lg font-light leading-relaxed mb-10">
              The US government and EU regulators require SBOMs for all software sales. SBOM.io checks all 7 NTIA minimum elements automatically.
            </p>
            <div className="space-y-6">
              {[
                { icon: <Shield className="text-[#22c55e]" />, title: 'US Executive Order 14028', desc: 'Federal agencies require SBOMs from all software vendors. We generate fully compliant documents.' },
                { icon: <Globe className="text-[#3b82f6]" />, title: 'EU Cyber Resilience Act', desc: 'The EU CRA mandates SBOMs for all software sold in the EU. We check CRA-specific requirements.' },
              ].map((p, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-10 h-10 bg-white/[0.03] rounded-lg flex items-center justify-center shrink-0 mt-1">
                    {React.cloneElement(p.icon as React.ReactElement, { size: 18 })}
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-1">{p.title}</h4>
                    <p className="text-sm text-[#8b91a8] font-light">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-[#0f1117] border border-[#1e2230] rounded-3xl p-8 md:p-12">
            <div className="text-center mb-10">
              <div className="text-[64px] font-syne font-extrabold text-[#22c55e] leading-none mb-2">100</div>
              <div className="text-xs font-bold text-[#4a5068] uppercase tracking-widest">NTIA Compliance Score</div>
            </div>
            <div className="space-y-4">
              {['Supplier name', 'Component name', 'Version string', 'Unique identifiers (PURL)', 'Dependency relationships', 'SBOM author', 'Timestamp'].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-[#1e2230] last:border-0">
                  <span className="text-sm text-[#8b91a8]">{item}</span>
                  <span className="flex items-center gap-1.5 text-xs font-bold text-[#22c55e] uppercase tracking-wider">
                    <CheckCircle2 size={14} /> PASS · 100%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="lp-reveal py-32 px-6 bg-[#0a0c10]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <div className="text-[#22c55e] text-xs font-bold uppercase tracking-[0.2em] mb-4">Pricing</div>
            <h2 className="font-syne text-4xl md:text-5xl font-bold tracking-tight text-white mb-6">Start free. Scale when ready.</h2>
            <p className="text-[#8b91a8] text-lg font-light">No credit card required. Free tier includes full scanning for personal projects.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#0f1117] border border-[#1e2230] rounded-2xl p-8 flex flex-col hover:border-[#252836] transition-colors">
              <div className="text-[10px] font-bold text-[#4a5068] uppercase tracking-[0.2em] mb-6">Starter</div>
              <div className="text-4xl font-syne font-extrabold text-white mb-2">$0</div>
              <div className="text-xs text-[#4a5068] mb-6">Free forever</div>
              <p className="text-sm text-[#8b91a8] font-light mb-8 pb-8 border-b border-[#1e2230]">For developers scanning personal and open-source projects.</p>
              <div className="space-y-3 mb-10 flex-1">
                {['5 scans per month', 'npm + pip + Maven', 'CVE vulnerability scan', 'CycloneDX export'].map((f, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs text-[#8b91a8]">
                    <CheckCircle2 size={14} className="text-[#22c55e]" /> {f}
                  </div>
                ))}
                {['PDF reports', 'Vendor sharing portal', 'CI/CD integration'].map((f, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs text-[#4a5068]">
                    <X size={14} /> {f}
                  </div>
                ))}
              </div>
              <Link href="/login" className="lp-btn-ghost text-center py-3">Get started free</Link>
            </div>

            <div className="bg-[#0f1117] border-2 border-[#22c55e] rounded-2xl p-8 flex flex-col relative scale-105 shadow-2xl shadow-[#22c55e]/5">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#22c55e] text-black text-[10px] font-bold uppercase tracking-widest rounded-full">Most popular</div>
              <div className="text-[10px] font-bold text-[#4a5068] uppercase tracking-[0.2em] mb-6">Pro</div>
              <div className="text-4xl font-syne font-extrabold text-white mb-2">$49</div>
              <div className="text-xs text-[#4a5068] mb-6">per month</div>
              <p className="text-sm text-[#8b91a8] font-light mb-8 pb-8 border-b border-[#1e2230]">For teams shipping software to enterprise or government clients.</p>
              <div className="space-y-3 mb-10 flex-1">
                {['Unlimited scans', 'All 3 ecosystems', 'CVE + NVD monitoring', 'CycloneDX + SPDX export', 'PDF compliance reports', 'Vendor sharing portal', 'GitHub Actions plugin'].map((f, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs text-[#8b91a8]">
                    <CheckCircle2 size={14} className="text-[#22c55e]" /> {f}
                  </div>
                ))}
              </div>
              <Link href="/login" className="lp-btn-primary text-center py-3">Start Pro trial</Link>
            </div>

            <div className="bg-[#0f1117] border border-[#1e2230] rounded-2xl p-8 flex flex-col hover:border-[#252836] transition-colors">
              <div className="text-[10px] font-bold text-[#4a5068] uppercase tracking-[0.2em] mb-6">Enterprise</div>
              <div className="text-3xl font-syne font-extrabold text-white mb-2 pt-2">Custom</div>
              <div className="text-xs text-[#4a5068] mb-6">contact for pricing</div>
              <p className="text-sm text-[#8b91a8] font-light mb-8 pb-8 border-b border-[#1e2230]">For large organisations with complex compliance requirements.</p>
              <div className="space-y-3 mb-10 flex-1">
                {['Everything in Pro', 'SSO / SAML', 'Self-hosted option', 'SLA guarantee', 'Dedicated support', 'Custom integrations', 'Audit log export'].map((f, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs text-[#8b91a8]">
                    <CheckCircle2 size={14} className="text-[#22c55e]" /> {f}
                  </div>
                ))}
              </div>
              <Link href="mailto:hello@sbom.io" className="lp-btn-ghost text-center py-3">Contact sales</Link>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="lp-reveal py-32 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <div className="text-[#22c55e] text-xs font-bold uppercase tracking-[0.2em] mb-4">Testimonials</div>
          <h2 className="font-syne text-4xl md:text-5xl font-bold tracking-tight text-white">Trusted by security teams</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { quote: '"Integrating SBOM.io into our CI/CD pipeline gave us immediate visibility into our software supply chain. Proactive vulnerability alerts are a game-changer."', author: '@security_pro', role: 'Security Engineer', avatar: 'S', avatarColor: 'text-[#22c55e]' },
            { quote: '"We went from manually writing SBOMs in spreadsheets to having them auto-generated on every release. The NTIA checker saved us weeks of audit prep."', author: '@riya_devops', role: 'DevOps Lead', avatar: 'R', avatarColor: 'text-[#3b82f6]' },
            { quote: '"Our government client demanded CycloneDX SBOMs with every delivery. SBOM.io generates them in seconds. Won us the contract."', author: '@arjun_cto', role: 'CTO, GovTech startup', avatar: 'A', avatarColor: 'text-[#f97316]' },
          ].map((t, i) => (
            <div key={i} className="bg-[#0f1117] border border-[#1e2230] rounded-2xl p-8">
              <p className="text-sm text-[#8b91a8] font-light leading-relaxed mb-8 italic">{t.quote}</p>
              <div className="flex items-center gap-4">
                <div className={`w-9 h-9 rounded-full bg-[#0a0c10] border border-[#1e2230] flex items-center justify-center font-syne font-bold text-sm ${t.avatarColor}`}>{t.avatar}</div>
                <div>
                  <div className="text-sm font-bold text-white">{t.author}</div>
                  <div className="text-[11px] text-[#4a5068] font-medium">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="lp-reveal py-32 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-radial-gradient(ellipse 700px 400px at 50% 50%, rgba(34,197,94,0.07) 0%, transparent 70%)"></div>
        <div className="max-w-2xl mx-auto relative z-10">
          <h2 className="font-syne text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">Start knowing what's inside your software</h2>
          <p className="text-[#8b91a8] text-lg font-light mb-10 leading-relaxed">
            Join developers scanning their repos for vulnerabilities and generating compliance-ready SBOMs — free to start, no credit card needed.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login" className="lp-btn-primary px-8 py-4 text-base rounded-xl">
              Scan your first repo free <ArrowUpRight className="inline-block ml-1 h-4 w-4" />
            </Link>
            <Link href="/dashboard" className="px-8 py-4 border border-[#252836] rounded-xl text-base font-medium text-[#8b91a8] hover:text-white transition-colors">
              View docs
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0a0c10]">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-24 mb-20">
            <div className="lg:col-span-1">
              <Link href="/" className="flex items-center gap-3 font-syne font-bold text-xl text-white mb-6">
                <div className="lp-logo-icon">
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
              <p className="text-sm text-[#4a5068] leading-relaxed font-light max-w-xs">
                Automated SBOM generation, vulnerability detection, and compliance reporting for modern software teams.
              </p>
            </div>
            {[
              { title: 'Product', links: [{ n: 'Features', h: '#features' }, { n: 'Pricing', h: '#pricing' }, { n: 'Changelog', h: '#' }, { n: 'Roadmap', h: '#' }] },
              { title: 'Resources', links: [{ n: 'Documentation', h: '#' }, { n: 'API Reference', h: '#' }, { n: 'GitHub Action', h: '#' }, { n: 'Blog', h: '#' }] },
              { title: 'Company', links: [{ n: 'About', h: '/about' }, { n: 'Privacy', h: '/privacy' }, { n: 'Terms', h: '/terms' }, { n: 'Contact', h: '/contact' }] },
            ].map((col, i) => (
              <div key={i}>
                <div className="text-[10px] font-bold text-white uppercase tracking-[0.2em] mb-6">{col.title}</div>
                <div className="flex flex-col gap-3">
                  {col.links.map((link, j) => (
                    <Link key={j} href={link.h} className="text-sm text-[#4a5068] hover:text-white transition-colors font-light">{link.n}</Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-[13px] text-[#4a5068] font-light">© 2026 SBOM.io. All rights reserved.</div>
            <div className="font-mono text-[11px] text-[#4a5068]">v1.0.0 · Built for compliance</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
