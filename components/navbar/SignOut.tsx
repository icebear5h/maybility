"use client"

import { signOut } from "../../lib/auth"
 
export function SignOut() {
  return (
    <form
      action={async () => {
        await signOut()
      }}
    >
      <button type="submit">Sign Out</button>
    </form>
  )
}