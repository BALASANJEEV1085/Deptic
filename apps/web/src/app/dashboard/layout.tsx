"use client"

import { useState } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WorkspaceProvider } from '@/lib/contexts/workspace-context'
import { PushPrompt } from '@/components/push-prompt'


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <WorkspaceProvider>
      <div className="flex h-screen overflow-hidden" style={{ background: '#090b0f' }}>
        {/* Desktop Sidebar */}
        <div className="hidden md:flex h-full shrink-0" style={{ width: 220 }}>
          <Sidebar />
        </div>

        {/* Mobile overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 md:hidden"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Mobile drawer */}
        <div
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex flex-col md:hidden transition-transform duration-300 ease-in-out',
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          )}
          style={{ width: 220 }}
        >
          <div
            className="flex items-center justify-between px-4 shrink-0"
            style={{
              height: 56,
              borderBottom: '1px solid #16191f',
              background: '#090b0f',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-syne, Syne, sans-serif)',
                fontSize: 16,
                fontWeight: 700,
                color: '#e8ecf4',
              }}
            >
              DEPTIC.io
            </span>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6b7280',
                borderRadius: 4,
                background: '#0e1015',
                border: '1px solid #16191f',
                cursor: 'pointer',
              }}
            >
              <X size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <Sidebar onClose={() => setIsMobileMenuOpen(false)} />
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Mobile header */}
          <header
            className="flex items-center gap-4 px-4 md:hidden shrink-0"
            style={{
              height: 56,
              borderBottom: '1px solid #16191f',
              background: '#090b0f',
            }}
          >
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              style={{
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6b7280',
                borderRadius: 6,
                background: '#0e1015',
                border: '1px solid #16191f',
                cursor: 'pointer',
              }}
            >
              <Menu size={16} />
            </button>
            <span
              style={{
                fontFamily: 'var(--font-syne, Syne, sans-serif)',
                fontSize: 16,
                fontWeight: 700,
                color: '#e8ecf4',
              }}
            >
              DEPTIC.io
            </span>
            <div className="ml-auto">
            </div>
          </header>

          <main className="flex-1 overflow-y-auto relative">

            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 24px 80px' }}>

              {children}
            </div>
          </main>
        </div>
      </div>
      <PushPrompt />
    </WorkspaceProvider>
  )
}
