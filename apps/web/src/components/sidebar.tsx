"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { getAllVulnerabilities, resolveAuditId } from '@/lib/api'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  LayoutDashboard, Folder, ShieldAlert, FileText, Settings,
  LogOut, ScanSearch, PlusCircle, Search
} from 'lucide-react'
import { CustomLoader } from '@/components/custom-loader'
import { cn } from '@/lib/utils'
import { WorkspaceSwitcher } from '@/components/workspace-switcher'
import { useWorkspace } from '@/lib/contexts/workspace-context'

const MAIN_NAV = [
  { name: 'Dashboard',       href: '/dashboard',                    icon: LayoutDashboard },
  { name: 'Projects',        href: '/dashboard/projects',           icon: Folder },
  { name: 'Scans',           href: '/dashboard/scans',              icon: ScanSearch },
  { name: 'Vulnerabilities', href: '/dashboard/vulnerabilities',    icon: ShieldAlert },
  { name: 'Reports',         href: '/dashboard/reports',            icon: FileText },
]

const CONFIG_NAV = [
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.25C16.5 22.15 20 17.25 20 12V6L12 2z"
        fill="var(--avatar-bg)"
        stroke="var(--logo-icon)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M9 12l2 2 4-4"
        stroke="var(--logo-icon)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [hasCritical, setHasCritical] = useState(false)
  const [searchAuditId, setSearchAuditId] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const { activeWorkspace } = useWorkspace()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))

    getAllVulnerabilities()
      .then(res => {
        if (res.vulnerabilities?.some(v => v.severity === 'CRITICAL')) {
          setHasCritical(true)
        }
      })
      .catch(err => console.error('Sidebar vuln fetch failed:', err))
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === href
      : pathname === href || pathname.startsWith(href + '/')

  const displayName =
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'User'

  const initials = displayName.charAt(0).toUpperCase()

  return (
    <div
      className="flex h-full flex-col"
      style={{
        width: 220,
        background: 'var(--bg)',
        borderRight: '1px solid var(--border)',
      }}
    >
      <div
        className="hidden md:flex items-center gap-2.5 px-4"
        style={{ height: 56, borderBottom: '1px solid var(--border)' }}
      >
        <Link href="/dashboard" className="flex items-center -ml-2">
          <img src="/logo-light.png" alt="Deptic Logo" className="h-24 w-auto dark:hidden" />
          <img src="/logo-dark.png" alt="Deptic Logo" className="h-24 w-auto hidden dark:block" />
        </Link>
      </div>

      <div style={{ padding: '8px 4px 0' }}>
        <WorkspaceSwitcher />
      </div>

      <div style={{ height: 1, background: 'var(--border)', margin: '0 12px' }} />

      <div style={{ padding: '8px 12px 4px' }}>
        <Link
          href="/dashboard/projects/new"
          onClick={onClose}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            height: 32,
            padding: '0 10px',
            borderRadius: 6,
            background: 'var(--cta-bg)',
            border: '1px solid var(--cta-border)',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--cta-text)',
            textDecoration: 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <PlusCircle size={13} />
          Initiate Scan
        </Link>
      </div>

      <div style={{ padding: '4px 12px' }}>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (!searchAuditId.trim()) return
            setIsSearching(true)
            setSearchError('')
            try {
              const res = await resolveAuditId(searchAuditId.trim())
              if (res.scan_id) {
                router.push(`/dashboard/scans/${res.scan_id}`)
                if (onClose) onClose()
              }
            } catch (err: any) {
              setSearchError(err.message || 'Not found')
              setTimeout(() => setSearchError(''), 3000)
            } finally {
              setIsSearching(false)
            }
          }}
          style={{ position: 'relative' }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--input-bg)',
            border: searchError ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--input-border)',
            borderRadius: 6,
            height: 30,
            padding: '0 8px',
            gap: 6,
          }}>
            <Search size={12} color="var(--text-secondary)" />
            <input
              type="text"
              placeholder="Search Audit ID..."
              value={searchAuditId}
              onChange={(e) => setSearchAuditId(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: 11,
                fontFamily: 'DM Mono, monospace',
                width: '100%',
              }}
            />
            {isSearching && <CustomLoader size={12} className="text-muted-foreground" />}
          </div>
          {searchError && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: '#ef4444',
              color: 'white',
              fontSize: 9,
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '0 0 4px 4px',
              textAlign: 'center',
              zIndex: 10,
              fontFamily: 'DM Sans, sans-serif'
            }}>
              {searchError}
            </div>
          )}
        </form>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar" style={{ padding: '8px 12px' }}>
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 10,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--text-label)',
            margin: '16px 0 6px 4px',
          }}
        >
          Main
        </p>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {MAIN_NAV.map(item => {
            const active = isActive(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={cn('nav-item', active && 'active')}
              >
                <Icon
                  size={14}
                  style={{ color: active ? 'var(--nav-icon-active)' : 'var(--nav-icon)', flexShrink: 0 }}
                />
                <span style={{ flex: 1 }}>{item.name}</span>
                {item.name === 'Vulnerabilities' && hasCritical && (
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#ef4444',
                      flexShrink: 0,
                    }}
                  />
                )}
              </Link>
            )
          })}
        </nav>

        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 10,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--text-label)',
            margin: '20px 0 6px 4px',
          }}
        >
          Configuration
        </p>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {CONFIG_NAV.map(item => {
            const active = isActive(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={cn('nav-item', active && 'active')}
              >
                <Icon
                  size={14}
                  style={{ color: active ? 'var(--nav-icon-active)' : 'var(--nav-icon)', flexShrink: 0 }}
                />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      <div style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex w-full items-center gap-2.5 outline-none"
            style={{
              padding: '6px 8px',
              borderRadius: 6,
              transition: 'background 0.15s ease',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'var(--avatar-bg)',
                border: '1px solid var(--avatar-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-active)',
              }}
            >
              {initials}
            </div>
            <div style={{ flex: 1, overflow: 'hidden', textAlign: 'left' }}>
              <p
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {displayName}
              </p>
              <p
                style={{
                  fontFamily: 'DM Mono, monospace',
                  fontSize: 11,
                  color: 'var(--text-tertiary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {activeWorkspace?.name || 'Personal Workspace'}
              </p>
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            style={{
              background: 'var(--dropdown-bg)',
              border: '1px solid var(--border)',
              minWidth: 200,
              padding: 6,
            }}
            align="start"
            side="top"
            sideOffset={8}
          >
            <div style={{ padding: '8px 10px 10px' }}>
              <p
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--text-tertiary)',
                  marginBottom: 4,
                }}
              >
                Account
              </p>
              <p
                style={{
                  fontFamily: 'DM Mono, monospace',
                  fontSize: 11,
                  color: 'var(--table-cell)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user?.email}
              </p>
            </div>
            <DropdownMenuSeparator style={{ background: 'var(--border)', margin: '4px 0' }} />
            <DropdownMenuItem
              onClick={handleLogout}
              style={{
                cursor: 'pointer',
                color: '#ef4444',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 13,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 10px',
                borderRadius: 4,
              }}
            >
              <LogOut size={13} />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
