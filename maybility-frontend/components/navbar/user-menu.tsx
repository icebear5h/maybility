"use client"
import { Settings, LogOut } from "lucide-react"
import { signOut } from "next-auth/react"
import type { Session } from "next-auth"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

type UserMenuProps = {
  session: Session | null
}

export function UserMenu({ session }: UserMenuProps) {
  if (!session?.user) {
    return (
      <Button asChild size="sm">
        <a href="/auth/signin">Sign In</a>
      </Button>
    )
  }

  const handleSignOut = () => signOut({ callbackUrl: "/" })
  const userInitials = session.user.name
    ? session.user.name.split(" ").map((n) => n[0]).join("").toUpperCase()
    : "U"

  return (
    <DropdownMenu>
      {/* Make the TRIGGER the clickable thing */}
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative h-8 w-8 rounded-full focus:outline-none"
          aria-label="User menu"
        >
          {/* Ensure inner avatar doesn't intercept clicks */}
          <Avatar className="h-8 w-8 pointer-events-none select-none">
            <AvatarImage src={session.user.image || ""} alt={session.user.name || "User"} />
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      {/* High z-index so it isn't hidden behind headers */}
      <DropdownMenuContent className="w-56 z-[100]" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{session.user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">{session.user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
