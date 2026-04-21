import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/shadcn/dropdown-menu'
import { SidebarMenuButton } from '@/components/shadcn/sidebar'
import { useClerk, useUser } from '@clerk/react'
import { EnvelopeIcon, SignOutIcon, UserIcon } from '@phosphor-icons/react'
import microsoftLogo from '@/assets/microsoft.svg'

export function UserMenuButton() {
  const { user } = useUser()
  const { signOut } = useClerk()

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User'
  const email = user?.primaryEmailAddress?.emailAddress ?? ''
  const isMicrosoft = user?.externalAccounts.some(a => a.provider === 'microsoft')

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
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {isMicrosoft ? (
              <>Signed in via Microsoft <img src={microsoftLogo} alt="Microsoft" className="size-3" /></>
            ) : (
              <>Signed in via Email <EnvelopeIcon aria-hidden="true" className="size-3" /></>
            )}
          </span>
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
