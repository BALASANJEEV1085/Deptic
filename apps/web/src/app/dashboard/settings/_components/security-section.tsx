"use client"

import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { LogOut, Trash2, Globe, Mail, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Modal, SectionSkeleton, showToast } from './shared'
import { useRouter } from 'next/navigation'

export function SecuritySection({ user, loading }: { user: User | null; loading: boolean }) {
  const supabase = createClient()
  const router = useRouter()

  const [deleteModal, setDeleteModal] = useState(false)
  const [deleteEmail, setDeleteEmail] = useState('')
  const [deleting, setDeleting] = useState(false)

  const providers = (user?.app_metadata?.providers as string[]) || 
    (user?.app_metadata?.provider ? [user.app_metadata.provider as string] : ['email'])

  const hasEmail = providers.includes('email') || providers.includes('email+password')


  const handleSignOutAll = async () => {
    await supabase.auth.signOut({ scope: 'global' })
    router.push('/login')
  }

  const handleDeleteAccount = async () => {
    if (!user || deleteEmail !== user.email) {
      showToast('Email does not match', 'error')
      return
    }
    setDeleting(true)
    try {
      // We call a secure RPC function that deletes all user data and the auth user itself
      const { error } = await supabase.rpc('delete_user_account')
      
      if (error) throw error

      showToast('Account deleted successfully')
      await supabase.auth.signOut()
      router.push('/login')
    } catch (err: any) {
      console.error('Deletion error:', err)
      showToast(err.message || 'Failed to delete account', 'error')
      setDeleting(false)
    }
  }

  const providerIcon = (p: string) => {
    if (p === 'github') return <Globe className="h-3.5 w-3.5" />
    return <Mail className="h-3.5 w-3.5" />
  }

  if (loading) return <SectionSkeleton />

  return (
    <div className="space-y-6">
      {/* Connected Providers */}
      <div className="rounded-xl border border-border bg-muted/20 p-6 space-y-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Connected Providers</p>
        <div className="space-y-2">
          {providers.map(p => (
            <div key={p} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center gap-2.5 text-sm font-semibold text-foreground capitalize">
                {providerIcon(p)} {p === 'email' ? 'Email / Password' : p}
              </div>
              <Badge className="bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20 text-[10px] font-bold">Connected</Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Active Sessions */}
      <div className="rounded-xl border border-border bg-muted/20 p-6 space-y-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Active Sessions</p>
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border">
          <div>
            <p className="text-sm font-semibold text-foreground">Current Session</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Last sign in: {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : '—'}
            </p>
          </div>
          <Badge className="bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20 text-[10px]">Active</Badge>
        </div>
        <Button
          variant="outline"
          onClick={handleSignOutAll}
          className="border-border text-xs font-bold h-9 text-zinc-400 hover:text-red-400 hover:border-red-500/30 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5 mr-2" /> Sign Out All Devices
        </Button>
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl border border-red-500/20 bg-red-500/[0.02] p-6 space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-red-400">Danger Zone</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Delete Account</p>
            <p className="text-xs text-zinc-500 mt-0.5 max-w-sm">Permanently delete your account and all associated SBOM data. This cannot be undone.</p>
          </div>
          <Button
            onClick={() => setDeleteModal(true)}
            className="bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-xs h-9 shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete Account
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title="Delete Account">
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">This will permanently delete your account and all data. This action cannot be undone.</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Type your email to confirm: <span className="text-foreground">{user?.email}</span>
            </label>
            <Input
              type="email"
              value={deleteEmail}
              onChange={e => setDeleteEmail(e.target.value)}
              placeholder={user?.email || ''}
              className="bg-muted/40 border-border h-9 text-sm"
            />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" onClick={() => setDeleteModal(false)} className="border-border text-xs h-9">Cancel</Button>
            <Button
              onClick={handleDeleteAccount}
              disabled={deleting || deleteEmail !== user?.email}
              className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs h-9"
            >
              {deleting ? 'Deleting…' : 'Delete Account'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
