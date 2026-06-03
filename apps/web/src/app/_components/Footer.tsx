"use client";

import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-[#0a0a0a] text-white pt-24 pb-8 px-6 md:px-12 border-t border-white/5 mt-12">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col lg:flex-row justify-between items-start mb-32">
          {/* Tagline */}
          <div className="mb-12 lg:mb-0">
            <h3 className="text-2xl font-medium tracking-tight">Secure your software</h3>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 md:grid-cols-2 gap-x-24 gap-y-4">
            <div className="flex flex-col gap-3">
              <Link href="#" className="text-sm font-medium hover:opacity-70 transition-opacity">Download</Link>
              <Link href="#features" className="text-sm font-medium hover:opacity-70 transition-opacity">Features</Link>
              <Link href="/docs" className="text-sm font-medium hover:opacity-70 transition-opacity">Docs</Link>
              <Link href="/changelog" className="text-sm font-medium hover:opacity-70 transition-opacity">Changelog</Link>
            </div>
            <div className="flex flex-col gap-3">
              <Link href="/blog" className="text-sm font-medium hover:opacity-70 transition-opacity">Blog</Link>
              <Link href="#pricing" className="text-sm font-medium hover:opacity-70 transition-opacity">Pricing</Link>
              <Link href="/use-cases" className="text-sm font-medium hover:opacity-70 transition-opacity">Use Cases</Link>
            </div>
          </div>
        </div>

        {/* Giant Logo */}
        <div className="w-full flex justify-center items-center mb-24">
          <h1 className="text-[15vw] leading-none font-bold tracking-tighter text-white">
            Deptic
          </h1>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-xs font-medium text-white/60">
          <div className="font-bold text-white text-sm">
            Deptic
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link href="/about" className="hover:text-white transition-colors">About Deptic</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
