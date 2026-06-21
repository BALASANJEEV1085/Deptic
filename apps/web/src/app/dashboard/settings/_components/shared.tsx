"use client"

import { useEffect, useState, ReactNode } from 'react'
import { X, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Toast ────────────────────────────────────────────────────────────────────

export interface ToastMessage { id: number; message: string; type: 'success' | 'error' }

let _toastId = 0
type ToastFn = (msg: string, type?: 'success' | 'error') => void
let _showToast: ToastFn = () => {}

export function useToastEmitter() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    _showToast = (message, type = 'success') => {
      const id = ++_toastId
      setToasts(t => [...t, { id, message, type }])
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
    }
  }, [])

  return toasts
}

export function showToast(msg: string, type: 'success' | 'error' = 'success') {
  _showToast(msg, type)
}

export function ToastContainer({ toasts }: { toasts: ToastMessage[] }) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={cn(
          "flex items-center gap-2.5 px-4 py-3 rounded-lg border shadow-xl text-xs font-semibold pointer-events-auto animate-in slide-in-from-bottom-2 fade-in duration-300",
          t.type === 'success'
            ? "bg-[var(--green)]/10 border-[var(--green)]/30 text-[var(--green)]"
            : "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
        )}>
          {t.type === 'success' ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
          {t.message}
        </div>
      ))}
    </div>
  )
}

// ── Toggle ────────────────────────────────────────────────────────────────────

export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ffffff]/50",
        checked ? "bg-[var(--green)]" : "bg-muted-foreground/30"
      )}
    >
      <span className={cn(
        "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition duration-200 ease-in-out",
        checked ? "translate-x-4" : "translate-x-0"
      )} />
    </button>
  )
}

// ── Modal ────────────────────────────────────────────────────────────────────

export function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[var(--lp-bg)]/70" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />
}

export function SectionSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-32" />
      <div className="rounded-xl border border-border p-6 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-3/4" />
      </div>
    </div>
  )
}
