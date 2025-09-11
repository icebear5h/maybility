import { ChevronLeft, ChevronRight } from "lucide-react"
import type { ViewType } from "@//types/calendar-types"

interface CalendarNavigationProps {
  dateRangeText: string
  onPrevPeriod: () => void
  onNextPeriod: () => void
  onToday: () => void
  view: ViewType
  onViewChange: (view: ViewType) => void
}

export function CalendarNavigation({
  dateRangeText,
  onPrevPeriod,
  onNextPeriod,
  onToday,
  view,
  onViewChange,
}: CalendarNavigationProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-white border-b border-stone-200">
      {/* Left side - Date navigation */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onPrevPeriod}
            className="p-2 hover:bg-stone-100 rounded-md transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={onNextPeriod}
            className="p-2 hover:bg-stone-100 rounded-md transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        
        <h2 className="text-lg font-semibold text-stone-900">
          {dateRangeText}
        </h2>
        
        <button
          onClick={onToday}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Today
        </button>
      </div>

      {/* Right side - View controls */}
      <div className="flex items-center gap-2">
        <div className="flex bg-stone-100 rounded-md p-1">
          {(['day', 'week', 'month'] as ViewType[]).map((viewType) => (
            <button
              key={viewType}
              onClick={() => onViewChange(viewType)}
              className={`px-3 py-1 text-sm rounded transition-colors capitalize ${
                view === viewType
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {viewType}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
