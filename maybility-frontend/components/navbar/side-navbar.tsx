"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookText, CalendarDays, LayoutDashboard, Home, Target } from "lucide-react"

const navLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/journal", label: "Journal", icon: BookText },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/goals", label: "Goals", icon: Target },
]

export function SideNavbar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-8 flex items-center gap-3 px-2">
        <LayoutDashboard className="h-8 w-8 text-blue-600" />
        <h1 className="text-2xl font-bold text-slate-800">JournalApp</h1>
      </div>
      <nav className="flex flex-col gap-1">
        {navLinks.map((link) => {
          const isActive = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-3 text-slate-700 transition-all hover:bg-slate-100 hover:text-slate-900 ${
                isActive ? "bg-blue-50 font-semibold text-blue-700 shadow-sm" : ""
              }`}
            >
              <link.icon className="h-5 w-5" />
              <span>{link.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
