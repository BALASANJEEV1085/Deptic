"use client"

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WorkspaceProvider } from '@/lib/contexts/workspace-context'
import { PushPrompt } from '@/components/push-prompt'
import { OnboardingModal } from '@/components/onboarding-modal'
import { createClient } from '@/lib/supabase/client'
import { getOnboardingStatus } from '@/lib/api'


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [defaultName, setDefaultName] = useState('')
  const [onboardingToast, setOnboardingToast] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      setDefaultName(
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        ''
      )

      const localKey = `deptic-onboarding-done-${user.id}`
      if (localStorage.getItem(localKey) === 'true') return

      try {
        const status = await getOnboardingStatus()
        if (
          status.is_new_user &&
          !status.onboarding_completed &&
          !status.onboarding_skipped
        ) {
          setShowOnboarding(true)
        } else {
          localStorage.setItem(localKey, 'true')
        }
      } catch (err) {
        console.error('Onboarding status check failed:', err)
      }
    })
  }, [])

  return (
    <WorkspaceProvider>
      <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex h-full shrink-0" style={{ width: 220 }}>
          <Sidebar />
        </div>

        {/* Mobile overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 md:hidden bg-[var(--overlay)]"
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
          <div className="flex items-center justify-between px-4 shrink-0 h-14 border-b border-[var(--border)] bg-[var(--bg)]">
            <span className="font-syne text-base font-bold text-[var(--text-primary)] tracking-tight">
              DEPTIC.io
            </span>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-center w-7 h-7 rounded text-[var(--text-secondary)] bg-[var(--card)] border border-[var(--border)] cursor-pointer"
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
          <header className="flex items-center gap-4 px-4 md:hidden shrink-0 h-14 border-b border-[var(--border)] bg-[var(--bg)]">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex items-center justify-center w-9 h-9 rounded-md text-[var(--text-secondary)] bg-[var(--card)] border border-[var(--border)] cursor-pointer"
            >
              <Menu size={16} />
            </button>
            <span className="font-syne text-base font-bold text-[var(--text-primary)] tracking-tight">
              DEPTIC.io
            </span>
            <div className="ml-auto" />
          </header>

          <main className="flex-1 overflow-y-auto relative">
            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 24px 80px' }}>
              {children}
            </div>
          </main>
        </div>
      </div>

      <PushPrompt />

      {onboardingToast && (
        <div className="fixed bottom-6 right-6 z-[10000] bg-[var(--green)]/10 border border-[var(--green)]/30 text-[var(--green)] px-4 py-3 rounded-lg text-sm font-semibold shadow-xl animate-in fade-in slide-in-from-bottom-2">
          {onboardingToast}
        </div>
      )}

      {showOnboarding && userId && (
        <OnboardingModal
          userId={userId}
          defaultName={defaultName}
          onComplete={() => setShowOnboarding(false)}
          onToast={(msg) => {
            setOnboardingToast(msg)
            setTimeout(() => setOnboardingToast(null), 4000)
          }}
        />
      )}
    </WorkspaceProvider>
  )
}
