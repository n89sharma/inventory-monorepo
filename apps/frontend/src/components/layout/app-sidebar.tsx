import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarGroupContent,
  SidebarMenuButton,
  SidebarRail
} from "@/components/shadcn/sidebar"
import { ChartLineUpIcon, InvoiceIcon, LineSegmentsIcon, LockOpenIcon, MagnifyingGlassIcon, StackIcon, TruckTrailerIcon, UserIcon, WarehouseIcon } from "@phosphor-icons/react"
import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useNavigationStore } from '@/data/store/navigation-store'
import { isNavigationSection, type NavigationSection } from "@/ui-types/navigation-context"

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

export function AppSidebar(): React.JSX.Element {
  const location = useLocation()
  const lastPaths = useNavigationStore(state => state.lastPaths)
  const clearLastPath = useNavigationStore(state => state.clearLastPath)

  useEffect(() => {
    if (isNavigationSection(location.pathname.slice(1))) {
      clearLastPath(location.pathname.slice(1) as NavigationSection)
    }
  }, [location.pathname])

  return (
    <Sidebar collapsible="icon">

      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex flex-row gap-2">
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <StackIcon aria-hidden="true" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Shiva Exports Ltd</span>
                <span className="truncate text-xs">Inventory</span>
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>

      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {
                sidebarItems.map((item) => {
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
                })
              }
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <UserIcon aria-hidden="true" /> Username
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar >
  )
}