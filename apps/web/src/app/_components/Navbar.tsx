'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Menu, X, ChevronDown, Box, ShieldAlert, FileCheck, GitPullRequest, Puzzle } from 'lucide-react';

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <div className="flex-shrink-0">
              <Link href="/" className="text-white font-bold text-2xl tracking-tight">
                Deptic
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center justify-center gap-2 absolute left-1/2 -translate-x-1/2 h-full">
              <Link href="#features" className="px-4 py-1.5 rounded-full text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Features
              </Link>

              <Link href="#api" className="px-4 py-1.5 rounded-full text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                API
              </Link>

              <Link href="#pricing" className="px-4 py-1.5 rounded-full text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Pricing
              </Link>

              <Link href="/docs" className="px-4 py-1.5 rounded-full text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Docs
              </Link>

              <Link href="/blog" className="px-4 py-1.5 rounded-full text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Blog
              </Link>
            </div>

            {/* CTA */}
            <div className="hidden md:flex items-center">
              <Link
                href="/login"
                className="text-sm font-medium bg-[#161616] border border-white/10 text-white px-5 py-2 hover:bg-[#222] transition-colors"
              >
                Get Started | Login
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-white/70 hover:text-white transition-colors p-2"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>

          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 top-16 z-40 bg-[#0a0a0a] overflow-y-auto"
          >
            <div className="flex flex-col px-6 py-8 gap-1">

              {[
                { href: '#features', label: 'Features' },
                { href: '#api', label: 'API' },
                { href: '#pricing', label: 'Pricing' },
                { href: '/docs', label: 'Docs' },
                { href: '/blog', label: 'Blog' },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="text-sm text-white py-3 border-b border-white/5"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {label}
                </Link>
              ))}

              <Link
                href="/login"
                className="mt-6 text-sm font-medium bg-white text-black text-center py-3"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Get Started | Login
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}