import { SignIn } from '@clerk/react'

const POST_LOGIN_REDIRECT = '/'

export function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <SignIn fallbackRedirectUrl={POST_LOGIN_REDIRECT} />
    </div>
  )
}
