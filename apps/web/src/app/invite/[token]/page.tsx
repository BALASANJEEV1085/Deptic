"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getInvitationPublic, acceptInvitation } from '@/lib/api'
import { Loader2, Users, Building, ShieldAlert, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function InvitationPage() {
  const params = useParams()
  const token = params.token as string
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [inviteInfo, setInviteInfo] = useState<{ workspace_name: string; email: string; invited_by_name: string } | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        // Redirect to login with the current invite page path as the next parameter
        router.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`)
        return
      }

      try {
        const info = await getInvitationPublic(token)
        setInviteInfo(info)
      } catch (err: any) {
        setError(err.message || 'Invitation is invalid, expired, or already accepted.')
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      init()
    }
  }, [token, supabase, router])

  const handleAccept = async () => {
    setAccepting(true)
    setError('')
    try {
      const result = await acceptInvitation(token)
      setSuccess(true)
      
      // Store accepted workspace as the active workspace
      if (typeof window !== 'undefined') {
        localStorage.setItem('sbom_active_workspace_id', result.workspace_id)
      }
      
      // Wait a moment so user sees success and then redirect
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation. Please try again.')
      setAccepting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#090b0f] p-4 text-zinc-300 font-sans selection:bg-[#22c55e]/30 selection:text-[#22c55e]">
      <div className="w-full max-w-[420px] rounded-xl border border-[#1e2230] bg-[#0e1015] p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative Grid Backdrop */}
        <div 
          className="absolute inset-0 opacity-5 pointer-events-none" 
          style={{
            backgroundImage: 'radial-gradient(circle, #22c55e 1px, transparent 1px)',
            backgroundSize: '16px 16px',
          }}
        />

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 text-[#22c55e] animate-spin" />
            <p className="text-xs text-zinc-500 font-medium font-mono">Verifying invitation...</p>
          </div>
        ) : error ? (
          <div className="text-center py-6">
            <div className="h-12 w-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="h-6 w-6 text-red-400" />
            </div>
            <h2 className="text-base font-bold text-white mb-2">Invalid Invitation</h2>
            <p className="text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed mb-6">
              {error}
            </p>
            <Button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs h-9 font-semibold"
            >
              Go to Dashboard
            </Button>
          </div>
        ) : success ? (
          <div className="text-center py-6">
            <div className="h-12 w-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4 animate-bounce">
              <CheckCircle className="h-6 w-6 text-[#22c55e]" />
            </div>
            <h2 className="text-base font-bold text-white mb-2">Invitation Accepted!</h2>
            <p className="text-xs text-zinc-500 font-mono">
              Redirecting you to your dashboard...
            </p>
          </div>
        ) : (
          <div className="text-center">
            <div className="h-12 w-12 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center mx-auto mb-6">
              <Users className="h-6 w-6 text-[#22c55e]" />
            </div>
            <h2 className="text-lg font-bold text-white font-syne mb-2">Join Workspace</h2>
            <p className="text-xs text-zinc-400 leading-relaxed mb-6">
              <span className="font-semibold text-[#22c55e]">{inviteInfo?.invited_by_name}</span> has invited you to join the{' '}
              <span className="font-semibold text-white">{inviteInfo?.workspace_name}</span> workspace.
            </p>

            <div className="bg-[#121620] border border-[#1e2230] rounded-lg p-3.5 mb-6 text-left">
              <div className="flex items-center gap-2 mb-1.5">
                <Building className="h-3.5 w-3.5 text-zinc-500" />
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Workspace Details</span>
              </div>
              <p className="text-xs text-zinc-300 font-medium">{inviteInfo?.workspace_name}</p>
              <p className="text-[10px] text-zinc-500 mt-1 font-mono">Invited: {inviteInfo?.email}</p>
            </div>

            <div className="flex flex-col gap-2.5">
              <Button
                onClick={handleAccept}
                disabled={accepting}
                className="w-full bg-[#22c55e] hover:bg-[#22c55e]/90 text-black font-bold text-xs h-10 shadow-lg shadow-[#22c55e]/10"
              >
                {accepting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
                Accept Invitation
              </Button>
              <Button
                variant="ghost"
                onClick={() => router.push('/dashboard')}
                className="w-full hover:bg-white/5 text-zinc-500 hover:text-zinc-300 text-xs h-9"
              >
                Decline
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
