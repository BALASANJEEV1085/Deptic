"use client"

import { useEffect, useState, useCallback } from 'react'
import { useWorkspace } from '@/lib/contexts/workspace-context'
import { createClient } from '@/lib/supabase/client'
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
import { showToast } from './shared'
import { Plus, Trash2, ShieldAlert, Check, X, Users, Mail, Settings, UserMinus, Shield, UserX } from 'lucide-react'
import { CustomLoader } from '@/components/custom-loader'
import { Button } from '@/components/ui/button'

export function WorkspaceSettingsSection() {
  const { activeWorkspace, refresh: refreshWorkspaces, setActiveWorkspace } = useWorkspace()
  const supabase = createClient()

  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [updatingDetails, setUpdatingDetails] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const isPersonal = activeWorkspace?.is_personal === true || activeWorkspace?.description === 'Default Personal Workspace'
  const userRole = activeWorkspace?.role || 'viewer'
  const isOwner = userRole === 'owner'
  const isAdmin = userRole === 'admin'
  const canManage = isOwner || isAdmin

  // Fetch current user id once
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id)
    })
  }, [supabase])

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
      showToast('Failed to load workspace data. Please check your connection.', 'error')
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
    try {
      await updateWorkspace(activeWorkspace.id, {
        name: name.trim(),
        description: description.trim() || undefined
      })
      showToast('Workspace settings updated successfully!')
      await refreshWorkspaces()
    } catch (err: any) {
      showToast(err.message || 'Failed to update workspace', 'error')
    } finally {
      setUpdatingDetails(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeWorkspace || !inviteEmail.trim()) return

    // Frontend pre-check: already a member?
    const emailLower = inviteEmail.trim().toLowerCase()
    const alreadyMember = members.some(m => (m.email || '').toLowerCase() === emailLower)
    if (alreadyMember) {
      showToast('This user is already a member of this workspace.', 'error')
      return
    }

    // Frontend pre-check: already has pending invitation?
    const alreadyInvited = invitations.some(i => (i.email || '').toLowerCase() === emailLower)
    if (alreadyInvited) {
      showToast('An active invitation has already been sent to this email.', 'error')
      return
    }

    setInviting(true)
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
          showToast(`Invitation link copied to clipboard! Share it with ${inviteEmail.trim()}`)
        } catch {
          showToast(`Invitation created. Link: ${inviteLink}`)
        }
      } else {
        showToast(`Invitation sent to ${inviteEmail.trim()}`)
      }

      // Reload invitations list
      const invitesData = await listInvitations(activeWorkspace.id)
      setInvitations(invitesData.invitations || [])
    } catch (err: any) {
      showToast(err.message || 'Failed to send invitation', 'error')
    } finally {
      setInviting(false)
    }
  }

  const handleRoleChange = async (memberId: string, newRole: string) => {
    if (!activeWorkspace) return
    try {
      await updateMemberRole(activeWorkspace.id, memberId, newRole)
      await loadWorkspaceData()
      showToast('Member role updated successfully')
    } catch (err: any) {
      showToast(err.message || 'Failed to update member role', 'error')
    }
  }

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!activeWorkspace) return
    setRemovingId(memberId)
    try {
      await removeMember(activeWorkspace.id, memberId)
      await loadWorkspaceData()
      showToast(`${memberName} has been removed from the workspace`)
    } catch (err: any) {
      showToast(err.message || 'Failed to remove member', 'error')
    } finally {
      setRemovingId(null)
    }
  }

  const handleCancelInvite = async (inviteId: string) => {
    if (!activeWorkspace) return
    try {
      await cancelInvitation(activeWorkspace.id, inviteId)
      const invitesData = await listInvitations(activeWorkspace.id)
      setInvitations(invitesData.invitations || [])
      showToast('Invitation cancelled')
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel invitation', 'error')
    }
  }

  const handleDeleteWorkspace = async () => {
    if (!activeWorkspace) return
    // Use a confirmation dialog-style alert
    const confirmed = window.confirm(
      `WARNING: Are you sure you want to delete "${activeWorkspace.name}"?\n\nThis will permanently delete all scans, projects, and memberships. This action cannot be undone.`
    )
    if (!confirmed) return
    try {
      await deleteWorkspace(activeWorkspace.id)
      setActiveWorkspace(null)
      await refreshWorkspaces()
      window.location.href = '/dashboard'
    } catch (err: any) {
      showToast(err.message || 'Failed to delete workspace', 'error')
    }
  }

  if (!activeWorkspace) {
    return (
      <div className="p-6 rounded-xl border border-border bg-[var(--card)] text-center">
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
      <div className="p-6 rounded-xl border border-border bg-[var(--card)] text-center">
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
        <CustomLoader size={24} className="text-[#ffffff]" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* General Settings */}
      <section className="p-6 rounded-xl border border-border bg-[var(--card)]">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Settings className="h-4 w-4 text-[var(--green)]" />
          Workspace Details
        </h3>
        <form onSubmit={handleUpdateDetails} className="space-y-4">
          <div className="grid gap-2">
            <label className="text-xs text-muted-foreground font-medium">Workspace Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={!canManage}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-[#ffffff] disabled:opacity-50"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-xs text-muted-foreground font-medium">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              disabled={!canManage}
              rows={2}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground resize-none focus:outline-none focus:border-[#ffffff] disabled:opacity-50"
            />
          </div>
          {canManage && (
            <Button
              type="submit"
              disabled={updatingDetails || !name.trim()}
              className="h-8 text-xs bg-[var(--green)] hover:bg-[var(--green)]/90 text-black font-semibold"
            >
              {updatingDetails && <CustomLoader size={12} className="mr-1.5" />}
              Save Details
            </Button>
          )}
        </form>
      </section>

      {/* Team Members */}
      <section className="p-6 rounded-xl border border-border bg-[var(--card)] space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-[var(--green)]" />
            Team Members
            <span className="ml-1 text-[10px] font-bold bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20 px-1.5 py-0.5 rounded">
              {members.length}
            </span>
          </h3>
          <p className="text-[11px] text-zinc-500 mt-1">Manage team access and roles.</p>
        </div>

        {/* Member list */}
        <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
          {members.length === 0 ? (
            <div className="p-4 text-center text-xs text-zinc-500">No members found.</div>
          ) : (
            members.map(member => {
              const isMe = member.user_id === currentUserId
              const memberIsOwner = member.role === 'owner'
              // Admins cannot remove/edit other admins; only owners can
              const canEditThis = canManage && !memberIsOwner && !(isAdmin && member.role === 'admin')
              const displayName = member.name || member.email || 'Unknown'

              return (
                <div key={member.user_id} className="flex items-center justify-between p-3.5 bg-background/30">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted border border-border flex items-center justify-center font-bold text-xs text-foreground">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        {displayName}
                        {isMe && (
                          <span className="text-[9px] bg-zinc-800 text-muted-foreground border border-zinc-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">You</span>
                        )}
                        {memberIsOwner && (
                          <span className="text-[9px] bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Owner</span>
                        )}
                      </h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{member.email}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {canEditThis ? (
                      <>
                        <select
                          value={member.role}
                          onChange={e => handleRoleChange(member.user_id, e.target.value)}
                          className="bg-background border border-border rounded px-2 py-1 text-[11px] text-muted-foreground outline-none"
                        >
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        <button
                          onClick={() => handleRemoveMember(member.user_id, displayName)}
                          disabled={removingId === member.user_id}
                          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition disabled:opacity-50"
                          title="Remove member"
                        >
                          {removingId === member.user_id
                            ? <CustomLoader size={14} />
                            : <UserX className="h-3.5 w-3.5" />
                          }
                        </button>
                      </>
                    ) : (
                      <span className="text-[11px] text-zinc-500 capitalize">{member.role}</span>
                    )}
                  </div>
                </div>
              )
            })
          )}
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
                  className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-xs text-foreground focus:outline-none focus:border-[#ffffff]"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-xs text-muted-foreground outline-none"
                >
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
                <Button
                  type="submit"
                  disabled={inviting || !inviteEmail.trim()}
                  className="bg-[var(--green)] hover:bg-[var(--green)]/90 text-black font-semibold text-xs h-9 px-4 shrink-0"
                >
                  {inviting && <CustomLoader size={12} className="mr-1.5" />}
                  Send Invite
                </Button>
              </div>
            </div>
          </form>
        )}
      </section>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <section className="p-6 rounded-xl border border-border bg-[var(--card)] space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Pending Invitations</h3>
            <p className="text-[11px] text-zinc-500 mt-1">Invited members who haven&apos;t accepted yet.</p>
          </div>
          <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
            {invitations.map(invite => (
              <div key={invite.id} className="flex items-center justify-between p-3 bg-background/30">
                <div>
                  <p className="text-xs font-medium text-foreground flex items-center gap-2">
                    {invite.email}
                    {invite.declined && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded">
                        Declined
                      </span>
                    )}
                  </p>
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
