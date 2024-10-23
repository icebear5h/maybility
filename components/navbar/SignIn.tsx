"use client"

import { signIn } from "../../lib/auth"
 
export function SignIn() {
  return (
    <form
      action={async () => {
        await signIn()
      }}
    >
      <button type="submit">Sign in</button>
    </form>
  )
}