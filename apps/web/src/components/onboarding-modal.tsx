'use client'

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { completeOnboarding } from '@/lib/api'
import { CustomLoader } from '@/components/custom-loader'

const ROLES = [
  'Security Engineer',
  'DevOps / Platform Engineer',
  'Software Developer',
  'Engineering Manager',
  'Compliance Officer',
  'Student / Researcher',
  'Other',
]

const USE_CASES = [
  { id: 'vulnerabilities', icon: '🔍', title: 'Scan for vulnerabilities', desc: 'Detect CVEs in dependencies' },
  { id: 'sbom', icon: '📄', title: 'Generate SBOMs', desc: 'CycloneDX or SPDX export' },
  { id: 'compliance', icon: '✅', title: 'Prove compliance', desc: 'NTIA EO14028 or EU CRA' },
  { id: 'ci_cd', icon: '🔧', title: 'CI/CD integration', desc: 'Auto-scan on every push' },
]

const HEARD_OPTIONS = [
  'GitHub', 'Google Search', 'Twitter / X', 'LinkedIn', 'YouTube',
  'A friend / colleague', 'Hacker News', 'Reddit', 'College / University', 'Other',
]

interface Props {
  userId: string
  defaultName?: string
  onComplete: () => void
  onToast: (msg: string) => void
}

export function OnboardingModal({ userId, defaultName = '', onComplete, onToast }: Props) {
  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [animKey, setAnimKey] = useState(0)
  const [saving, setSaving] = useState(false)

  const [fullName, setFullName] = useState(defaultName)
  const [jobRole, setJobRole] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [useCases, setUseCases] = useState<string[]>([])
  const [heardFrom, setHeardFrom] = useState('')
  const [heardExtra, setHeardExtra] = useState('')

  const totalSteps = 4
  const progress = (step / totalSteps) * 100

  const goTo = (next: number, dir: 'forward' | 'back') => {
    setDirection(dir)
    setAnimKey(k => k + 1)
    setStep(next)
  }

  const markDone = useCallback(() => {
    localStorage.setItem(`deptic-onboarding-done-${userId}`, 'true')
  }, [userId])

  const handleSkip = async () => {
    setSaving(true)
    try {
      await completeOnboarding({ skipped: true })
      markDone()
      onComplete()
    } catch {
      onToast('Failed to skip onboarding')
    } finally {
      setSaving(false)
    }
  }

  const handleFinish = async () => {
    setSaving(true)
    try {
      const heard = heardExtra.trim() || heardFrom
      await completeOnboarding({
        full_name: fullName.trim(),
        job_role: jobRole,
        company_name: companyName.trim(),
        heard_about_from: heard,
        use_case: useCases.join(','),
        skipped: false,
      })
      markDone()
      onToast('Welcome to Deptic! 🎉')
      onComplete()
    } catch {
      onToast('Failed to save onboarding')
    } finally {
      setSaving(false)
    }
  }

  const toggleUseCase = (id: string) => {
    setUseCases(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="relative w-full max-w-[520px] rounded-2xl border p-10"
        style={{ background: '#0f1117', borderColor: '#1e2230' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[#22c55e] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.25C16.5 22.15 20 17.25 20 12V6L12 2z" stroke="#000" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="font-bold text-white text-sm tracking-tight">DEPTIC</span>
          </div>
          <span className="font-mono text-xs text-[#6b7280]">{step} of {totalSteps}</span>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 w-full bg-[#1e2230] rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-[#22c55e] rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step content */}
        <div
          key={animKey}
          className={cn(
            'transition-all duration-250 ease-out',
            direction === 'forward'
              ? 'animate-in fade-in slide-in-from-right-10'
              : 'animate-in fade-in slide-in-from-left-10'
          )}
        >
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-syne text-[26px] font-bold text-white mb-2">Welcome to Deptic 👋</h2>
                <p className="text-sm text-[#94a3b8]">Let&apos;s set up your account in 60 seconds.</p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#64748b]">Your Name</label>
                <input
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="How should we call you?"
                  className="w-full h-10 px-3 rounded-lg border text-sm text-white outline-none focus:border-[#22c55e]/50 transition-colors"
                  style={{ background: '#161920', borderColor: '#1e2230' }}
                />
                <p className="text-[11px] text-[#64748b]">This appears on your profile and shared reports</p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-[22px] font-bold text-white mb-2">Tell us about yourself</h2>
                <p className="text-sm text-[#94a3b8]">Helps us show you the most relevant features.</p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#64748b]">Your Role</label>
                <select
                  value={jobRole}
                  onChange={e => setJobRole(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border text-sm text-white outline-none focus:border-[#22c55e]/50 appearance-none cursor-pointer"
                  style={{ background: '#161920', borderColor: '#1e2230' }}
                >
                  <option value="">Select your role</option>
                  {ROLES.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#64748b]">Company or Organization (optional)</label>
                <input
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="e.g. Acme Corp, Personal project"
                  className="w-full h-10 px-3 rounded-lg border text-sm text-white outline-none focus:border-[#22c55e]/50"
                  style={{ background: '#161920', borderColor: '#1e2230' }}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-[22px] font-bold text-white mb-2">What brings you to Deptic?</h2>
                <p className="text-sm text-[#94a3b8]">Select all that apply.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {USE_CASES.map(uc => {
                  const selected = useCases.includes(uc.id)
                  return (
                    <button
                      key={uc.id}
                      type="button"
                      onClick={() => toggleUseCase(uc.id)}
                      className={cn(
                        'text-left rounded-[10px] border p-4 transition-all',
                        selected
                          ? 'border-[#22c55e] bg-[rgba(34,197,94,0.06)]'
                          : 'border-[#1e2230] bg-[#161920] hover:border-[#334155]'
                      )}
                    >
                      <span className="text-lg">{uc.icon}</span>
                      <p className="text-xs font-semibold text-white mt-2">{uc.title}</p>
                      <p className="text-[10px] text-[#64748b] mt-0.5">{uc.desc}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-[22px] font-bold text-white mb-2">How did you find us?</h2>
                <p className="text-sm text-[#94a3b8]">Optional — helps us understand where developers discover Deptic.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {HEARD_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setHeardFrom(opt)}
                    className={cn(
                      'px-[18px] py-2 rounded-full border text-xs font-medium transition-all',
                      heardFrom === opt
                        ? 'border-[#22c55e] text-[#22c55e] bg-[rgba(34,197,94,0.06)]'
                        : 'border-[#1e2230] text-[#94a3b8] bg-[#161920] hover:border-[#334155]'
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#64748b]">Anything else to share?</label>
                <input
                  value={heardExtra}
                  onChange={e => setHeardExtra(e.target.value)}
                  placeholder="Tell us more (optional)"
                  className="w-full h-10 px-3 rounded-lg border text-sm text-white outline-none focus:border-[#22c55e]/50"
                  style={{ background: '#161920', borderColor: '#1e2230' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-[#1e2230]">
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => goTo(step - 1, 'back')}
                disabled={saving}
                className="text-xs text-[#94a3b8] hover:text-white px-3 py-2 rounded-lg transition-colors"
              >
                ← Back
              </button>
            )}
            <button
              type="button"
              onClick={handleSkip}
              disabled={saving}
              className="text-xs text-[#64748b] hover:text-[#94a3b8] transition-colors"
            >
              {step === totalSteps ? 'Skip →' : 'Skip setup →'}
            </button>
          </div>

          {step < totalSteps ? (
            <button
              type="button"
              disabled={saving || (step === 1 && !fullName.trim()) || (step === 3 && useCases.length === 0)}
              onClick={() => {
                if (step === 1 && !fullName.trim()) return
                if (step === 3 && useCases.length === 0) return
                goTo(step + 1, 'forward')
              }}
              className="flex items-center gap-2 bg-[#22c55e] hover:bg-[#1ea34d] disabled:opacity-50 text-black font-bold text-xs px-5 py-2.5 rounded-lg transition-colors"
            >
              Continue →
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={handleFinish}
              className="flex items-center gap-2 bg-[#22c55e] hover:bg-[#1ea34d] disabled:opacity-50 text-black font-bold text-xs px-5 py-2.5 rounded-lg transition-colors"
            >
              {saving ? <CustomLoader size={14} /> : null}
              Finish setup →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
