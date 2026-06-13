"use client"

import { useState, useRef, useCallback, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Camera, Mail, Save, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { Modal, SectionSkeleton, showToast } from './shared'
import { useTheme } from 'next-themes'
import { getUserProfile, updateUserProfile } from '@/lib/api'

const ROLE_OPTIONS = [
  'Security Engineer',
  'DevOps / Platform Engineer',
  'Software Developer',
  'Engineering Manager',
  'Compliance Officer',
  'Student / Researcher',
  'Other',
]

interface Props { user: User | null; loading: boolean }

export function ProfileSection({ user, loading }: Props) {
  const supabase = createClient()
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '')
  const [bio, setBio] = useState(user?.user_metadata?.bio || '')
  const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata?.avatar_url || '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [emailModal, setEmailModal] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  const [jobRole, setJobRole] = useState('')
  const [companyName, setCompanyName] = useState('')

  useEffect(() => {
    getUserProfile()
      .then(p => {
        if (p.full_name) setFullName(p.full_name)
        if (p.job_role) setJobRole(p.job_role)
        if (p.company_name) setCompanyName(p.company_name)
      })
      .catch(() => {})
  }, [])

  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `avatars/${user.id}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (uploadErr) throw uploadErr
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      setAvatarUrl(data.publicUrl)
      await supabase.auth.updateUser({ data: { avatar_url: data.publicUrl } })
      showToast('Avatar updated!')
    } catch {
      showToast('Failed to upload avatar', 'error')
    } finally {
      setUploading(false)
    }
  }, [user, supabase])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateUserProfile({
        full_name: fullName,
        bio,
        job_role: jobRole,
        company_name: companyName,
      })
      showToast('Profile saved!')
    } catch {
      showToast('Failed to save profile', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleEmailChange = async () => {
    if (!newEmail) return
    setSendingEmail(true)
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail })
      if (error) throw error
      showToast('Confirmation sent to new email!')
      setEmailModal(false)
      setNewEmail('')
    } catch {
      showToast('Failed to update email', 'error')
    } finally {
      setSendingEmail(false)
    }
  }

  if (loading) return <SectionSkeleton />

  const initials = (user?.user_metadata?.full_name || user?.email || 'U').charAt(0).toUpperCase()

  return (
    <div className="space-y-6">
      {/* Avatar + Name */}
      <div className="flex flex-col sm:flex-row items-center gap-5">
        <div className="relative group shrink-0">
          <Avatar className="h-16 w-16 border-2 border-border">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback className="bg-muted text-muted-foreground text-xl font-bold">{initials}</AvatarFallback>
          </Avatar>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute inset-0 bg-[var(--lp-bg)]/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer"
          >
            <Camera className="h-4 w-4 text-foreground" />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        </div>
        <div className="text-center sm:text-left">
          <h3 className="text-base font-bold text-foreground">
            {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
          <p className="text-[10px] text-muted-foreground/50 mt-1">
            Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}
          </p>
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Full Name</label>
            <Input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Jane Smith"
              className="bg-muted/30 border-border h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Email</label>
            <div className="flex gap-2">
              <Input
                value={user?.email || ''}
                disabled
                className="bg-muted border-border text-muted-foreground h-9 text-sm flex-1 cursor-not-allowed"
              />
              <Button
                variant="outline"
                onClick={() => setEmailModal(true)}
                className="border-border text-xs font-bold h-9 px-3 hover:bg-muted/50 shrink-0"
              >
                <Mail className="h-3 w-3 mr-1.5" /> Change
              </Button>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Role</label>
            <select
              value={jobRole}
              onChange={e => setJobRole(e.target.value)}
              className="w-full h-9 bg-muted/30 border border-border rounded-lg px-3 text-sm text-foreground focus:border-[var(--green)]/50 focus:outline-none"
            >
              <option value="">Select your role</option>
              {ROLE_OPTIONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Company</label>
            <Input
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              placeholder="Acme Corp"
              className="bg-muted/30 border-border h-9 text-sm"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Bio</label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            rows={3}
            placeholder="Tell us about yourself..."
            className="w-full bg-muted/30 border border-border rounded-lg p-3 text-sm text-foreground focus:border-[var(--green)]/50 focus:outline-none resize-none transition-colors placeholder:text-muted-foreground/40"
          />
        </div>

        {/* Appearance Dropdown */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Appearance</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setThemeOpen(!themeOpen)}
                className="w-full h-9 bg-muted/30 border border-border rounded-lg px-3 pr-8 text-sm text-foreground text-left cursor-pointer focus:outline-none focus:border-[var(--green)]/50 transition-colors"
              >
                {!mounted ? 'Appearance' : theme === 'system' ? 'System' : resolvedTheme === 'light' ? 'Light' : 'Dark'}
              </button>
              <ChevronDown className={cn("absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none transition-transform", themeOpen && "rotate-180")} />
              {themeOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setThemeOpen(false)} />
                  <div className="absolute top-full left-0 mt-1 w-full bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden">
                    {[
                      { value: 'light', label: 'Light' },
                      { value: 'dark', label: 'Dark' },
                      { value: 'system', label: 'System' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { setTheme(opt.value); setThemeOpen(false) }}
                        className={cn(
                          "w-full px-3 py-2 text-sm text-left transition-colors",
                          theme === opt.value
                            ? "bg-[var(--green)]/10 text-[var(--green)] font-semibold"
                            : "text-foreground hover:bg-muted/50"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="bg-[var(--green)] hover:bg-[var(--green)]/90 text-black font-bold h-9 px-6">
        <Save className="h-3.5 w-3.5 mr-2" />
        {saving ? 'Saving…' : 'Save Profile'}
      </Button>

      {/* Change Email Modal */}
      <Modal open={emailModal} onClose={() => setEmailModal(false)} title="Change Email Address">
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">Enter your new email address. A confirmation link will be sent to verify the change.</p>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">New Email</label>
            <Input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="new@example.com"
              className="bg-muted/40 border-border h-9 text-sm"
            />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" onClick={() => setEmailModal(false)} className="border-border text-xs h-9">Cancel</Button>
            <Button onClick={handleEmailChange} disabled={sendingEmail || !newEmail} className="bg-[var(--green)] hover:bg-[var(--green)]/90 text-black font-bold text-xs h-9">
              {sendingEmail ? 'Sending…' : 'Send Confirmation'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
