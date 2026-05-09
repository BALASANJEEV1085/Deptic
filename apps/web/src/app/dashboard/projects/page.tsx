import { Button } from '@/components/ui/button'
import { Plus, Folder } from 'lucide-react'

export default function ProjectsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Projects</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage your repositories and their associated SBOMs.
          </p>
        </div>
        <Button disabled>
          <Plus className="mr-2 h-4 w-4" />
          Add Project
        </Button>
      </div>

      <div className="mt-8 rounded-md border border-dashed border-gray-300 dark:border-gray-700 p-12 text-center flex flex-col items-center justify-center bg-gray-50/50 dark:bg-gray-800/50">
        <Folder className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">No projects yet</h3>
        <p className="mt-2 text-sm text-gray-500 max-w-sm">
          Get started by adding a project. You can connect a GitHub repository or upload an existing SBOM file directly.
        </p>
        <Button disabled className="mt-6" variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          Add your first project
        </Button>
      </div>
    </div>
  )
}
