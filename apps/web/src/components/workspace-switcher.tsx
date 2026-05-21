"use client"

import { useState, useRef, useEffect } from 'react'
import { useWorkspace } from '@/lib/contexts/workspace-context'
import type { Workspace } from '@/lib/api'
import { Check, ChevronDown, Plus, Loader2, Building2, User } from 'lucide-react'
import { cn } from '@/lib/utils'

function WorkspaceAvatar({ ws, size = 22 }: { ws: Workspace; size?: number }) {
  if (ws.logo_url) {
    return (
      <img
        src={ws.logo_url}
        alt={ws.name}
        style={{ width: size, height: size, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }}
      />
    )
  }
  const letter = ws.name.charAt(0).toUpperCase()
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444']
  const color = colors[ws.name.charCodeAt(0) % colors.length]
  return (
    <div style={{
      width: size, height: size, borderRadius: 4, background: color + '22',
      border: `1px solid ${color}44`, display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexShrink: 0, fontSize: size * 0.5,
      fontWeight: 700, color, fontFamily: 'DM Sans, sans-serif',
    }}>
      {letter}
    </div>
  )
}

interface CreateWorkspaceDialogProps {
  onClose: () => void
  onCreated: (ws: Workspace) => void
}

function CreateWorkspaceDialog({ onClose, onCreated }: CreateWorkspaceDialogProps) {
  const { createNew } = useWorkspace()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const slugify = (v: string) =>
    v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

  const handleNameChange = (v: string) => {
    setName(v)
    setSlug(slugify(v))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !slug.trim()) return
    setLoading(true)
    setError('')
    try {
      const ws = await createNew(name.trim(), slug.trim(), description.trim() || undefined)
      onCreated(ws)
    } catch (err: any) {
      setError(err.message || 'Failed to create workspace')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: '#0e1015', border: '1px solid #1e2230', borderRadius: 12,
        padding: 24, width: 400, maxWidth: '90vw',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, fontWeight: 600, color: '#e8ecf4', margin: 0 }}>
            Create Workspace
          </h2>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#6b7280', marginTop: 4 }}>
            Collaborate with your team on SBOM analysis
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 500, color: '#9ca3af', display: 'block', marginBottom: 6 }}>
              Workspace Name
            </label>
            <input
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="Acme Corp"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.04)', border: '1px solid #1e2230',
                borderRadius: 6, padding: '8px 12px', color: '#e8ecf4',
                fontFamily: 'DM Sans, sans-serif', fontSize: 13, outline: 'none',
              }}
            />
          </div>
          <div>
            <label style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 500, color: '#9ca3af', display: 'block', marginBottom: 6 }}>
              Slug (URL identifier)
            </label>
            <div style={{
              display: 'flex', alignItems: 'center',
              background: 'rgba(255,255,255,0.04)', border: '1px solid #1e2230',
              borderRadius: 6, overflow: 'hidden',
            }}>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#4a5068', padding: '8px 0 8px 12px' }}>
                sbom.io/
              </span>
              <input
                value={slug}
                onChange={e => setSlug(slugify(e.target.value))}
                placeholder="acme-corp"
                style={{
                  flex: 1, background: 'transparent', border: 'none',
                  padding: '8px 12px 8px 4px', color: '#e8ecf4',
                  fontFamily: 'DM Mono, monospace', fontSize: 12, outline: 'none',
                }}
              />
            </div>
          </div>
          <div>
            <label style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 500, color: '#9ca3af', display: 'block', marginBottom: 6 }}>
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="A brief description of this workspace..."
              rows={2}
              style={{
                width: '100%', boxSizing: 'border-box', resize: 'none',
                background: 'rgba(255,255,255,0.04)', border: '1px solid #1e2230',
                borderRadius: 6, padding: '8px 12px', color: '#e8ecf4',
                fontFamily: 'DM Sans, sans-serif', fontSize: 13, outline: 'none',
              }}
            />
          </div>

          {error && (
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#ef4444', margin: 0 }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button
              type="button" onClick={onClose}
              style={{
                background: 'transparent', border: '1px solid #1e2230',
                borderRadius: 6, padding: '7px 16px', color: '#9ca3af',
                fontFamily: 'DM Sans, sans-serif', fontSize: 13, cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit" disabled={loading || !name.trim() || !slug.trim()}
              style={{
                background: '#22c55e', border: 'none', borderRadius: 6,
                padding: '7px 16px', color: '#000', fontFamily: 'DM Sans, sans-serif',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                opacity: loading || !name.trim() || !slug.trim() ? 0.6 : 1,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {loading && <Loader2 size={12} className="animate-spin" />}
              Create Workspace
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function WorkspaceSwitcher() {
  const { workspaces, activeWorkspace, isLoading, setActiveWorkspace } = useWorkspace()
  const [open, setOpen] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (isLoading) {
    return (
      <div style={{ padding: '0 12px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Loader2 size={12} style={{ color: '#4a5068' }} className="animate-spin" />
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#4a5068' }}>Loading...</span>
      </div>
    )
  }

  const isPersonal = !activeWorkspace?.slug || activeWorkspace?.plan === 'personal'

  return (
    <>
      <div ref={ref} style={{ padding: '0 8px 8px', position: 'relative' }}>
        <button
          id="workspace-switcher-btn"
          onClick={() => setOpen(o => !o)}
          style={{
            width: '100%', background: open ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
            border: '1px solid #1a1f2e', borderRadius: 7,
            padding: '6px 8px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
          onMouseLeave={e => (e.currentTarget.style.background = open ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)')}
        >
          {activeWorkspace ? (
            <WorkspaceAvatar ws={activeWorkspace} size={20} />
          ) : (
            <div style={{
              width: 20, height: 20, borderRadius: 4, background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.2)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <User size={10} color="#22c55e" />
            </div>
          )}
          <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
            <p style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 500,
              color: '#e8ecf4', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {activeWorkspace?.name || 'Personal Workspace'}
            </p>
            <p style={{
              fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#4a5068',
              margin: 0, marginTop: 1,
            }}>
              {isPersonal ? 'Personal' : `${activeWorkspace?.member_count ?? 1} member${(activeWorkspace?.member_count ?? 1) > 1 ? 's' : ''}`}
            </p>
          </div>
          <ChevronDown
            size={12}
            style={{ color: '#4a5068', flexShrink: 0, transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }}
          />
        </button>

        {open && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 8, right: 8,
            background: '#0e1015', border: '1px solid #1a1f2e', borderRadius: 8,
            zIndex: 200, overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}>
            {/* Section label */}
            <div style={{ padding: '8px 10px 4px' }}>
              <p style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: 9, fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.1em', color: '#374151', margin: 0,
              }}>
                Workspaces
              </p>
            </div>

            {/* List */}
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {workspaces.map(ws => {
                const isActive = activeWorkspace?.id === ws.id
                return (
                  <button
                    key={ws.id}
                    onClick={() => { setActiveWorkspace(ws); setOpen(false) }}
                    style={{
                      width: '100%', background: isActive ? 'rgba(34,197,94,0.08)' : 'transparent',
                      border: 'none', padding: '7px 10px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8,
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => !isActive && (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                    onMouseLeave={e => !isActive && (e.currentTarget.style.background = 'transparent')}
                  >
                    <WorkspaceAvatar ws={ws} size={18} />
                    <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                      <p style={{
                        fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 500,
                        color: isActive ? '#22c55e' : '#c9d1e0', margin: 0,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {ws.name}
                      </p>
                      <p style={{
                        fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#4a5068',
                        margin: 0, marginTop: 1, textTransform: 'capitalize',
                      }}>
                        {ws.role || 'member'} · {ws.plan}
                      </p>
                    </div>
                    {isActive && <Check size={11} color="#22c55e" />}
                  </button>
                )
              })}
            </div>

            {/* Create new */}
            <div style={{ borderTop: '1px solid #1a1f2e', padding: 6 }}>
              <button
                id="create-workspace-btn"
                onClick={() => { setOpen(false); setShowCreate(true) }}
                style={{
                  width: '100%', background: 'transparent', border: 'none',
                  padding: '6px 8px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 7, borderRadius: 5,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: 4,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px dashed #374151',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Plus size={10} color="#6b7280" />
                </div>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#6b7280', fontWeight: 500 }}>
                  Create workspace
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateWorkspaceDialog
          onClose={() => setShowCreate(false)}
          onCreated={() => setShowCreate(false)}
        />
      )}
    </>
  )
}
