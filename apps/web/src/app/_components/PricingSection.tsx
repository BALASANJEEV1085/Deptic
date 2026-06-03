"use client";

import React, { useState } from 'react';
import { Heart, Sparkles, CheckCircle2 } from 'lucide-react';
import { DonationModal } from './DonationModal';

export function PricingSection() {
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  return (
    <section id="pricing" className="py-24 bg-[#0a0a0a] border-t border-white/5 relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-6 relative z-10">
        <div className="text-center mb-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-500 mb-4">
            Pricing
          </p>
          <h2 className="text-white text-3xl md:text-5xl font-bold tracking-tight mb-6">
            Enterprise Security, <br/><span className="text-white">Completely Free</span>
          </h2>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto leading-relaxed">
            We believe software supply chain security shouldn&apos;t be a luxury. DEPTIC is open and free for all developers and teams.
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <div className="rounded-3xl border border-white/10 bg-[#111]/80 backdrop-blur-xl p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Sparkles className="w-3 h-3" />
                FOREVER FREE
              </span>
            </div>

            <h3 className="text-2xl font-bold text-white mb-2">Community Edition</h3>
            <div className="flex items-baseline gap-2 mb-8">
              <span className="text-5xl font-black text-white">$0</span>
              <span className="text-zinc-500 font-medium">/ month</span>
            </div>

            <ul className="space-y-4 mb-10">
              {[
                "5 scans/day",
                "Full dependency tree mapping",
                "Real-time CVE detection",
                "NTIA Compliance Scoring",
                "PDF & CycloneDX exports",
                "All features available for free",
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" />
                  <span className="text-zinc-300 font-medium">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="pt-8 border-t border-white/10 text-center">
              <p className="text-sm text-zinc-400 mb-5">
                Support the development and maintenance of DEPTIC.
              </p>
              <button 
                onClick={() => setIsDonationModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 bg-white hover:bg-zinc-200 text-black px-6 py-3.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                Support DEPTIC with a Donation
              </button>
            </div>
          </div>
        </div>
      </div>
      <DonationModal isOpen={isDonationModalOpen} onClose={() => setIsDonationModalOpen(false)} />
    </section>
  );
}
