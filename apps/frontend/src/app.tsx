import { ErrorFallback } from '@/components/custom/error-fallback'
import { PermissionRoute } from '@/components/custom/permission-route'
import { ProtectedRoute } from '@/components/custom/protected-route'
import { MainLayout } from '@/components/layout/layout'
import { PageTitleUpdater } from '@/components/layout/page-title-updater'
import { useAuth } from '@clerk/react'
import { lazy, Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAxiosAuth } from './hooks/use-axios-auth'
import { useGlobalData } from './hooks/use-global-data'

const LoginPage                 = lazy(() => import('./components/pages/login-page').then(m => ({ default: m.LoginPage })))

const ArrivalsSummaryPage       = lazy(() => import('./components/pages/arrival/arrivals-summary-page').then(m => ({ default: m.ArrivalsSummaryPage })))
const CreateArrivalPage         = lazy(() => import('./components/pages/arrival/create-arrival-page').then(m => ({ default: m.CreateArrivalPage })))
const ArrivalDetailsPage        = lazy(() => import('./components/pages/arrival/arrival-details-page').then(m => ({ default: m.ArrivalDetailsPage })))

const TransferSummaryPage       = lazy(() => import('./components/pages/transfer/transfers-summary-page').then(m => ({ default: m.TransferSummaryPage })))
const CreateTransferPage        = lazy(() => import('./components/pages/transfer/create-transfer-page').then(m => ({ default: m.CreateTransferPage })))
const TransferDetailsPage       = lazy(() => import('./components/pages/transfer/transfer-details-page').then(m => ({ default: m.TransferDetailsPage })))

const DepartureSummaryPage      = lazy(() => import('./components/pages/departure/departures-summary-page').then(m => ({ default: m.DepartureSummaryPage })))
const CreateDeparturePage       = lazy(() => import('./components/pages/departure/create-departure-page').then(m => ({ default: m.CreateDeparturePage })))
const DepartureDetailsPage      = lazy(() => import('./components/pages/departure/departure-details-page').then(m => ({ default: m.DepartureDetailsPage })))

const HoldSummaryPage           = lazy(() => import('./components/pages/hold/holds-summary-page').then(m => ({ default: m.HoldSummaryPage })))
const CreateHoldPage            = lazy(() => import('./components/pages/hold/create-hold-page').then(m => ({ default: m.CreateHoldPage })))
const HoldDetailsPage           = lazy(() => import('./components/pages/hold/hold-details-page').then(m => ({ default: m.HoldDetailsPage })))

const InvoicesSummaryPage       = lazy(() => import('./components/pages/invoice/invoices-summary-page').then(m => ({ default: m.InvoicesSummaryPage })))
const CreateInvoicePage         = lazy(() => import('./components/pages/invoice/create-invoice-page').then(m => ({ default: m.CreateInvoicePage })))
const InvoiceDetailsPage        = lazy(() => import('./components/pages/invoice/invoice-details-page').then(m => ({ default: m.InvoiceDetailsPage })))

const AssetDetailsPage          = lazy(() => import('./components/pages/asset-details-page').then(m => ({ default: m.AssetDetailsPage })))
const SearchInStockPage         = lazy(() => import('./components/pages/search/search-instock-page').then(m => ({ default: m.SearchInStockPage })))
const ProfitabilityReportPage   = lazy(() => import('./components/pages/profitability-report-page').then(m => ({ default: m.ProfitabilityReportPage })))
const SearchAllPage             = lazy(() => import('./components/pages/search/search-all-page').then(m => ({ default: m.SearchAllPage })))
const CatalogSettingsPage       = lazy(() => import('./components/pages/settings/catalog-settings-page').then(m => ({ default: m.CatalogSettingsPage })))
const OrganizationsSettingsPage = lazy(() => import('./components/pages/settings/organizations-settings-page').then(m => ({ default: m.OrganizationsSettingsPage })))
const UserManagementPage        = lazy(() => import('./components/pages/admin/user-management-page').then(m => ({ default: m.UserManagementPage })))

function AppRoutes() {
  const location = useLocation()

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={
        <ProtectedRoute>
          <MainLayout>
            <ErrorBoundary FallbackComponent={ErrorFallback} resetKeys={[location.pathname]}>
              <Suspense fallback={null}>
                <Routes>
                  <Route path="/" element={<Navigate to="/arrivals" replace />} />

                  <Route path="/arrivals" element={<ArrivalsSummaryPage />} />
                  <Route
                    path="/arrivals/new"
                    element={
                      <PermissionRoute permission="create_update_arrival">
                        <CreateArrivalPage />
                      </PermissionRoute>
                    }
                  />
                  <Route path="/arrivals/:collectionId" element={<ArrivalDetailsPage />} />

                  <Route path="/transfers" element={<TransferSummaryPage />} />
                  <Route
                    path="/transfers/new"
                    element={
                      <PermissionRoute permission="create_update_transfer">
                        <CreateTransferPage />
                      </PermissionRoute>
                    }
                  />
                  <Route path="/transfers/:collectionId" element={<TransferDetailsPage />} />

                  <Route path="/departures" element={<DepartureSummaryPage />} />
                  <Route
                    path="/departures/new"
                    element={
                      <PermissionRoute permission="create_update_departure">
                        <CreateDeparturePage />
                      </PermissionRoute>
                    }
                  />
                  <Route path="/departures/:collectionId" element={<DepartureDetailsPage />} />

                  <Route path="/holds" element={<HoldSummaryPage />} />
                  <Route
                    path="/holds/new"
                    element={
                      <PermissionRoute permission="create_update_hold">
                        <CreateHoldPage />
                      </PermissionRoute>
                    }
                  />
                  <Route path="/holds/:collectionId" element={<HoldDetailsPage />} />

                  <Route path="/invoices" element={<InvoicesSummaryPage />} />
                  <Route
                    path="/invoices/new"
                    element={
                      <PermissionRoute permission="create_update_invoice">
                        <CreateInvoicePage />
                      </PermissionRoute>
                    }
                  />
                  <Route path="/invoices/:collectionId" element={<InvoiceDetailsPage />} />

                  <Route path="/reports" element={<Navigate to="/reports/profitability" replace />} />
                  <Route
                    path="/reports/profitability"
                    element={
                      <PermissionRoute permission="view_reports">
                        <ProfitabilityReportPage />
                      </PermissionRoute>
                    }
                  />

                  <Route path="/:section/:collectionId/:assetId" element={<AssetDetailsPage />} />

                  <Route path="/search/all" element={<SearchAllPage />} />
                  <Route path="/search/all/:assetId" element={<AssetDetailsPage />} />
                  <Route path="/search/instock" element={<SearchInStockPage />} />
                  <Route path="/search/instock/:assetId" element={<AssetDetailsPage />} />

                  <Route path="/settings" element={<Navigate to="/settings/catalog" replace />} />
                  <Route
                    path="/settings/catalog"
                    element={
                      <PermissionRoute permission="manage_settings">
                        <CatalogSettingsPage />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/settings/organizations"
                    element={
                      <PermissionRoute permission="manage_settings">
                        <OrganizationsSettingsPage />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/settings/user-permissions"
                    element={
                      <PermissionRoute permission="manage_users">
                        <UserManagementPage />
                      </PermissionRoute>
                    }
                  />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </MainLayout>
        </ProtectedRoute>
      } />
    </Routes>
  )
}

function App() {
  useAxiosAuth()
  const { isSignedIn, isLoaded } = useAuth()
  useGlobalData(isLoaded && !!isSignedIn)

  return (
    <BrowserRouter>
      <PageTitleUpdater />
      <AppRoutes />
    </BrowserRouter>
  )
}

export default App
