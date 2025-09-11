import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "@/lib/utils"
import type { Occurrence } from "@//types/calendar-types"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"
import { GripVertical, Pencil, Copy, Trash2 } from "lucide-react"

type EventCardProps = {
  event: Occurrence
  compact?: boolean
  detailed?: boolean
  timeBased?: boolean
  style?: React.CSSProperties
  onMouseDown?: (e: React.MouseEvent, eventId: string, type: "move" | "resize-start" | "resize-end", date: string) => void
  onEventClick?: (event: Occurrence) => void
  hasDragged?: boolean
  date?: Date
  showResizeHandles?: boolean
  isDragging?: boolean
}

const colorClasses = {
  green: "bg-accent-green/80 border-accent-green",
  terracotta: "bg-accent-terracotta/80 border-accent-terracotta",
  slate: "bg-accent-slate/80 border-accent-slate",
  blue: "bg-blue-500/80 border-blue-500",
  red: "bg-red-500/80 border-red-500",
  purple: "bg-purple-500/80 border-purple-500",
}

export function EventCard({ 
  event, 
  compact = false, 
  detailed = false, 
  timeBased = false,
  style,
  onMouseDown,
  onEventClick,
  hasDragged = false,
  date,
  showResizeHandles = false,
  isDragging = false
}: EventCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: event.id,
  })

  const dragStyle = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 1000 : 10,
    boxShadow: isDragging ? "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)" : undefined,
    ...style
  }

  // For time-based views (day/week), use absolute positioning
  if (timeBased) {
    return (
      <div
        ref={setNodeRef}
        style={{
          backgroundColor: event.color || "#3b82f6",
          color: "white",
          ...dragStyle
        }}
        {...attributes}
        className={cn(
          "absolute rounded px-2 py-1 text-xs font-medium cursor-grab group",
          "hover:shadow-sm transition-shadow duration-150 border border-transparent hover:border-white/30",
          isDragging && "opacity-50 cursor-grabbing"
        )}
        onClick={(e) => {
          e.stopPropagation()
          if (!hasDragged) {
            onEventClick?.(event)
          }
        }}
        onMouseDown={(e) => {
          e.stopPropagation()
          onMouseDown?.(e, event.id, "move", date ? new Date(date).toISOString().split('T')[0] : "")
        }}
      >
        {/* Main content area */}
        <div {...listeners} className="relative z-10">
          <div className="truncate">{event.title}</div>
          {event.startUtc && (
            <div className="text-xs opacity-90">
              {new Date(event.startUtc).toLocaleTimeString([], { 
                hour: 'numeric', 
                minute: '2-digit' 
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (compact) {
    return (
      <div
        ref={setNodeRef}
        style={dragStyle}
        {...attributes}
        {...listeners}
        className={cn(
          "cursor-grab rounded-sm border-l-2 bg-white px-1 py-0.5 text-xs shadow-sm transition-shadow",
          colorClasses[event.color as keyof typeof colorClasses] || colorClasses.blue,
          isDragging && "cursor-grabbing",
        )}
      >
        <p className="truncate font-medium text-stone-800">{event.title}</p>
      </div>
    )
  }

  if (detailed) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            ref={setNodeRef}
            style={dragStyle}
            {...attributes}
            className={cn(
              "relative flex cursor-grab flex-col rounded border-l-4 bg-white p-2 shadow-soft transition-shadow",
              colorClasses[event.color as keyof typeof colorClasses] || colorClasses.blue,
              isDragging && "cursor-grabbing",
            )}
          >
            <div {...listeners} className="flex-grow">
              <p className="font-semibold text-stone-800">{event.title}</p>
              <p className="text-xs text-stone-600">
                {event.startUtc} - {event.endUtc}
              </p>
            </div>
            <GripVertical className="absolute right-1 top-1 h-3 w-3 text-stone-400" />
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

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={setNodeRef}
          style={dragStyle}
          {...attributes}
          className={cn(
            "relative flex cursor-grab items-center rounded-[2px] border-l-4 bg-white p-1.5 text-sm shadow-soft transition-shadow",
            colorClasses[event.color as keyof typeof colorClasses] || colorClasses.blue,
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
