"use client"

import type React from "react"

import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { UserMenu } from "@/components/navbar/user-menu"
import { ChatbotPanel } from "@/components/chatbot/chatbot-panel"
import { ChatbotProvider } from "@/components/chatbot/chatbot-context"

const navItems = [
  { href: "/", label: "Home" },
  { href: "/journal", label: "Journal" },
  { href: "/calendar", label: "Calendar" },
  { href: "/goals", label: "Goals" }, // Added Goals navigation item
]

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session, status } = useSession()

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
              <Link key={item.href} href={item.href} className={`nav-item ${pathname === item.href ? "active" : ""}`}>
                {item.label}
              </Link>
            ))}
          </div>
          {status !== "loading" && <UserMenu session={session} />}
        </div>
      </nav>

      <div className="relative">
        <div className="main-content">{children}</div>

        <div className="fixed bottom-4 right-4 z-50">
          <ChatbotPanel session={session} />
        </div>
      </div>
    </div>
  )
}

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ChatbotProvider>
      <LayoutContent>{children}</LayoutContent>
    </ChatbotProvider>
  )
}
