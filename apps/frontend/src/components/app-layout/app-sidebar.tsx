import { UserMenuButton } from '@/components/app-layout/user-menu-button'
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

type SidebarPermission = 'view_collections' | 'view_store'

const sidebarItems = [
  {
    title: 'Arrivals',
    url: '/arrivals',
    icon: <WarehouseIcon aria-hidden="true" />,
    permission: 'view_collections',
  },
  {
    title: 'Holds',
    url: '/holds',
    icon: <LockOpenIcon aria-hidden="true" />,
    permission: 'view_collections',
  },
  {
    title: 'Transfers',
    url: '/transfers',
    icon: <LineSegmentsIcon aria-hidden="true" />,
    permission: 'view_collections',
  },
  {
    title: 'Departures',
    url: '/departures',
    icon: <TruckTrailerIcon aria-hidden="true" />,
    permission: 'view_collections',
  },
  {
    title: 'Invoices',
    url: '/invoices',
    icon: <InvoiceIcon aria-hidden="true" />,
    permission: 'view_collections',
  },
  {
    title: 'Store',
    url: STORE_PATH,
    icon: <ToolboxIcon aria-hidden="true" />,
    permission: 'view_store',
  },
] as const satisfies readonly {
  title: string
  url: string
  icon: React.JSX.Element
  permission: SidebarPermission
}[]

const SEARCH_ASSETS_SUB_ITEMS = [
  { title: 'On-Hand', url: '/search/onhand' },
  { title: 'Sold', url: '/search/sold' },
  { title: 'Harvested', url: '/search/harvested' },
]

const SETTINGS_SUB_ITEMS = [
  { title: 'Catalog', url: '/settings/catalog' },
  { title: 'Locations', url: '/settings/locations' },
  { title: 'Organizations', url: '/settings/organizations' },
  { title: 'Export Assets', url: '/settings/export-assets' },
]

const SOLD_REPORT_PATH = '/reports/sold-report'

type ReportPermission = 'view_reports' | 'view_sale_price' | 'view_profitability_report'

const REPORTS_SUB_ITEMS = [
  { title: 'In Stock', url: IN_STOCK_SUMMARY_PATH, permission: 'view_reports' },
  { title: 'Held', url: '/reports/holds-by-user', permission: 'view_reports' },
  { title: 'Sold', url: SOLD_REPORT_PATH, permission: 'view_sale_price' },
  { title: 'Profitability', url: PROFITABILITY_PATH, permission: 'view_profitability_report' },
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

  const canManageSettings = useCan('update_settings')
  const canManageUsers = useCan('update_users')
  const canViewReports = useCan('view_reports')
  const canViewSalePrice = useCan('view_sale_price')
  const canViewProfitabilityReport = useCan('view_profitability_report')
  const canPutAway = useCan('update_location')
  const canViewCollections = useCan('view_collections')
  const canViewStore = useCan('view_store')

  const sidebarItemVisible: Record<SidebarPermission, boolean> = {
    view_collections: canViewCollections,
    view_store: canViewStore,
  }

  const isSettingsActive = location.pathname.startsWith('/settings')
  const [settingsOpen, setSettingsOpen] = useState(isSettingsActive)

  const reportItemVisible: Record<ReportPermission, boolean> = {
    view_reports: canViewReports,
    view_sale_price: canViewSalePrice,
    view_profitability_report: canViewProfitabilityReport,
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
              {sidebarItems
                .filter((item) => sidebarItemVisible[item.permission])
                .map((item) => {
                  const isActive = location.pathname.startsWith(item.url)
                  const to =
                    item.url === STORE_PATH ? buildStoreListPath(defaultWarehouse) : item.url
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
