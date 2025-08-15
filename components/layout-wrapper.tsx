"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"

const navItems = [
  { href: "/", label: "Home" },
  { href: "/journal", label: "Journal" },
  { href: "/calendar", label: "Calendar" },
]

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div>
      {/* Horizontal Navbar */}
      <nav className="navbar">
        <div className="navbar-content">
          <Link href="/" className="navbar-brand">
            JournalApp
          </Link>
          <div className="navbar-nav">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${pathname === item.href ? 'active' : ''}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <div style={{ display: 'flex' }}>
        {/* Main Content */}
        <div style={{ flex: 1, marginRight: '280px' }}>
          <div className="main-content">
            {children}
          </div>
        </div>

        {/* Chatbot Panel */}
        <div className="chatbot">
          <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #e0e0e0' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1a1a1a' }}>
              AI Assistant
            </h3>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ 
              background: '#f8f8f8', 
              padding: '12px', 
              borderRadius: '4px', 
              marginBottom: '12px',
              border: '1px solid #e0e0e0'
            }}>
              <strong style={{ color: '#333', fontSize: '13px' }}>AI:</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#666' }}>
                Welcome! How can I help you with your journaling today?
              </p>
            </div>
            <div style={{ 
              background: '#f8f8f8', 
              padding: '12px', 
              borderRadius: '4px',
              border: '1px solid #e0e0e0',
              marginLeft: '20px'
            }}>
              <strong style={{ color: '#333', fontSize: '13px' }}>You:</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#666' }}>
                Help me brainstorm ideas for today's entry.
              </p>
            </div>
          </div>
          <div style={{ marginTop: 'auto' }}>
            <textarea
              placeholder="Type your message..."
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d0d0d0',
                borderRadius: '4px',
                resize: 'none',
                fontSize: '13px',
                fontFamily: 'inherit',
                background: 'white'
              }}
              rows={3}
            />
            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '8px', fontSize: '13px' }}
            >
              Send Message
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
