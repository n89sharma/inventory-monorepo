import { MainLayout } from '@/components/layout/layout'
import { PageTitleUpdater } from '@/components/layout/page-title-updater'
import { ProtectedRoute } from '@/components/custom/protected-route'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { useAxiosAuth } from './hooks/use-axios-auth'
import { useAuth } from '@clerk/react'
import { useGlobalData } from './hooks/use-global-data'

const LoginPage            = lazy(() => import('./components/pages/login-page').then(m => ({ default: m.LoginPage })))

const ArrivalsSummaryPage  = lazy(() => import('./components/pages/arrival/arrivals-summary-page').then(m => ({ default: m.ArrivalsSummaryPage })))
const CreateArrivalPage    = lazy(() => import('./components/pages/arrival/create-arrival-page').then(m => ({ default: m.CreateArrivalPage })))
const UpdateArrivalPage    = lazy(() => import('./components/pages/arrival/update-arrival-page').then(m => ({ default: m.UpdateArrivalPage })))
const ArrivalDetailsPage   = lazy(() => import('./components/pages/arrival/arrival-details-page').then(m => ({ default: m.ArrivalDetailsPage })))

const TransferSummaryPage  = lazy(() => import('./components/pages/transfer/transfers-summary-page').then(m => ({ default: m.TransferSummaryPage })))
const CreateTransferPage   = lazy(() => import('./components/pages/transfer/create-transfer-page').then(m => ({ default: m.CreateTransferPage })))
const UpdateTransferPage   = lazy(() => import('./components/pages/transfer/update-transfer-page').then(m => ({ default: m.UpdateTransferPage })))
const TransferDetailsPage  = lazy(() => import('./components/pages/transfer/transfer-details-page').then(m => ({ default: m.TransferDetailsPage })))

const DepartureSummaryPage = lazy(() => import('./components/pages/departure/departures-summary-page').then(m => ({ default: m.DepartureSummaryPage })))
const CreateDeparturePage  = lazy(() => import('./components/pages/departure/create-departure-page').then(m => ({ default: m.CreateDeparturePage })))
const UpdateDeparturePage  = lazy(() => import('./components/pages/departure/update-departure-page').then(m => ({ default: m.UpdateDeparturePage })))
const DepartureDetailsPage = lazy(() => import('./components/pages/departure/departure-details-page').then(m => ({ default: m.DepartureDetailsPage })))

const HoldSummaryPage      = lazy(() => import('./components/pages/hold/holds-summary-page').then(m => ({ default: m.HoldSummaryPage })))
const CreateHoldPage       = lazy(() => import('./components/pages/hold/create-hold-page').then(m => ({ default: m.CreateHoldPage })))
const UpdateHoldPage       = lazy(() => import('./components/pages/hold/update-hold-page').then(m => ({ default: m.UpdateHoldPage })))
const HoldDetailsPage      = lazy(() => import('./components/pages/hold/hold-details-page').then(m => ({ default: m.HoldDetailsPage })))

const InvoicesSummaryPage  = lazy(() => import('./components/pages/invoice/invoices-summary-page').then(m => ({ default: m.InvoicesSummaryPage })))
const CreateInvoicePage    = lazy(() => import('./components/pages/invoice/create-invoice-page').then(m => ({ default: m.CreateInvoicePage })))
const UpdateInvoicePage    = lazy(() => import('./components/pages/invoice/update-invoice-page').then(m => ({ default: m.UpdateInvoicePage })))
const InvoiceDetailsPage   = lazy(() => import('./components/pages/invoice/invoice-details-page').then(m => ({ default: m.InvoiceDetailsPage })))

const AssetDetailsPage     = lazy(() => import('./components/pages/asset-details-page').then(m => ({ default: m.AssetDetailsPage })))
const QueryPage            = lazy(() => import('./components/pages/query').then(m => ({ default: m.QueryPage })))
const SettingsPage         = lazy(() => import('./components/pages/settings/settings-page').then(m => ({ default: m.SettingsPage })))

function App() {
  useAxiosAuth()
  const { isSignedIn, isLoaded } = useAuth()
  useGlobalData(isLoaded && !!isSignedIn)

  return (
    <BrowserRouter>
      <PageTitleUpdater />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={
          <ProtectedRoute>
          <MainLayout>
            <Suspense fallback={null}>
              <Routes>
                <Route path="/" element={<Navigate to="/arrivals" replace />} />

                <Route path="/arrivals" element={<ArrivalsSummaryPage />} />
                <Route path="/arrivals/new" element={<CreateArrivalPage />} />
                <Route path="/arrivals/:collectionId/edit" element={<UpdateArrivalPage />} />
                <Route path="/arrivals/:collectionId" element={<ArrivalDetailsPage />} />

                <Route path="/transfers" element={<TransferSummaryPage />} />
                <Route path="/transfers/new" element={<CreateTransferPage />} />
                <Route path="/transfers/:collectionId/edit" element={<UpdateTransferPage />} />
                <Route path="/transfers/:collectionId" element={<TransferDetailsPage />} />

                <Route path="/departures" element={<DepartureSummaryPage />} />
                <Route path="/departures/new" element={<CreateDeparturePage />} />
                <Route path="/departures/:collectionId/edit" element={<UpdateDeparturePage />} />
                <Route path="/departures/:collectionId" element={<DepartureDetailsPage />} />

                <Route path="/holds" element={<HoldSummaryPage />} />
                <Route path="/holds/new" element={<CreateHoldPage />} />
                <Route path="/holds/:collectionId/edit" element={<UpdateHoldPage />} />
                <Route path="/holds/:collectionId" element={<HoldDetailsPage />} />

                <Route path="/invoices" element={<InvoicesSummaryPage />} />
                <Route path="/invoices/new" element={<CreateInvoicePage />} />
                <Route path="/invoices/:collectionId/edit" element={<UpdateInvoicePage />} />
                <Route path="/invoices/:collectionId" element={<InvoiceDetailsPage />} />

                <Route path="/reports" element={<ArrivalsSummaryPage />} />

                <Route path="/:section/:collectionId/:assetId" element={<AssetDetailsPage />} />

                <Route path="/search" element={<QueryPage />} />
                <Route path="/search/:assetId" element={<AssetDetailsPage />} />

                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </Suspense>
          </MainLayout>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
