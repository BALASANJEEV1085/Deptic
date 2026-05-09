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
import { LayoutDashboard, Folder, ShieldAlert, FileText, Settings, LogOut, ScanSearch } from 'lucide-react'

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Projects', href: '/dashboard/projects', icon: Folder },
  { name: 'Scans', href: '/dashboard/scans', icon: ScanSearch },
  { name: 'Vulnerabilities', href: '/dashboard/vulnerabilities', icon: ShieldAlert },
  { name: 'Reports', href: '/dashboard/reports', icon: FileText },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
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
    
    // Fetch vulnerability status
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
    <div className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="flex h-16 items-center px-6 border-b border-transparent">
        <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">SBOM.io</span>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors justify-between ${
                  isActive
                    ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center">
                  <Icon className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`} />
                  {item.name}
                </div>
                {item.name === 'Vulnerabilities' && hasCritical && (
                  <span className="h-2 w-2 rounded-full bg-red-500 shadow-sm animate-pulse"></span>
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="border-t border-gray-200 p-4 dark:border-gray-800">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center rounded-md p-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors outline-none focus:ring-2 focus:ring-ring">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback>{user?.email?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <div className="ml-3 flex flex-col text-left">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 w-32 truncate">
                {user?.email || 'Loading...'}
              </span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <div className="px-2 py-1.5 font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none text-gray-900 dark:text-white">{user?.user_metadata?.full_name || user?.email?.split('@')[0]}</p>
                <p className="text-xs leading-none text-gray-500 dark:text-gray-400">{user?.email}</p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
