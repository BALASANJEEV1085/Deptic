"use client"

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { listWorkspaces, createWorkspace, type Workspace } from '@/lib/api'

const LS_KEY = 'sbom_active_workspace_id'

interface WorkspaceContextValue {
  workspaces: Workspace[]
  activeWorkspace: Workspace | null
  isLoading: boolean
  setActiveWorkspace: (ws: Workspace | null) => void
  refresh: () => Promise<void>
  createNew: (name: string, slug: string, description?: string) => Promise<Workspace>
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const data = await listWorkspaces()
      const list = data.workspaces || []
      setWorkspaces(list)

      // Restore persisted selection
      const savedId = typeof window !== 'undefined' ? localStorage.getItem(LS_KEY) : null
      if (savedId) {
        const found = list.find(w => w.id === savedId)
        if (found) {
          setActiveWorkspaceState(found)
          return
        }
      }
      // Default to personal workspace (first one)
      if (list.length > 0) {
        setActiveWorkspaceState(list[0])
        if (typeof window !== 'undefined') {
          localStorage.setItem(LS_KEY, list[0].id)
        }
      }
    } catch {
      // If workspace endpoints not ready, fail silently
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const setActiveWorkspace = useCallback((ws: Workspace | null) => {
    setActiveWorkspaceState(ws)
    if (typeof window !== 'undefined') {
      if (ws) {
        localStorage.setItem(LS_KEY, ws.id)
      } else {
        localStorage.removeItem(LS_KEY)
      }
    }
  }, [])

  const createNew = useCallback(async (name: string, slug: string, description?: string) => {
    const ws = await createWorkspace({ name, slug, description })
    await refresh()
    setActiveWorkspace(ws)
    return ws
  }, [refresh, setActiveWorkspace])

  return (
    <WorkspaceContext.Provider value={{ workspaces, activeWorkspace, isLoading, setActiveWorkspace, refresh, createNew }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider')
  return ctx
}
