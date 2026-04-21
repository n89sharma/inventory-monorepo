import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/shadcn/dropdown-menu'
import { SidebarMenuButton } from '@/components/shadcn/sidebar'
import { useClerk, useUser } from '@clerk/react'
import { SignOutIcon, UserIcon } from '@phosphor-icons/react'

export function UserMenuButton() {
  const { user } = useUser()
  const { signOut } = useClerk()

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User'
  const email = user?.primaryEmailAddress?.emailAddress ?? ''
  const microsoftAccount = user?.externalAccounts.find(a => a.provider === 'microsoft')
  const signInMethod = microsoftAccount ? 'Microsoft' : 'Email'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton>
          <UserIcon aria-hidden="true" />
          <div className="flex flex-col text-left leading-tight">
            <span className="truncate text-sm font-medium">{displayName}</span>
            <span className="truncate text-xs text-muted-foreground">{email}</span>
          </div>
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuLabel className="flex flex-col leading-tight">
          <span className="text-xs text-muted-foreground">Signed in via {signInMethod}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut({ redirectUrl: '/login' })}>
          <SignOutIcon aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
