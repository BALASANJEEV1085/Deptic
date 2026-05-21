"use client"

import { useEffect, useState, useCallback } from 'react'
import { useWorkspace } from '@/lib/contexts/workspace-context'
import {
  type WorkspaceMember,
  type WorkspaceInvitation,
  listWorkspaceMembers,
  updateMemberRole,
  removeMember,
  inviteMember,
  listInvitations,
  cancelInvitation,
  updateWorkspace,
  deleteWorkspace
} from '@/lib/api'
import { Loader2, Plus, Trash2, ShieldAlert, Check, X, Users, Mail, Settings, UserMinus, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function WorkspaceSettingsSection() {
  const { activeWorkspace, refresh: refreshWorkspaces, setActiveWorkspace } = useWorkspace()
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [updatingDetails, setUpdatingDetails] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const isPersonal = activeWorkspace?.plan === 'personal'
  const userRole = activeWorkspace?.role || 'viewer'
  const isOwner = userRole === 'owner'
  const isAdmin = userRole === 'admin'
  const canManage = isOwner || isAdmin

  const loadWorkspaceData = useCallback(async () => {
    if (!activeWorkspace || isPersonal) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [membersData, invitesData] = await Promise.all([
        listWorkspaceMembers(activeWorkspace.id),
        listInvitations(activeWorkspace.id)
      ])
      setMembers(membersData.members || [])
      setInvitations(invitesData.invitations || [])
      setName(activeWorkspace.name)
      setDescription(activeWorkspace.description || '')
    } catch (err: any) {
      setError('Failed to load workspace data. Please check your connection.')
      console.error('Failed to load workspace data', err)
    } finally {
      setLoading(false)
    }
  }, [activeWorkspace, isPersonal])

  useEffect(() => {
    loadWorkspaceData()
  }, [loadWorkspaceData])

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeWorkspace || !name.trim()) return
    setUpdatingDetails(true)
    setMessage('')
    setError('')
    try {
      await updateWorkspace(activeWorkspace.id, {
        name: name.trim(),
        description: description.trim() || undefined
      })
      setMessage('Workspace settings updated successfully!')
      await refreshWorkspaces()
    } catch (err: any) {
      setError(err.message || 'Failed to update workspace')
    } finally {
      setUpdatingDetails(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeWorkspace || !inviteEmail.trim()) return
    setInviting(true)
    setMessage('')
    setError('')
    try {
      const res = await inviteMember(activeWorkspace.id, {
        email: inviteEmail.trim(),
        role: inviteRole
      })
      
      setInviteEmail('')
      
      if (res && res.token) {
        const inviteLink = `${window.location.origin}/invite/${res.token}`
        try {
          await navigator.clipboard.writeText(inviteLink)
          setMessage(`Invitation link copied to clipboard: ${inviteLink}`)
        } catch (clipboardErr) {
          setMessage(`Invitation created successfully. Link: ${inviteLink}`)
        }
      } else {
        setMessage(`Invitation sent to ${inviteEmail}`)
      }

      // Reload invitations
      const invitesData = await listInvitations(activeWorkspace.id)
      setInvitations(invitesData.invitations || [])
    } catch (err: any) {
      setError(err.message || 'Failed to send invitation')
    } finally {
      setInviting(false)
    }
  }

  const handleRoleChange = async (memberId: string, newRole: string) => {
    if (!activeWorkspace) return
    try {
      await updateMemberRole(activeWorkspace.id, memberId, newRole)
      await loadWorkspaceData()
      setMessage('Member role updated')
    } catch (err: any) {
      setError(err.message || 'Failed to update member role')
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!activeWorkspace || !confirm('Are you sure you want to remove this member?')) return
    try {
      await removeMember(activeWorkspace.id, memberId)
      await loadWorkspaceData()
      setMessage('Member removed successfully')
    } catch (err: any) {
      setError(err.message || 'Failed to remove member')
    }
  }

  const handleCancelInvite = async (inviteId: string) => {
    if (!activeWorkspace) return
    try {
      await cancelInvitation(activeWorkspace.id, inviteId)
      const invitesData = await listInvitations(activeWorkspace.id)
      setInvitations(invitesData.invitations || [])
      setMessage('Invitation cancelled')
    } catch (err: any) {
      setError(err.message || 'Failed to cancel invitation')
    }
  }

  const handleDeleteWorkspace = async () => {
    if (!activeWorkspace || !confirm('WARNING: Are you sure you want to delete this workspace? This will permanently delete all scans, projects, and memberships. This action cannot be undone.')) return
    try {
      await deleteWorkspace(activeWorkspace.id)
      setActiveWorkspace(null)
      await refreshWorkspaces()
      window.location.href = '/dashboard'
    } catch (err: any) {
      setError(err.message || 'Failed to delete workspace')
    }
  }

  if (!activeWorkspace) {
    return (
      <div className="p-6 rounded-xl border border-border bg-[#0e1015] text-center">
        <Users className="h-10 w-10 text-zinc-500 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-foreground">No Workspace Selected</h3>
        <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-2 leading-relaxed">
          Select or create a workspace from the sidebar switcher to manage team members and settings.
        </p>
      </div>
    )
  }

  if (isPersonal) {
    return (
      <div className="p-6 rounded-xl border border-border bg-[#0e1015] text-center">
        <Users className="h-10 w-10 text-zinc-500 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-foreground">Personal Workspace</h3>
        <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-2 leading-relaxed">
          You are currently in your Personal Workspace. To invite collaborators, share repository scans, or manage permissions, create a new Workspace using the switcher in the sidebar.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 text-[#22c55e] animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Messages */}
      {message && (
        <div className="p-3.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium">
          {message}
        </div>
      )}
      {error && (
        <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
          {error}
        </div>
      )}

      {/* General Settings */}
      <section className="p-6 rounded-xl border border-border bg-[#0e1015]">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Settings className="h-4 w-4 text-[#22c55e]" />
          Workspace Details
        </h3>
        <form onSubmit={handleUpdateDetails} className="space-y-4">
          <div className="grid gap-2">
            <label className="text-xs text-zinc-400 font-medium">Workspace Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={!canManage}
              className="w-full box-sizing-border-box bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-[#22c55e] disabled:opacity-50"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-xs text-zinc-400 font-medium">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              disabled={!canManage}
              rows={2}
              className="w-full box-sizing-border-box bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground resize-none focus:outline-none focus:border-[#22c55e] disabled:opacity-50"
            />
          </div>
          {canManage && (
            <Button
              type="submit"
              disabled={updatingDetails || !name.trim()}
              className="h-8 text-xs bg-[#22c55e] hover:bg-[#22c55e]/90 text-black font-semibold"
            >
              {updatingDetails && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
              Save Details
            </Button>
          )}
        </form>
      </section>

      {/* Team Members */}
      <section className="p-6 rounded-xl border border-border bg-[#0e1015] space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-[#22c55e]" />
            Team Members
          </h3>
          <p className="text-[11px] text-zinc-500 mt-1">Manage team access and roles.</p>
        </div>

        {/* Member list */}
        <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
          {members.map(member => (
            <div key={member.user_id} className="flex items-center justify-between p-3.5 bg-background/30">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-[#22c55e]">
                  {(member.full_name || member.email).charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    {member.full_name || member.email}
                    {member.role === 'owner' && (
                      <span className="text-[9px] bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                        Owner
                      </span>
                    )}
                  </h4>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{member.email}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {canManage && member.role !== 'owner' ? (
                  <>
                    <select
                      value={member.role}
                      onChange={e => handleRoleChange(member.user_id, e.target.value)}
                      className="bg-background border border-border rounded px-2 py-1 text-[11px] text-zinc-400 outline-none"
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button
                      onClick={() => handleRemoveMember(member.user_id)}
                      className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition"
                      title="Remove member"
                    >
                      <UserMinus className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <span className="text-[11px] text-zinc-500 capitalize">{member.role}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Invite Form */}
        {canManage && (
          <form onSubmit={handleInvite} className="pt-4 border-t border-border space-y-4">
            <h4 className="text-xs font-bold text-foreground">Invite New Member</h4>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                <input
                  type="email"
                  placeholder="collaborator@company.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="w-full box-sizing-border-box bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-xs text-foreground focus:outline-none focus:border-[#22c55e]"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-xs text-zinc-400 outline-none"
                >
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
                <Button
                  type="submit"
                  disabled={inviting || !inviteEmail.trim()}
                  className="bg-[#22c55e] hover:bg-[#22c55e]/90 text-black font-semibold text-xs h-9 px-4 shrink-0"
                >
                  {inviting && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                  Send Invite
                </Button>
              </div>
            </div>
          </form>
        )}
      </section>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <section className="p-6 rounded-xl border border-border bg-[#0e1015] space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Pending Invitations</h3>
            <p className="text-[11px] text-zinc-500 mt-1">Invited members who haven't accepted yet.</p>
          </div>
          <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
            {invitations.map(invite => (
              <div key={invite.id} className="flex items-center justify-between p-3 bg-background/30">
                <div>
                  <p className="text-xs font-medium text-foreground">{invite.email}</p>
                  <p className="text-[9px] text-zinc-500 mt-0.5">Role: <span className="capitalize">{invite.role}</span></p>
                </div>
                {canManage && (
                  <button
                    onClick={() => handleCancelInvite(invite.id)}
                    className="text-[11px] text-red-400 hover:text-red-300 font-semibold flex items-center gap-1"
                  >
                    <X className="h-3 w-3" />
                    Cancel
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Danger Zone */}
      {isOwner && (
        <section className="p-6 rounded-xl border border-red-500/10 bg-red-500/[0.02]">
          <h3 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            Danger Zone
          </h3>
          <p className="text-xs text-zinc-500 leading-relaxed mb-4">
            Once you delete a workspace, all of its projects, repository scans, and data are gone forever. Please be certain.
          </p>
          <Button
            onClick={handleDeleteWorkspace}
            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold h-8"
          >
            Delete Workspace
          </Button>
        </section>
      )}
    </div>
  )
}
