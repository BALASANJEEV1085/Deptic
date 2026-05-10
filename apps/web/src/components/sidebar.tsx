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
import { LayoutDashboard, Folder, ShieldAlert, FileText, Settings, LogOut, ScanSearch, ChevronRight, Search, PlusCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Projects', href: '/dashboard/projects', icon: Folder },
  { name: 'Scans', href: '/dashboard/scans', icon: ScanSearch },
  { name: 'Vulnerabilities', href: '/dashboard/vulnerabilities', icon: ShieldAlert },
  { name: 'Reports', href: '/dashboard/reports', icon: FileText },
]

export function Sidebar() {
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
      .catch(err => console.error("Failed to fetch vulnerabilities for sidebar:", err))
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="flex h-screen w-64 flex-col border-r border-white/[0.04] bg-[hsl(var(--sidebar-bg))] text-zinc-400">
      {/* Team/Org Selector (Linear Style) */}
      <div className="flex h-14 items-center px-4 mb-2">
        <div className="flex items-center gap-3 rounded-md p-1.5 hover:bg-white/5 transition-colors cursor-pointer w-full group">
          <svg width="24" height="24" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white flex-shrink-0">
            <path d="M60 30L90 60" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M90 60L60 90" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M60 90L30 60" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M30 60L60 30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <g transform="translate(48, 18)"><path d="M12 2L22 7L12 12L2 7L12 2Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /><path d="M22 7V17L12 22V12L22 7Z" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /><path d="M2 7V17L12 22V12L2 7Z" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /></g>
            <g transform="translate(78, 48)"><path d="M12 2L22 7L12 12L2 7L12 2Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /><path d="M22 7V17L12 22V12L22 7Z" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /><path d="M2 7V17L12 22V12L2 7Z" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /></g>
            <g transform="translate(48, 78)"><path d="M12 2L22 7L12 12L2 7L12 2Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /><path d="M22 7V17L12 22V12L22 7Z" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /><path d="M2 7V17L12 22V12L2 7Z" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /></g>
            <g transform="translate(18, 48)"><path d="M12 2L22 7L12 12L2 7L12 2Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /><path d="M22 7V17L12 22V12L22 7Z" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /><path d="M2 7V17L12 22V12L2 7Z" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /></g>
          </svg>
          <span className="text-sm font-semibold tracking-tight text-zinc-100 flex-1 truncate">SBOM.io Workspace</span>
          <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
        </div>
      </div>

      {/* Global Actions */}
      <div className="px-4 mb-6 space-y-1">
        <div className="flex items-center gap-3 px-2 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02] rounded-md cursor-pointer transition-all">
          <Search className="h-3.5 w-3.5" />
          <span>Quick Search</span>
          <span className="ml-auto text-[10px] opacity-30 font-mono">⌘K</span>
        </div>
        <Link href="/dashboard/projects/new" className="flex items-center gap-3 px-2 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02] rounded-md cursor-pointer transition-all">
          <PlusCircle className="h-3.5 w-3.5" />
          <span>New Scan</span>
        </Link>
      </div>
      
      {/* Navigation */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 mb-2">
           <p className="px-2 mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">Main</p>
           <nav className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-md px-2 py-1.5 text-[13px] font-medium transition-all duration-200",
                    isActive 
                      ? "bg-white/[0.05] text-zinc-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]" 
                      : "hover:bg-white/[0.03] hover:text-zinc-200"
                  )}
                >
                  <Icon className={cn(
                    "h-3.5 w-3.5 transition-colors",
                    isActive ? "text-indigo-400" : "text-zinc-500 group-hover:text-zinc-300"
                  )} />
                  <span className="flex-1">{item.name}</span>
                  {item.name === 'Vulnerabilities' && hasCritical && (
                    <span className="h-1 w-1 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse" />
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="px-4 mt-6">
           <p className="px-2 mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">Configuration</p>
           <nav className="space-y-0.5">
              <Link
                href="/dashboard/settings"
                className={cn(
                  "group flex items-center gap-3 rounded-md px-2 py-1.5 text-[13px] font-medium transition-all duration-200",
                  pathname === '/dashboard/settings' 
                    ? "bg-white/[0.05] text-zinc-100" 
                    : "hover:bg-white/[0.03] hover:text-zinc-200"
                )}
              >
                <Settings className="h-3.5 w-3.5 text-zinc-500 group-hover:text-zinc-300" />
                <span className="flex-1">Settings</span>
              </Link>
           </nav>
        </div>
      </div>

      {/* User / Footer */}
      <div className="p-4 mt-auto border-t border-white/[0.04]">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-lg p-1 hover:bg-white/5 transition-all outline-none group">
            <Avatar className="h-7 w-7 border border-white/10">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-indigo-500/10 text-indigo-400 text-[10px]">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start overflow-hidden flex-1">
              <span className="text-[11px] font-bold text-zinc-200 truncate w-full">
                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Security User'}
              </span>
              <span className="text-[9px] text-zinc-600 truncate w-full">
                Personal Workspace
              </span>
            </div>
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/40 mr-1" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-[#0c0d0e] border-white/10 text-zinc-400 shadow-2xl" align="end" side="right" sideOffset={10}>
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
