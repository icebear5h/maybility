"use client"

import { useState } from "react"
import { X } from "lucide-react"
import type { RecurrenceEditType } from "@/types/calendar-types"

interface RecurrenceEditModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (editType: RecurrenceEditType) => void
  eventTitle: string
  isDeleting?: boolean
}

export function RecurrenceEditModal({
  isOpen,
  onClose,
  onConfirm,
  eventTitle,
  isDeleting = false,
}: RecurrenceEditModalProps) {
  const [selectedOption, setSelectedOption] = useState<RecurrenceEditType>("this")

  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm(selectedOption)
    onClose()
  }

  const actionText = isDeleting ? "delete" : "edit"
  const actionTitle = isDeleting ? "Delete recurring event" : "Edit recurring event"

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-[1100]" onClick={onClose} />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl z-[1101] w-[400px] max-w-[90vw]">
        <div className="flex items-center justify-between p-4 border-b border-stone-200">
          <h3 className="text-lg font-semibold text-stone-900">{actionTitle}</h3>
          <button onClick={onClose} className="p-1 hover:bg-stone-100 rounded transition-colors">
            <X className="h-5 w-5 text-stone-500" />
          </button>
        </div>

        <div className="p-4">
          <p className="text-sm text-stone-600 mb-4">
            "{eventTitle}" is a recurring event. How would you like to {actionText} it?
          </p>

          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="editType"
                value="this"
                checked={selectedOption === "this"}
                onChange={(e) => setSelectedOption(e.target.value as RecurrenceEditType)}
                className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-stone-300"
              />
              <div>
                <div className="text-sm font-medium text-stone-900">This event</div>
                <div className="text-xs text-stone-500">Only {actionText} this occurrence of the event</div>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="editType"
                value="following"
                checked={selectedOption === "following"}
                onChange={(e) => setSelectedOption(e.target.value as RecurrenceEditType)}
                className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-stone-300"
              />
              <div>
                <div className="text-sm font-medium text-stone-900">This and following events</div>
                <div className="text-xs text-stone-500">
                  {actionText === "edit" ? "Edit" : "Delete"} this and all future occurrences
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="editType"
                value="all"
                checked={selectedOption === "all"}
                onChange={(e) => setSelectedOption(e.target.value as RecurrenceEditType)}
                className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-stone-300"
              />
              <div>
                <div className="text-sm font-medium text-stone-900">All events</div>
                <div className="text-xs text-stone-500">
                  {actionText === "edit" ? "Edit" : "Delete"} all occurrences of this recurring event
                </div>
              </div>
            </label>
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
            onClick={handleConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${
              isDeleting ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isDeleting ? "Delete" : "OK"}
          </button>
        </div>
      </div>
    </>
  )
}
