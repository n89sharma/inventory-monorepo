import { UserMenuButton } from '@/components/custom/user-menu-button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/shadcn/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail
} from "@/components/shadcn/sidebar"
import { useNavigationStore } from '@/data/store/navigation-store'
import { useCan } from '@/hooks/use-can'
import { isNavigationSection, type NavigationSection } from "@/ui-types/navigation-context"
import {
  CaretDownIcon,
  ChartLineUpIcon,
  GearIcon,
  InvoiceIcon,
  LineSegmentsIcon,
  LockOpenIcon,
  MagnifyingGlassIcon,
  StackIcon,
  TruckTrailerIcon,
  WarehouseIcon
} from "@phosphor-icons/react"
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

const sidebarItems = [
  {
    title: "Arrivals",
    url: "/arrivals",
    icon: <WarehouseIcon aria-hidden="true" />
  },
  {
    title: "Transfers",
    url: "/transfers",
    icon: <LineSegmentsIcon aria-hidden="true" />
  },
  {
    title: "Departures",
    url: "/departures",
    icon: <TruckTrailerIcon aria-hidden="true" />
  },
  {
    title: "Holds",
    url: "/holds",
    icon: <LockOpenIcon aria-hidden="true" />
  },
  {
    title: "Invoices",
    url: "/invoices",
    icon: <InvoiceIcon aria-hidden="true" />
  },
  {
    title: "Search",
    url: "/search",
    icon: <MagnifyingGlassIcon aria-hidden="true" />
  },
  {
    title: "Reports",
    url: "/reports",
    icon: <ChartLineUpIcon aria-hidden="true" />
  }
]

const SETTINGS_SUB_ITEMS = [
  { title: 'Catalog', url: '/settings/catalog' },
  { title: 'Organizations', url: '/settings/organizations' },
]

const USER_PERMISSIONS_ITEM = { title: 'User Management', url: '/settings/user-permissions' }

export function AppSidebar(): React.JSX.Element {
  const location = useLocation()
  const lastPaths = useNavigationStore(state => state.lastPaths)
  const clearLastPath = useNavigationStore(state => state.clearLastPath)
  const canManageUsers = useCan('manage_users')
  const isSettingsActive = location.pathname.startsWith('/settings')
  const [settingsOpen, setSettingsOpen] = useState(isSettingsActive)

  useEffect(() => {
    if (isNavigationSection(location.pathname.slice(1))) {
      clearLastPath(location.pathname.slice(1) as NavigationSection)
    }
  }, [location.pathname])

  useEffect(() => {
    if (isSettingsActive) setSettingsOpen(true)
  }, [isSettingsActive])

  return (
    <Sidebar collapsible="icon">

      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex flex-row gap-2">
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <StackIcon aria-hidden="true" />
              </div>
              <div className="flex items-center">
                <span className="truncate font-medium">Shiva Exports Ltd</span>
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarItems.map((item) => {
                const section = item.url.slice(1)
                const resolvedUrl = isNavigationSection(section)
                  ? (lastPaths[section as NavigationSection] ?? item.url)
                  : item.url
                const isActive = location.pathname.startsWith(item.url)
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive ? true : undefined}>
                      <Link to={resolvedUrl}>
                        {item.icon}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
              <Collapsible
                open={settingsOpen}
                onOpenChange={setSettingsOpen}
                className="group/collapsible"
                asChild
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={isSettingsActive ? true : undefined}>
                      <GearIcon aria-hidden="true" />
                      <span>Settings</span>
                      <CaretDownIcon
                        className="ml-auto transition-transform group-data-[state=closed]/collapsible:rotate-90"
                        aria-hidden="true"
                      />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {SETTINGS_SUB_ITEMS.map(item => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton asChild isActive={location.pathname === item.url ? true : undefined}>
                            <Link to={item.url}>{item.title}</Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                      {canManageUsers && (
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            asChild
                            isActive={location.pathname === USER_PERMISSIONS_ITEM.url ? true : undefined}
                          >
                            <Link to={USER_PERMISSIONS_ITEM.url}>
                              {USER_PERMISSIONS_ITEM.title}
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <UserMenuButton />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
