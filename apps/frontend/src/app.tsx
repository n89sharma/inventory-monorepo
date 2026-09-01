import { MainLayout } from '@/components/app-layout/layout'
import { PageTitleUpdater } from '@/components/app-layout/page-title-updater'
import { PostLoginLanding } from '@/components/app-layout/post-login-landing'
import { ProtectedRoute } from '@/components/app-layout/protected-route'
import { ErrorFallback } from '@/components/shared/error-fallback'
import { PermissionRoute } from '@/components/shared/permission-route'
import { NuqsAdapter } from 'nuqs/adapters/react-router/v7'
import { lazy, Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAxiosAuth } from './hooks/use-axios-auth'

const LoginPage = lazy(() =>
  import('./components/app-layout/login-page').then((m) => ({ default: m.LoginPage })),
)

const ArrivalsSummaryPage = lazy(() =>
  import('./components/arrivals/arrivals-summary-page').then((m) => ({
    default: m.ArrivalsSummaryPage,
  })),
)
const CreateArrivalPage = lazy(() =>
  import('./components/arrivals/create-arrival-page').then((m) => ({
    default: m.CreateArrivalPage,
  })),
)
const ArrivalDetailsPage = lazy(() =>
  import('./components/arrivals/arrival-details-page').then((m) => ({
    default: m.ArrivalDetailsPage,
  })),
)

const TransferSummaryPage = lazy(() =>
  import('./components/transfer/transfers-summary-page').then((m) => ({
    default: m.TransferSummaryPage,
  })),
)
const CreateTransferPage = lazy(() =>
  import('./components/transfer/create-transfer-page').then((m) => ({
    default: m.CreateTransferPage,
  })),
)
const TransferDetailsPage = lazy(() =>
  import('./components/transfer/transfer-details-page').then((m) => ({
    default: m.TransferDetailsPage,
  })),
)

const DepartureSummaryPage = lazy(() =>
  import('@/components/departure/departures-summary-page').then((m) => ({
    default: m.DepartureSummaryPage,
  })),
)
const CreateDeparturePage = lazy(() =>
  import('@/components/departure/create-departure-page').then((m) => ({
    default: m.CreateDeparturePage,
  })),
)
const DepartureDetailsPage = lazy(() =>
  import('@/components/departure/departure-details-page').then((m) => ({
    default: m.DepartureDetailsPage,
  })),
)

const StorePartsListPage = lazy(() =>
  import('./components/store-part/store-parts-list-page').then((m) => ({
    default: m.StorePartsListPage,
  })),
)
const StorePartDetailPage = lazy(() =>
  import('./components/store-part/store-part-detail-page').then((m) => ({
    default: m.StorePartDetailPage,
  })),
)

const HoldSummaryPage = lazy(() =>
  import('./components/hold/holds-summary-page').then((m) => ({
    default: m.HoldSummaryPage,
  })),
)
const CreateHoldPage = lazy(() =>
  import('./components/hold/create-hold-page').then((m) => ({ default: m.CreateHoldPage })),
)
const HoldDetailsPage = lazy(() =>
  import('./components/hold/hold-details-page').then((m) => ({ default: m.HoldDetailsPage })),
)

const InvoicesSummaryPage = lazy(() =>
  import('@/components/invoice/invoices-summary-page').then((m) => ({
    default: m.InvoicesSummaryPage,
  })),
)
const CreateInvoicePage = lazy(() =>
  import('@/components/invoice/create-invoice-page').then((m) => ({
    default: m.CreateInvoicePage,
  })),
)
const InvoiceDetailsPage = lazy(() =>
  import('@/components/invoice/invoice-details-page').then((m) => ({
    default: m.InvoiceDetailsPage,
  })),
)

const AssetDetailsPage = lazy(() =>
  import('./components/asset-details/asset-details-page').then((m) => ({
    default: m.AssetDetailsPage,
  })),
)
const SearchOnHandPage = lazy(() =>
  import('./components/asset-search/search-onhand-page').then((m) => ({
    default: m.SearchOnHandPage,
  })),
)
const SearchDepartedPage = lazy(() =>
  import('./components/asset-search/search-departed-page').then((m) => ({
    default: m.SearchDepartedPage,
  })),
)
const SearchHarvestedPage = lazy(() =>
  import('./components/asset-search/search-harvested-page').then((m) => ({
    default: m.SearchHarvestedPage,
  })),
)
const ProfitabilityReportPage = lazy(() =>
  import('./components/reports/profitability-report-page').then((m) => ({
    default: m.ProfitabilityReportPage,
  })),
)
const HeldReportPage = lazy(() =>
  import('./components/reports/held-report-page').then((m) => ({
    default: m.HeldReportPage,
  })),
)
const InStockSummaryReportPage = lazy(() =>
  import('./components/reports/in-stock-summary-report-page').then((m) => ({
    default: m.InStockSummaryReportPage,
  })),
)
const ExportAssetsPage = lazy(() =>
  import('./components/reports/export-assets-page').then((m) => ({
    default: m.ExportAssetsPage,
  })),
)
const PutAwayPage = lazy(() =>
  import('./components/put-away/put-away-page').then((m) => ({
    default: m.PutAwayPage,
  })),
)
const ModelPriceHistoryPage = lazy(() =>
  import('./components/reports/model-price-history-page').then((m) => ({
    default: m.ModelPriceHistoryPage,
  })),
)
const ModelsSettingsPage = lazy(() =>
  import('./components/settings/models-settings-page').then((m) => ({
    default: m.ModelsSettingsPage,
  })),
)
const BrandsSettingsPage = lazy(() =>
  import('./components/settings/brands-settings-page').then((m) => ({
    default: m.BrandsSettingsPage,
  })),
)
const LocationsSettingsPage = lazy(() =>
  import('./components/settings/locations-settings-page').then((m) => ({
    default: m.LocationsSettingsPage,
  })),
)
const OrganizationsSettingsPage = lazy(() =>
  import('./components/settings/organizations-settings-page').then((m) => ({
    default: m.OrganizationsSettingsPage,
  })),
)
const UserManagementPage = lazy(() =>
  import('./components/admin/user-management-page').then((m) => ({
    default: m.UserManagementPage,
  })),
)

function AppRoutes() {
  const location = useLocation()

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="*"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ErrorBoundary FallbackComponent={ErrorFallback} resetKeys={[location.pathname]}>
                <Suspense fallback={null}>
                  <Routes>
                    <Route path="/" element={<PostLoginLanding />} />

                    <Route
                      path="/arrivals"
                      element={
                        <PermissionRoute permission="view_collections">
                          <ArrivalsSummaryPage />
                        </PermissionRoute>
                      }
                    />
                    <Route
                      path="/arrivals/new"
                      element={
                        <PermissionRoute permission="create_update_arrival">
                          <CreateArrivalPage />
                        </PermissionRoute>
                      }
                    />
                    <Route
                      path="/arrivals/:collectionId"
                      element={
                        <PermissionRoute permission="view_collections">
                          <ArrivalDetailsPage />
                        </PermissionRoute>
                      }
                    />

                    <Route
                      path="/transfers"
                      element={
                        <PermissionRoute permission="view_collections">
                          <TransferSummaryPage />
                        </PermissionRoute>
                      }
                    />
                    <Route
                      path="/transfers/new"
                      element={
                        <PermissionRoute permission="create_update_transfer">
                          <CreateTransferPage />
                        </PermissionRoute>
                      }
                    />
                    <Route
                      path="/transfers/:collectionId"
                      element={
                        <PermissionRoute permission="view_collections">
                          <TransferDetailsPage />
                        </PermissionRoute>
                      }
                    />

                    <Route
                      path="/departures"
                      element={
                        <PermissionRoute permission="view_collections">
                          <DepartureSummaryPage />
                        </PermissionRoute>
                      }
                    />
                    <Route
                      path="/departures/new"
                      element={
                        <PermissionRoute permission="create_update_departure">
                          <CreateDeparturePage />
                        </PermissionRoute>
                      }
                    />
                    <Route
                      path="/departures/:collectionId"
                      element={
                        <PermissionRoute permission="view_collections">
                          <DepartureDetailsPage />
                        </PermissionRoute>
                      }
                    />

                    <Route
                      path="/store"
                      element={
                        <PermissionRoute permission="view_store">
                          <StorePartsListPage />
                        </PermissionRoute>
                      }
                    />
                    <Route
                      path="/store/:partId"
                      element={
                        <PermissionRoute permission="view_store">
                          <StorePartDetailPage />
                        </PermissionRoute>
                      }
                    />

                    <Route
                      path="/put-away"
                      element={
                        <PermissionRoute permission="update_location">
                          <PutAwayPage />
                        </PermissionRoute>
                      }
                    />

                    <Route
                      path="/holds"
                      element={
                        <PermissionRoute permission="view_collections">
                          <HoldSummaryPage />
                        </PermissionRoute>
                      }
                    />
                    <Route
                      path="/holds/new"
                      element={
                        <PermissionRoute permission="create_update_hold">
                          <CreateHoldPage />
                        </PermissionRoute>
                      }
                    />
                    <Route
                      path="/holds/:collectionId"
                      element={
                        <PermissionRoute permission="view_collections">
                          <HoldDetailsPage />
                        </PermissionRoute>
                      }
                    />

                    <Route
                      path="/invoices"
                      element={
                        <PermissionRoute permission="view_collections">
                          <InvoicesSummaryPage />
                        </PermissionRoute>
                      }
                    />
                    <Route
                      path="/invoices/new"
                      element={
                        <PermissionRoute permission="create_update_invoice">
                          <CreateInvoicePage />
                        </PermissionRoute>
                      }
                    />
                    <Route
                      path="/invoices/:collectionId"
                      element={
                        <PermissionRoute permission="view_collections">
                          <InvoiceDetailsPage />
                        </PermissionRoute>
                      }
                    />

                    <Route
                      path="/reports"
                      element={<Navigate to="/reports/in-stock-summary" replace />}
                    />
                    <Route
                      path="/reports/profitability"
                      element={
                        <PermissionRoute permission="view_profitability_report">
                          <ProfitabilityReportPage />
                        </PermissionRoute>
                      }
                    />
                    <Route
                      path="/reports/held"
                      element={
                        <PermissionRoute permission="view_reports">
                          <HeldReportPage />
                        </PermissionRoute>
                      }
                    />
                    <Route
                      path="/reports/in-stock-summary"
                      element={
                        <PermissionRoute permission="view_reports">
                          <InStockSummaryReportPage />
                        </PermissionRoute>
                      }
                    />
                    <Route
                      path="/reports/model-price-history"
                      element={
                        <PermissionRoute permission="view_sale_price">
                          <ModelPriceHistoryPage />
                        </PermissionRoute>
                      }
                    />
                    <Route
                      path="/reports/model-price-history/:assetId"
                      element={
                        <PermissionRoute permission="view_asset">
                          <AssetDetailsPage />
                        </PermissionRoute>
                      }
                    />

                    <Route
                      path="/:section/:collectionId/:assetId"
                      element={
                        <PermissionRoute permission="view_asset">
                          <AssetDetailsPage />
                        </PermissionRoute>
                      }
                    />

                    <Route
                      path="/assets/:assetId"
                      element={
                        <PermissionRoute permission="view_asset">
                          <AssetDetailsPage />
                        </PermissionRoute>
                      }
                    />

                    <Route
                      path="/search/onhand"
                      element={
                        <PermissionRoute permission="view_asset">
                          <SearchOnHandPage />
                        </PermissionRoute>
                      }
                    />
                    <Route
                      path="/search/onhand/:assetId"
                      element={
                        <PermissionRoute permission="view_asset">
                          <AssetDetailsPage />
                        </PermissionRoute>
                      }
                    />
                    <Route
                      path="/search/departed"
                      element={
                        <PermissionRoute permission="view_asset">
                          <SearchDepartedPage />
                        </PermissionRoute>
                      }
                    />
                    <Route
                      path="/search/departed/:assetId"
                      element={
                        <PermissionRoute permission="view_asset">
                          <AssetDetailsPage />
                        </PermissionRoute>
                      }
                    />
                    <Route
                      path="/search/harvested"
                      element={
                        <PermissionRoute permission="view_asset">
                          <SearchHarvestedPage />
                        </PermissionRoute>
                      }
                    />
                    <Route
                      path="/search/harvested/:assetId"
                      element={
                        <PermissionRoute permission="view_asset">
                          <AssetDetailsPage />
                        </PermissionRoute>
                      }
                    />

                    <Route path="/settings" element={<Navigate to="/settings/models" replace />} />
                    <Route
                      path="/settings/models"
                      element={
                        <PermissionRoute permission="update_settings">
                          <ModelsSettingsPage />
                        </PermissionRoute>
                      }
                    />
                    <Route
                      path="/settings/brands"
                      element={
                        <PermissionRoute permission="update_settings">
                          <BrandsSettingsPage />
                        </PermissionRoute>
                      }
                    />
                    <Route
                      path="/settings/locations"
                      element={
                        <PermissionRoute permission="update_settings">
                          <LocationsSettingsPage />
                        </PermissionRoute>
                      }
                    />
                    <Route
                      path="/settings/organizations"
                      element={
                        <PermissionRoute permission="update_settings">
                          <OrganizationsSettingsPage />
                        </PermissionRoute>
                      }
                    />
                    <Route
                      path="/settings/user-permissions"
                      element={
                        <PermissionRoute permission="update_users">
                          <UserManagementPage />
                        </PermissionRoute>
                      }
                    />
                    <Route
                      path="/settings/export-assets"
                      element={
                        <PermissionRoute permission="update_settings">
                          <ExportAssetsPage />
                        </PermissionRoute>
                      }
                    />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </MainLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

function App() {
  useAxiosAuth()

  return (
    <BrowserRouter>
      <NuqsAdapter>
        <PageTitleUpdater />
        <AppRoutes />
      </NuqsAdapter>
    </BrowserRouter>
  )
}

export default App
