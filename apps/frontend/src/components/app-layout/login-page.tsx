import { SignIn } from '@clerk/react'

export function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <SignIn fallbackRedirectUrl="/arrivals" />
    </div>
  )
}
