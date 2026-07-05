import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/shadcn/collapsible'
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
  SidebarRail,
} from '@/components/shadcn/sidebar'
import { UserMenuButton } from '@/components/app-layout/user-menu-button'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { useCan } from '@/hooks/use-can'
import { useDefaultAssetType } from '@/hooks/use-default-asset-type'
import { useProfileDefaultWarehouse } from '@/hooks/use-profile-default-warehouse'
import {
  buildAssetSearchPath,
  buildInStockSummaryPath,
  buildProfitabilityReportPath,
  buildStoreListPath,
} from '@/lib/filters/serializers'
import {
  CaretDownIcon,
  ChartLineUpIcon,
  GearIcon,
  InvoiceIcon,
  LineSegmentsIcon,
  LockOpenIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  StackIcon,
  ToolboxIcon,
  TruckTrailerIcon,
  WarehouseIcon,
} from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

const STORE_PATH = '/store'
const PROFITABILITY_PATH = '/reports/profitability'
const IN_STOCK_SUMMARY_PATH = '/reports/in-stock-summary'
const DEFAULT_BRAND_NAME = 'Canon'

const sidebarItems = [
  {
    title: 'Arrivals',
    url: '/arrivals',
    icon: <WarehouseIcon aria-hidden="true" />,
  },
  {
    title: 'Holds',
    url: '/holds',
    icon: <LockOpenIcon aria-hidden="true" />,
  },
  {
    title: 'Transfers',
    url: '/transfers',
    icon: <LineSegmentsIcon aria-hidden="true" />,
  },
  {
    title: 'Departures',
    url: '/departures',
    icon: <TruckTrailerIcon aria-hidden="true" />,
  },
  {
    title: 'Invoices',
    url: '/invoices',
    icon: <InvoiceIcon aria-hidden="true" />,
  },
  {
    title: 'Store',
    url: STORE_PATH,
    icon: <ToolboxIcon aria-hidden="true" />,
  },
]

const SEARCH_ASSETS_SUB_ITEMS = [
  { title: 'In Stock', url: '/search/instock' },
  { title: 'Held', url: '/search/held' },
  { title: 'Sold', url: '/search/sold' },
]

const SETTINGS_SUB_ITEMS = [
  { title: 'Catalog', url: '/settings/catalog' },
  { title: 'Organizations', url: '/settings/organizations' },
  { title: 'Export Assets', url: '/settings/export-assets' },
]

const SOLD_REPORT_PATH = '/reports/sold-report'

type ReportPermission = 'view_reports' | 'view_sale_price'

const REPORTS_SUB_ITEMS = [
  { title: 'In Stock', url: IN_STOCK_SUMMARY_PATH, permission: 'view_reports' },
  { title: 'Held', url: '/reports/holds-by-user', permission: 'view_reports' },
  { title: 'Sold', url: SOLD_REPORT_PATH, permission: 'view_sale_price' },
  { title: 'Profitability', url: PROFITABILITY_PATH, permission: 'view_reports' },
] as const satisfies readonly { title: string; url: string; permission: ReportPermission }[]

const USER_PERMISSIONS_ITEM = { title: 'User Management', url: '/settings/user-permissions' }

export function AppSidebar(): React.JSX.Element {
  const location = useLocation()
  const defaultWarehouse = useProfileDefaultWarehouse()

  const brands = useReferenceDataStore((state) => state.brands)
  const defaultBrand = useMemo(
    () => brands.find((b) => b.name === DEFAULT_BRAND_NAME) ?? null,
    [brands],
  )
  const defaultAssetType = useDefaultAssetType()

  function reportItemPath(url: string): string {
    if (url === PROFITABILITY_PATH) return buildProfitabilityReportPath(defaultWarehouse)
    if (url === IN_STOCK_SUMMARY_PATH) {
      return buildInStockSummaryPath(defaultWarehouse, defaultBrand, defaultAssetType)
    }
    return url
  }

  const canManageSettings = useCan('manage_settings')
  const canManageUsers = useCan('manage_users')
  const canViewReports = useCan('view_reports')
  const canViewSalePrice = useCan('view_sale_price')
  const canPutAway = useCan('edit_location')

  const isSettingsActive = location.pathname.startsWith('/settings')
  const [settingsOpen, setSettingsOpen] = useState(isSettingsActive)

  const reportItemVisible: Record<ReportPermission, boolean> = {
    view_reports: canViewReports,
    view_sale_price: canViewSalePrice,
  }

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
                      {SEARCH_ASSETS_SUB_ITEMS.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={location.pathname.startsWith(item.url) ? true : undefined}
                          >
                            <Link
                              to={buildAssetSearchPath(
                                item.url,
                                defaultWarehouse,
                                defaultAssetType,
                              )}
                            >
                              {item.title}
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
              {sidebarItems.map((item) => {
                const isActive = location.pathname.startsWith(item.url)
                const to = item.url === STORE_PATH ? buildStoreListPath(defaultWarehouse) : item.url
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive ? true : undefined}>
                      <Link to={to}>
                        {item.icon}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
              {canPutAway && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname.startsWith('/put-away') ? true : undefined}
                  >
                    <Link to="/put-away">
                      <MapPinIcon aria-hidden="true" />
                      <span>Put Away</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {(canViewReports || canViewSalePrice) && (
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
                        {REPORTS_SUB_ITEMS.filter((item) => reportItemVisible[item.permission]).map(
                          (item) => {
                            const to = reportItemPath(item.url)
                            const isActive =
                              item.url === SOLD_REPORT_PATH
                                ? location.pathname.startsWith(item.url)
                                : location.pathname === item.url
                            return (
                              <SidebarMenuSubItem key={item.title}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={isActive ? true : undefined}
                                >
                                  <Link to={to}>{item.title}</Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            )
                          },
                        )}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}
              {canManageSettings && (
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
                        {SETTINGS_SUB_ITEMS.map((item) => (
                          <SidebarMenuSubItem key={item.title}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={location.pathname === item.url ? true : undefined}
                            >
                              <Link to={item.url}>{item.title}</Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                        {canManageUsers && (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={
                                location.pathname === USER_PERMISSIONS_ITEM.url ? true : undefined
                              }
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
              )}
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
