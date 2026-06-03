"use client";

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Search } from 'lucide-react';
import { DashboardMock } from './DashboardMock';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRouter } from 'next/navigation';

function HeroSearchForm() {
  const [url, setUrl] = useState('');
  const router = useRouter();
  return (
    <form 
      onSubmit={(e) => {
        e.preventDefault();
        if (url.trim()) {
          router.push(`/login?next=${encodeURIComponent(`/dashboard/projects/new?url=${encodeURIComponent(url.trim())}`)}`);
        }
      }} 
      className="flex w-full max-w-md mx-auto relative mt-2"
    >
      <input
        type="url"
        placeholder="Enter repository url to scan"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="w-full bg-[#111] border border-white/10 rounded-full pl-6 pr-24 py-3.5 text-white focus:outline-none focus:border-white/30 text-[15px]"
        required
      />
      <button
        type="submit"
        className="absolute right-1 top-1 bottom-1 bg-white text-black px-6 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors"
      >
        Scan
      </button>
    </form>
  );
}

export function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Card 2 starts rising immediately from the very beginning of scroll
  // and reaches the top by 55% scroll — always visible, no blank gap
  const card2Y = useTransform(scrollYProgress, [0, 0.55], ["100vh", "0vh"]);

  // Card 1 text only fades AFTER card 2 is already covering the bottom
  // It fades between 35%-55% scroll — by which time card2 is already covering the text area
  const card1Opacity = useTransform(scrollYProgress, [0.3, 0.52], [1, 0]);
  const card1Scale   = useTransform(scrollYProgress, [0.2, 0.55], [1, 0.9]);
  const card1Y       = useTransform(scrollYProgress, [0.2, 0.55], [0, -24]);

  return (
    <section className="relative w-full">

      {/* ── DESKTOP: Stacked Sticky Cards ── */}
      <div
        ref={containerRef}
        className="hidden lg:block relative h-[280vh]"
      >
        {/* CARD 1 — Hero Text (lower z, fades when covered) */}
        <div className="sticky top-0 h-screen flex items-center justify-center" style={{ zIndex: 10 }}>
          <motion.div
            style={{ scale: card1Scale, opacity: card1Opacity, y: card1Y }}
            className="flex flex-col items-center text-center px-6 max-w-5xl mx-auto"
          >
            <h1 className="text-white text-5xl lg:text-6xl xl:text-7xl leading-[1.12] font-medium tracking-tight max-w-[900px] mx-auto mb-6">
              SBOM Intelligence for Modern Engineering Teams
            </h1>
            <p className="text-white/60 text-lg md:text-[21px] max-w-2xl mx-auto mb-10">
              Gain complete visibility into dependencies, vulnerabilities, and compliance risks.
            </p>
            <HeroSearchForm />
          </motion.div>
        </div>

        {/* CARD 2 — Dashboard (higher z, slides up as full-screen panel) */}
        <div
          className="sticky top-0 h-screen overflow-hidden"
          style={{ zIndex: 20, pointerEvents: "none" }}
        >
          <motion.div
            style={{ y: card2Y }}
            className="absolute inset-0"
            // Full-screen black background slides up, covering Card 1 completely
          >
            {/* Solid black fill behind card — hides text below */}
            <div className="absolute inset-0 bg-[#0a0a0a]" />

            {/* Dashboard card anchored to the bottom of this panel */}
            <div
              className="absolute bottom-0 left-0 right-0 flex justify-center px-8"
              style={{ pointerEvents: "auto" }}
            >
              <div className="w-full max-w-4xl">
                <div className="relative rounded-t-2xl border border-white/10 border-b-0 bg-[#0d0d0d] overflow-hidden">
                  {/* Browser chrome */}
                  <div className="h-11 border-b border-white/5 flex items-center px-5 gap-2 bg-[#141414]">
                    <div className="w-3 h-3 rounded-full bg-white/10" />
                    <div className="w-3 h-3 rounded-full bg-white/10" />
                    <div className="w-3 h-3 rounded-full bg-white/10" />
                  </div>
                  <div className="p-8">
                    <DashboardMock />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── MOBILE: Normal static layout, no scroll effect ── */}
      <div className="lg:hidden w-full pt-32 pb-16 flex flex-col items-center text-center px-6">
        <h1 className="text-white text-4xl leading-[1.15] font-medium tracking-tight max-w-[700px] mx-auto mb-6">
          SBOM Intelligence for Modern Engineering Teams
        </h1>
        <p className="text-white/60 text-lg max-w-xl mx-auto mb-10">
          Gain complete visibility into dependencies, vulnerabilities, and compliance risks.
        </p>
        <div className="mb-16 w-full">
          <HeroSearchForm />
        </div>

        <div className="w-full rounded-t-2xl border border-white/10 border-b-0 bg-[#0d0d0d] overflow-hidden">
          <div className="h-10 border-b border-white/5 flex items-center px-4 gap-2 bg-[#141414]">
            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
          </div>
          <div className="p-4">
            <DashboardMock />
          </div>
        </div>
      </div>

    </section>
  );
}
