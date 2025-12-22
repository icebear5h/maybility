"use client"

import { Button } from "@/components/ui/button"
import { FolderOpen, RefreshCw, Plus, ExternalLink } from "lucide-react"

interface WorkspaceHeaderProps {
  currentFolder: string | null
  onOpenInFinder?: () => void
  onRefresh: () => void
  onCreateFile: () => void
}

export function WorkspaceHeader({
  currentFolder,
  onOpenInFinder,
  onRefresh,
  onCreateFile
}: WorkspaceHeaderProps) {
  return (
    <div className="p-3 border-b border-border/50 space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium flex-1">Maybility Workspace</h2>
        {currentFolder && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onRefresh}
              title="Refresh"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onCreateFile}
              title="New File"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
            {onOpenInFinder && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onOpenInFinder}
                title="Open in Finder"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>

      {currentFolder && (
        <div className="text-xs text-muted-foreground truncate" title={currentFolder}>
          {currentFolder.split('/').pop()}
        </div>
      )}
    </div>
  )
}
