"use client";

import { Button } from '@/components/ui/button'
import { Plus, Folder, Search, Filter, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ProjectsPage() {
  return (
    <div className="space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Inventory</h1>
          <p className="text-sm text-zinc-500">
            Authenticated repositories and mapped projects.
          </p>
        </div>
        <div className="flex gap-3">
           <Button variant="outline" className="border-white/10 text-zinc-400 hover:bg-white/5">
             <Filter className="mr-2 h-4 w-4" />
             Filter
           </Button>
           <Button className="bg-white text-black hover:bg-zinc-200">
             <Plus className="mr-2 h-4 w-4" />
             Integrate Project
           </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
          <Input 
            placeholder="Search projects..." 
            className="bg-white/[0.02] border-white/10 pl-10 text-sm h-10"
            disabled
          />
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-white/10 p-24 text-center flex flex-col items-center justify-center bg-white/[0.01]">
        <div className="h-16 w-16 rounded-2xl bg-white/[0.03] flex items-center justify-center mb-6 border border-white/5 shadow-inner">
          <Folder className="h-8 w-8 text-zinc-600" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">No active projects</h3>
        <p className="text-sm text-zinc-500 max-w-sm mb-10">
          Connect your version control provider or upload an artifact to begin supply chain analysis.
        </p>
        <Button className="bg-indigo-600 hover:bg-indigo-500 text-white border-0 shadow-[0_0_20px_rgba(79,70,229,0.2)]">
          <Plus className="mr-2 h-4 w-4" />
          Connect Repository
        </Button>
      </div>
    </div>
  )
}

function Input({ className, ...props }: any) {
  return (
    <input
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}
