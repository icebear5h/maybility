import { ChevronDown, Filter, X } from "lucide-react"
import type { ViewType } from "@/types/calendar-types"

interface Goal {
  id: string
  title: string
  color: string
}

interface CalendarNavigationProps {
  dateRangeText: string
  onPrevPeriod: () => void
  onNextPeriod: () => void
  onToday: () => void
  view: ViewType
  onViewChange: (view: ViewType) => void
  goals: Goal[]
  selectedGoalIds: string[]
  onGoalSelectionChange: (goalIds: string[]) => void
  showGoalDropdown: boolean
  onToggleGoalDropdown: () => void
}

export function CalendarNavigation({
  dateRangeText,
  onPrevPeriod,
  onNextPeriod,
  onToday,
  view,
  onViewChange,
  goals,
  selectedGoalIds,
  onGoalSelectionChange,
  showGoalDropdown,
  onToggleGoalDropdown,
}: CalendarNavigationProps) {
  const handleGoalToggle = (goalId: string) => {
    const newSelection = selectedGoalIds.includes(goalId)
      ? selectedGoalIds.filter(id => id !== goalId)
      : [...selectedGoalIds, goalId]
    onGoalSelectionChange(newSelection)
  }

  const clearGoalFilter = () => {
    onGoalSelectionChange([])
    onToggleGoalDropdown()
  }

  return (
    <div className="flex items-center justify-between p-4 border-b border-stone-200 bg-white">
      {/* Left side - Navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToday}
          className="px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 rounded-md transition-colors"
        >
          Today
        </button>
        <div className="flex">
          <button
            onClick={onPrevPeriod}
            className="p-1.5 text-stone-600 hover:bg-stone-100 rounded-l-md transition-colors"
          >
            ‹
          </button>
          <button
            onClick={onNextPeriod}
            className="p-1.5 text-stone-600 hover:bg-stone-100 rounded-r-md transition-colors"
          >
            ›
          </button>
        </div>
      </div>

      {/* Center - Date range and view selector */}
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-semibold text-stone-900">{dateRangeText}</h2>
        
        <div className="flex bg-stone-100 rounded-lg p-1">
          {(["month", "week", "day"] as ViewType[]).map((viewType) => (
            <button
              key={viewType}
              onClick={() => onViewChange(viewType)}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors capitalize ${
                view === viewType
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              {viewType}
            </button>
          ))}
        </div>
      </div>

      {/* Right side - Goal filter */}
      <div className="relative">
        <button
          onClick={onToggleGoalDropdown}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            selectedGoalIds.length > 0
              ? "bg-blue-600 text-white"
              : "text-stone-700 hover:bg-stone-100"
          }`}
        >
          <Filter className="h-4 w-4" />
          {selectedGoalIds.length > 0
            ? `${selectedGoalIds.length} Goal${selectedGoalIds.length > 1 ? "s" : ""} Selected`
            : "Filter by Goals"}
          <ChevronDown className="h-4 w-4" />
        </button>

        {showGoalDropdown && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={onToggleGoalDropdown}
            />
            
            {/* Dropdown */}
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-stone-200 z-20">
              <div className="p-3 border-b border-stone-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-stone-900">Filter by Goals</span>
                  {selectedGoalIds.length > 0 && (
                    <button
                      onClick={clearGoalFilter}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>
              
              <div className="max-h-64 overflow-y-auto">
                {goals.map((goal) => (
                  <label
                    key={goal.id}
                    className="flex items-center gap-3 p-3 hover:bg-stone-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedGoalIds.includes(goal.id)}
                      onChange={() => handleGoalToggle(goal.id)}
                      className="w-4 h-4 text-blue-600 rounded border-stone-300 focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: goal.color }}
                      />
                      <span className="text-sm text-stone-900">{goal.title}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
