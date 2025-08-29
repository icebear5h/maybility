import Link from "next/link"
import { LayoutWrapper } from "@/components/navbar/layout-wrapper"

export default function HomePage() {
  return (
    <LayoutWrapper>
      <div
        style={{
          textAlign: "center",
          padding: "2rem 0",
          maxWidth: "800px",
          margin: "0 auto",
          marginRight: "auto", // Override the main-content margin-right: 320px
        }}
      >
        <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem", color: "#1a1a1a" }}>Welcome to JournalApp</h1>
        <p style={{ fontSize: "1.125rem", color: "#666", marginBottom: "3rem", lineHeight: "1.6" }}>
          Your comprehensive digital space for journaling, planning, and organizing your thoughts with AI assistance.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem" }}>
          <div className="card">
            <h2 style={{ fontSize: "1.25rem", color: "#1a1a1a", marginBottom: "1rem" }}>Journal</h2>
            <p style={{ color: "#666", marginBottom: "1.5rem", fontSize: "14px" }}>
              Free-form writing with rich text formatting, tables, and markdown support
            </p>
            <Link href="/journal" className="btn btn-primary" style={{ width: "100%" }}>
              Start Writing
            </Link>
          </div>

          <div className="card">
            <h2 style={{ fontSize: "1.25rem", color: "#1a1a1a", marginBottom: "1rem" }}>Calendar</h2>
            <p style={{ color: "#666", marginBottom: "1.5rem", fontSize: "14px" }}>
              Organize your schedule with draggable events and intuitive planning
            </p>
            <Link href="/calendar" className="btn" style={{ width: "100%" }}>
              View Calendar
            </Link>
          </div>
        </div>
      </div>
    </LayoutWrapper>
  )
}
