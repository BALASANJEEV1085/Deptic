"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { getAllVulnerabilities } from '@/lib/api'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LayoutDashboard, Folder, ShieldAlert, FileText, Settings, LogOut, ScanSearch, ChevronRight, PlusCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { name: 'Dashboard',        href: '/dashboard',                icon: LayoutDashboard },
  { name: 'Projects',         href: '/dashboard/projects',       icon: Folder },
  { name: 'Scans',            href: '/dashboard/scans',          icon: ScanSearch },
  { name: 'Vulnerabilities',  href: '/dashboard/vulnerabilities', icon: ShieldAlert },
  { name: 'Reports',          href: '/dashboard/reports',        icon: FileText },
]

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [hasCritical, setHasCritical] = useState(false)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()

    getAllVulnerabilities()
      .then(res => {
        if (res.vulnerabilities?.some(v => v.severity === 'CRITICAL')) {
          setHasCritical(true)
        }
      })
      .catch(err => console.error('Failed to fetch vulnerabilities for sidebar:', err))
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="flex h-full w-full flex-col border-r border-white/[0.04] bg-[hsl(var(--sidebar-bg))] text-zinc-400">
      {/* Workspace Selector */}
      <div className="hidden md:flex h-14 items-center px-4 mb-2">
        <div className="flex items-center gap-3 rounded-md p-1.5 hover:bg-white/5 transition-colors cursor-pointer w-full group">
          <svg width="22" height="22" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#22c55e] flex-shrink-0">
            <path d="M60 30L90 60" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M90 60L60 90" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M60 90L30 60" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M30 60L60 30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <g transform="translate(48,18)"><path d="M12 2L22 7L12 12L2 7L12 2Z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /><path d="M22 7V17L12 22V12L22 7Z" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /><path d="M2 7V17L12 22V12L2 7Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /></g>
            <g transform="translate(78,48)"><path d="M12 2L22 7L12 12L2 7L12 2Z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /><path d="M22 7V17L12 22V12L22 7Z" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /><path d="M2 7V17L12 22V12L2 7Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /></g>
            <g transform="translate(48,78)"><path d="M12 2L22 7L12 12L2 7L12 2Z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /><path d="M22 7V17L12 22V12L22 7Z" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /><path d="M2 7V17L12 22V12L2 7Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /></g>
            <g transform="translate(18,48)"><path d="M12 2L22 7L12 12L2 7L12 2Z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /><path d="M22 7V17L12 22V12L22 7Z" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /><path d="M2 7V17L12 22V12L2 7Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /></g>
          </svg>
          <span className="text-sm font-semibold tracking-tight text-zinc-100 flex-1 truncate">SBOM.io Workspace</span>
          <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity" />
        </div>
      </div>

      {/* Initiate Scan shortcut */}
      <div className="px-4 mb-4 space-y-1">
        <Link
          href="/dashboard/projects/new"
          onClick={onClose}
          className="flex items-center gap-3 px-2 py-1.5 text-xs font-medium text-zinc-500 hover:text-[#22c55e] hover:bg-[#22c55e]/5 rounded-md cursor-pointer transition-all"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          <span>Initiate Scan</span>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto">
        {/* MAIN section */}
        <div className="px-4 mb-2">
          <p className="px-2 mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#4a5068]">Main</p>
          <nav className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-md px-2 py-1.5 text-[13px] font-medium transition-all duration-150',
                    isActive
                      ? 'bg-[#22c55e]/[0.08] text-zinc-100'
                      : 'hover:bg-white/[0.03] hover:text-zinc-200 text-zinc-500'
                  )}
                >
                  {/* Green left-border indicator for active item */}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full bg-[#22c55e] shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                  )}
                  <Icon className={cn(
                    'h-3.5 w-3.5 transition-colors ml-1',
                    isActive ? 'text-[#22c55e]' : 'text-zinc-500 group-hover:text-zinc-300'
                  )} />
                  <span className="flex-1">{item.name}</span>
                  {item.name === 'Vulnerabilities' && hasCritical && (
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse" />
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* CONFIGURATION section */}
        <div className="px-4 mt-5">
          <p className="px-2 mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#4a5068]">Configuration</p>
          <nav className="space-y-0.5">
            <Link
              href="/dashboard/settings"
              onClick={onClose}
              className={cn(
                'group relative flex items-center gap-3 rounded-md px-2 py-1.5 text-[13px] font-medium transition-all duration-150',
                pathname === '/dashboard/settings'
                  ? 'bg-[#22c55e]/[0.08] text-zinc-100'
                  : 'hover:bg-white/[0.03] hover:text-zinc-200 text-zinc-500'
              )}
            >
              {pathname === '/dashboard/settings' && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full bg-[#22c55e]" />
              )}
              <Settings className="h-3.5 w-3.5 text-zinc-500 group-hover:text-zinc-300 ml-1" />
              <span className="flex-1">Settings</span>
            </Link>
          </nav>
        </div>
      </div>

      {/* User Footer */}
      <div className="p-4 mt-auto border-t border-white/[0.04]">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-lg p-1.5 hover:bg-white/5 transition-all outline-none group">
            <Avatar className="h-7 w-7 border border-white/10 shrink-0">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-[#22c55e]/10 text-[#22c55e] text-[10px]">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start overflow-hidden flex-1">
              <span className="text-[11px] font-bold text-zinc-200 truncate w-full">
                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Security User'}
              </span>
              <span className="text-[9px] text-zinc-600 truncate w-full">Personal Workspace</span>
            </div>
            <div className="h-1.5 w-1.5 rounded-full bg-[#22c55e]/50 mr-1 shrink-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 bg-[#0c0d0e] border-white/10 text-zinc-400 shadow-2xl p-2" align="start" side="top" sideOffset={12}>
            <div className="px-2 py-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Account</p>
              <p className="text-xs font-medium text-zinc-200 truncate">{user?.email}</p>
            </div>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-400 focus:bg-red-500/10 focus:text-red-400 rounded-md">
              <LogOut className="mr-2 h-3.5 w-3.5" />
              <span className="text-xs font-medium">Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
