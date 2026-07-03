import { SignIn } from '@clerk/react'
import { POST_LOGIN_REDIRECT } from '@/app'

export function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <SignIn fallbackRedirectUrl={POST_LOGIN_REDIRECT} />
    </div>
  )
}
