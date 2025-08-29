import { X } from "lucide-react"

interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: string
  newEventTitle: string
  setNewEventTitle: (title: string) => void
  newEventStartTime: string
  setNewEventStartTime: (time: string) => void
  newEventEndTime: string
  setNewEventEndTime: (time: string) => void
  onCreateEvent: () => void
}

export function EventModal({
  isOpen,
  onClose,
  selectedDate,
  newEventTitle,
  setNewEventTitle,
  newEventStartTime,
  setNewEventStartTime,
  newEventEndTime,
  setNewEventEndTime,
  onCreateEvent,
}: EventModalProps) {
  if (!isOpen) return null

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
          <h3 className="text-lg font-semibold text-stone-900">Create Event</h3>
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
              Date
            </label>
            <input
              type="text"
              value={selectedDate}
              disabled
              className="w-full px-3 py-2 border border-stone-300 rounded-md bg-stone-50 text-stone-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={newEventTitle}
              onChange={(e) => setNewEventTitle(e.target.value)}
              placeholder="Event title"
              className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={newEventStartTime}
                onChange={(e) => setNewEventStartTime(e.target.value)}
                step="300"
                className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                End Time
              </label>
              <input
                type="time"
                value={newEventEndTime}
                onChange={(e) => setNewEventEndTime(e.target.value)}
                step="300"
                className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 p-4 border-t border-stone-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onCreateEvent}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
          >
            Create Event
          </button>
        </div>
      </div>
    </>
  )
}
