"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Send, MessageCircle, Globe, Layers, Search } from "lucide-react";

export default function ContactPage() {
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

      <main className="pt-32 pb-20 px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
          <div>
            <header className="mb-12">
              <div className="text-[var(--lp-green)] text-xs font-bold uppercase tracking-[0.2em] mb-4">Connect</div>
              <h1 className="font-syne text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-6">Get in touch</h1>
              <p className="text-[var(--lp-text2)] text-lg font-light leading-relaxed">
                Have questions about compliance or enterprise features? Our security experts are ready to help.
              </p>
            </header>

            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-white/[0.03] border border-[var(--lp-border)] rounded-xl flex items-center justify-center shrink-0">
                  <Send className="text-[var(--lp-green)]" size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-white mb-1">Email</h4>
                  <p className="text-[var(--lp-text2)] font-light">support@sbom.io</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-white/[0.03] border border-[var(--lp-border)] rounded-xl flex items-center justify-center shrink-0">
                  <MessageCircle className="text-[#3b82f6]" size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-white mb-1">Live Chat</h4>
                  <p className="text-[var(--lp-text2)] font-light">Available for Pro and Enterprise users.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-white/[0.03] border border-[var(--lp-border)] rounded-xl flex items-center justify-center shrink-0">
                  <Globe className="text-[#1DA1F2]" size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-white mb-1">Twitter</h4>
                  <p className="text-[var(--lp-text2)] font-light">@sbom_io</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[var(--lp-card)] border border-[var(--lp-border)] rounded-3xl p-8 md:p-12">
            <form className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[var(--lp-text3)] uppercase tracking-widest">First Name</label>
                  <input type="text" className="w-full bg-[var(--lp-bg)] border border-[var(--lp-border)] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[var(--lp-green)]/50 transition-colors" placeholder="John" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[var(--lp-text3)] uppercase tracking-widest">Last Name</label>
                  <input type="text" className="w-full bg-[var(--lp-bg)] border border-[var(--lp-border)] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[var(--lp-green)]/50 transition-colors" placeholder="Doe" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--lp-text3)] uppercase tracking-widest">Work Email</label>
                <input type="email" className="w-full bg-[var(--lp-bg)] border border-[var(--lp-border)] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[var(--lp-green)]/50 transition-colors" placeholder="john@company.com" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--lp-text3)] uppercase tracking-widest">Message</label>
                <textarea className="w-full bg-[var(--lp-bg)] border border-[var(--lp-border)] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[var(--lp-green)]/50 transition-colors min-h-[120px]" placeholder="How can we help?"></textarea>
              </div>
              <button type="submit" className="w-full lp-btn-primary py-4 text-base font-bold rounded-xl shadow-lg shadow-[var(--lp-green)]/10">
                Send Message
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
