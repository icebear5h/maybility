"use client"

import { Folder, FileText, Trash2, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import type { Node } from "@/lib/types"

interface ArchiveViewProps {
  archivedNodes: Node[]
  onRestore: (node: Node) => void
  onDeleteRequest: (node: Node) => void
}

export function ArchiveView({ archivedNodes, onRestore, onDeleteRequest }: ArchiveViewProps) {
  if (archivedNodes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Trash2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Archive is empty</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Deleted items will appear here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="divide-y divide-border/50">
        {archivedNodes.map((node) => (
          <div
            key={node.id}
            className="flex items-center gap-4 px-6 py-3 hover:bg-muted/30 transition-colors group"
          >
            {/* Icon */}
            <div className="text-muted-foreground/50">
              {node.type === "folder" ? (
                <Folder className="h-5 w-5" />
              ) : (
                <FileText className="h-5 w-5" />
              )}
            </div>

            {/* Name and date */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-muted-foreground truncate">
                {node.name}
              </p>
              {node.archivedAt && (
                <p className="text-xs text-muted-foreground/50">
                  Archived {format(new Date(node.archivedAt), "MMM d, yyyy")}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => onRestore(node)}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Restore
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => onDeleteRequest(node)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
