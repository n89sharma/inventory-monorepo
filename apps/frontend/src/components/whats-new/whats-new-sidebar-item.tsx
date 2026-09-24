import { SidebarMenuBadge, SidebarMenuButton } from '@/components/shadcn/sidebar'
import { WHATS_NEW_PATH } from '@/components/whats-new/whats-new-path'
import { useReleases } from '@/hooks/use-release'
import { SparkleIcon } from '@phosphor-icons/react'
import { Link, useLocation } from 'react-router-dom'

export function WhatsNewSidebarItem(): React.JSX.Element {
  const location = useLocation()
  const releases = useReleases()
  const unreadCount = releases.filter((release) => release.unread).length

  return (
    <>
      <SidebarMenuButton
        asChild
        tooltip="What's new"
        isActive={location.pathname === WHATS_NEW_PATH ? true : undefined}
      >
        <Link to={WHATS_NEW_PATH}>
          <SparkleIcon aria-hidden="true" />
          <span>What&apos;s new</span>
        </Link>
      </SidebarMenuButton>
      {unreadCount > 0 && (
        <SidebarMenuBadge className="group-data-[collapsible=icon]:right-1.5 group-data-[collapsible=icon]:flex">
          <span className="bg-primary size-2 rounded-full" aria-hidden="true" />
          <span className="sr-only">unread updates</span>
        </SidebarMenuBadge>
      )}
    </>
  )
}
