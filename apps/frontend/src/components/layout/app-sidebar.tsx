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
import { useCan } from '@/hooks/use-can'
import {
  CaretDownIcon,
  ChartLineUpIcon,
  GearIcon,
  InvoiceIcon,
  LineSegmentsIcon,
  LockOpenIcon,
  MagnifyingGlassIcon,
  StackIcon,
  ToolboxIcon,
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
    title: "Store",
    url: "/store",
    icon: <ToolboxIcon aria-hidden="true" />
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
  }
]

const SEARCH_ASSETS_SUB_ITEMS = [
  { title: 'All', url: '/search/all' },
  { title: 'In Stock', url: '/search/instock' },
  { title: 'Sold', url: '/search/sold' },
]

const SETTINGS_SUB_ITEMS = [
  { title: 'Catalog', url: '/settings/catalog' },
  { title: 'Organizations', url: '/settings/organizations' },
]

const REPORTS_SUB_ITEMS = [
  { title: 'Profitability', url: '/reports/profitability' },
]

const USER_PERMISSIONS_ITEM = { title: 'User Management', url: '/settings/user-permissions' }

const PRICE_CHECK_ITEM = { title: 'Price Check', url: '/search/price-check' }

export function AppSidebar(): React.JSX.Element {
  const location = useLocation()

  const canManageSettings = useCan('manage_settings')
  const canManageUsers = useCan('manage_users')
  const canViewReports = useCan('view_reports')
  const canViewSalePrice = useCan('view_sale_price')

  const isSettingsActive = location.pathname.startsWith('/settings')
  const [settingsOpen, setSettingsOpen] = useState(isSettingsActive)

  const isReportsActive = location.pathname.startsWith('/reports')
  const [reportsOpen, setReportsOpen] = useState(isReportsActive)

  const isSearchAssetsActive = location.pathname.startsWith('/search')
  const [searchAssetsOpen, setSearchAssetsOpen] = useState(isSearchAssetsActive)

  useEffect(() => {
    if (isSettingsActive) setSettingsOpen(true)
  }, [isSettingsActive])

  useEffect(() => {
    if (isReportsActive) setReportsOpen(true)
  }, [isReportsActive])

  useEffect(() => {
    if (isSearchAssetsActive) setSearchAssetsOpen(true)
  }, [isSearchAssetsActive])

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
                const isActive = location.pathname.startsWith(item.url)
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive ? true : undefined}>
                      <Link to={item.url}>
                        {item.icon}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
              <Collapsible
                open={searchAssetsOpen}
                onOpenChange={setSearchAssetsOpen}
                className="group/collapsible"
                asChild
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={isSearchAssetsActive ? true : undefined}>
                      <MagnifyingGlassIcon aria-hidden="true" />
                      <span>Search Assets</span>
                      <CaretDownIcon
                        className="ml-auto transition-transform group-data-[state=closed]/collapsible:rotate-90"
                        aria-hidden="true"
                      />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {SEARCH_ASSETS_SUB_ITEMS.map(item => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton asChild isActive={location.pathname.startsWith(item.url) ? true : undefined}>
                            <Link to={item.url}>{item.title}</Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                      {canViewSalePrice && (
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            asChild
                            isActive={location.pathname.startsWith(PRICE_CHECK_ITEM.url) ? true : undefined}
                          >
                            <Link to={PRICE_CHECK_ITEM.url}>{PRICE_CHECK_ITEM.title}</Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
              {
                canViewReports &&
                <Collapsible
                  open={reportsOpen}
                  onOpenChange={setReportsOpen}
                  className="group/collapsible"
                  asChild
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton isActive={isReportsActive ? true : undefined}>
                        <ChartLineUpIcon aria-hidden="true" />
                        <span>Reports</span>
                        <CaretDownIcon
                          className="ml-auto transition-transform group-data-[state=closed]/collapsible:rotate-90"
                          aria-hidden="true"
                        />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {REPORTS_SUB_ITEMS.map(item => (
                          <SidebarMenuSubItem key={item.title}>
                            <SidebarMenuSubButton asChild isActive={location.pathname === item.url ? true : undefined}>
                              <Link to={item.url}>{item.title}</Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              }
              {
                canManageSettings &&
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
              }
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
