"use client"

import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Chrome } from "lucide-react"

export function SignInForm() {
  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: "/" })
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Welcome to Journal & AI</CardTitle>
        <CardDescription>Sign in to access your personal journal and AI conversations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleGoogleSignIn} className="w-full gap-2" size="lg">
          <Chrome className="h-5 w-5" />
          Continue with Google
        </Button> 
        <p className="text-xs text-center text-muted-foreground">
          By signing in, you agree to our terms of service and privacy policy.
        </p>
      </CardContent>
    </Card>
  )
}
