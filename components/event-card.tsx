import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "@/lib/utils"
import type { CalendarEvent } from "@/lib/types"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"
import { GripVertical, Pencil, Copy, Trash2 } from 'lucide-react'

type EventCardProps = {
  event: CalendarEvent
}

const colorClasses = {
  green: "bg-accent-green/80 border-accent-green",
  terracotta: "bg-accent-terracotta/80 border-accent-terracotta",
  slate: "bg-accent-slate/80 border-accent-slate",
}

export function EventCard({ event }: EventCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.id,
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 100 : 10,
    boxShadow: isDragging ? "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)" : undefined,
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={setNodeRef}
          style={style}
          {...attributes}
          className={cn(
            "relative flex cursor-grab items-center rounded-[2px] border-l-4 bg-white p-1.5 text-sm shadow-soft transition-shadow",
            colorClasses[event.color],
            isDragging && "cursor-grabbing",
          )}
        >
          <div {...listeners} className="flex-grow">
            <p className="font-medium text-stone-800">{event.title}</p>
          </div>
          <GripVertical className="h-4 w-4 text-stone-400" />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48 rounded-sm">
        <ContextMenuItem>
          <Pencil className="mr-2 h-4 w-4" />
          <span>Edit</span>
        </ContextMenuItem>
        <ContextMenuItem>
          <Copy className="mr-2 h-4 w-4" />
          <span>Duplicate</span>
        </ContextMenuItem>
        <ContextMenuItem className="text-red-600">
          <Trash2 className="mr-2 h-4 w-4" />
          <span>Delete</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
