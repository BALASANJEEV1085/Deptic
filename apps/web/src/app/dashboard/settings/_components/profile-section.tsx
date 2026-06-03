"use client"

import { useState, useRef, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Camera, Mail, Sun, Moon, Laptop, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { Modal, SectionSkeleton, showToast } from './shared'
import { useTheme } from 'next-themes'

interface Props { user: User | null; loading: boolean }

export function ProfileSection({ user, loading }: Props) {
  const supabase = createClient()
  const { theme, setTheme } = useTheme()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '')
  const [bio, setBio] = useState(user?.user_metadata?.bio || '')
  const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata?.avatar_url || '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [emailModal, setEmailModal] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)

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
      const { error } = await supabase.auth.updateUser({ data: { full_name: fullName, bio } })
      if (error) throw error
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
      <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
        <div className="p-6 border-b border-border bg-muted/30 flex flex-col sm:flex-row items-center gap-5">
          <div className="relative group">
            <Avatar className="h-20 w-20 border-2 border-border ring-2 ring-black">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="bg-[#ffffff]/10 text-[#ffffff] text-2xl font-black">{initials}</AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer"
            >
              <Camera className="h-5 w-5 text-foreground" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-base font-bold text-foreground">
              {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">{user?.email}</p>
            <p className="text-[10px] text-zinc-600 mt-1">
              Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}
            </p>
          </div>
        </div>

        <div className="p-6 grid sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Full Name</label>
            <Input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Jane Smith"
              className="bg-muted/40 border-border focus:border-[#ffffff]/50 h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Email</label>
            <div className="flex gap-2">
              <Input
                value={user?.email || ''}
                disabled
                className="bg-muted border-border text-zinc-500 h-9 text-sm flex-1 cursor-not-allowed"
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

          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Bio</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={3}
              placeholder="Tell us about yourself..."
              className="w-full bg-muted/40 border border-border rounded-lg p-3 text-sm text-foreground focus:border-[#ffffff]/50 focus:outline-none resize-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Theme */}
      <div className="rounded-xl border border-border bg-muted/20 p-6 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Appearance</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'light', label: 'Light', icon: Sun },
            { value: 'dark', label: 'Dark', icon: Moon },
            { value: 'system', label: 'System', icon: Laptop },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={cn(
                "flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-semibold transition-all",
                theme === value
                  ? "border-[#ffffff] bg-[#ffffff]/10 text-[#ffffff]"
                  : "border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:border-zinc-600"
              )}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="bg-[#ffffff] hover:bg-[#ffffff]/90 text-black font-bold h-9 px-6">
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
            <Button onClick={handleEmailChange} disabled={sendingEmail || !newEmail} className="bg-[#ffffff] hover:bg-[#ffffff]/90 text-black font-bold text-xs h-9">
              {sendingEmail ? 'Sending…' : 'Send Confirmation'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
