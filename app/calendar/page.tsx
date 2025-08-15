import { LayoutWrapper } from "@/components/layout-wrapper"
import { CalendarView } from "@/components/calendar-view"

export default function CalendarPage() {
  return (
    <LayoutWrapper>
      <div>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#1a1a1a' }}>Calendar</h1>
          <p style={{ fontSize: '1rem', color: '#666' }}>
            Organize your schedule with a draggable interface.
          </p>
        </div>
        <CalendarView />
      </div>
    </LayoutWrapper>
  )
}
