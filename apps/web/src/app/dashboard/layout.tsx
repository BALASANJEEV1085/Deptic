"use client"

import { useState } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex h-full w-64 shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 transform bg-background transition-transform duration-300 ease-in-out md:hidden flex flex-col",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
             <div className="h-6 w-6 bg-[#22c55e] rounded flex items-center justify-center">
                <span className="text-[10px] font-bold text-black">S</span>
             </div>
             <span className="text-sm font-bold text-white">SBOM.io</span>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center justify-center h-8 w-8 rounded-full bg-white/5 text-zinc-400 hover:text-white transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <Sidebar onClose={() => setIsMobileMenuOpen(false)} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="flex h-16 items-center gap-4 border-b border-white/[0.04] bg-background px-4 md:hidden shrink-0">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex items-center justify-center h-10 w-10 rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-white transition-all active:scale-95"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
             <div className="h-8 w-8 bg-[#22c55e] rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                <span className="text-xs font-bold text-black">S</span>
             </div>
             <span className="text-base font-bold tracking-tight text-white">SBOM.io</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl p-4 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
