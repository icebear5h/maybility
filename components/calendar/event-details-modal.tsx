import { X, Trash2, Edit } from "lucide-react"
import type { Occurrence } from "@/types/calendar-types"

interface EventDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  event: Occurrence | null
  onDelete: (eventId: string) => void
}

export function EventDetailsModal({
  isOpen,
  onClose,
  event,
  onDelete,
}: EventDetailsModalProps) {
  if (!isOpen || !event) return null

  const handleDelete = () => {
    onDelete(event.id)
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[1000]"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl z-[1001] w-96 max-w-[90vw]">
        <div className="flex items-center justify-between p-4 border-b border-stone-200">
          <h3 className="text-lg font-semibold text-stone-900">Event Details</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-stone-100 rounded transition-colors"
          >
            <X className="h-5 w-5 text-stone-500" />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Title
            </label>
            <p className="text-stone-900 font-medium">{event.title}</p>
          </div>
          
          {event.description && (
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Description
              </label>
              <p className="text-stone-700">{event.description}</p>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Start Time
              </label>
              <p className="text-stone-900">
                {new Date(event.startUtc).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                End Time
              </label>
              <p className="text-stone-900">
                {new Date(event.endUtc).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Date
            </label>
            <p className="text-stone-900">
              {new Date(event.startUtc).toLocaleDateString([], { 
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Status
            </label>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              event.status === 'DONE' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {event.status}
            </span>
          </div>
        </div>
        
        <div className="flex justify-between p-4 border-t border-stone-200">
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 rounded-md transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
          
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 rounded-md transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
