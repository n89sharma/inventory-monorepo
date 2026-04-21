import { MainLayout } from '@/components/layout/layout'
import { PageTitleUpdater } from '@/components/layout/page-title-updater'
import { ArrivalsSummaryPage } from '@/components/pages/arrival/arrivals-summary-page'
import { LoginPage } from '@/components/pages/login-page'
import { ProtectedRoute } from '@/components/custom/protected-route'
import { AssetDetailsPage } from '@/components/pages/asset-details-page'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ArrivalDetailsPage } from './components/pages/arrival/arrival-details-page'
import { CreateArrivalPage } from './components/pages/arrival/create-arrival-page'
import { UpdateArrivalPage } from './components/pages/arrival/update-arrival-page'
import { CreateDeparturePage } from './components/pages/departure/create-departure-page'
import { DepartureDetailsPage } from './components/pages/departure/departure-details-page'
import { DepartureSummaryPage } from './components/pages/departure/departures-summary-page'
import { UpdateDeparturePage } from './components/pages/departure/update-departure-page'
import { CreateHoldPage } from './components/pages/hold/create-hold-page'
import { HoldDetailsPage } from './components/pages/hold/hold-details-page'
import { HoldSummaryPage } from './components/pages/hold/holds-summary-page'
import { UpdateHoldPage } from './components/pages/hold/update-hold-page'
import { CreateInvoicePage } from './components/pages/invoice/create-invoice-page'
import { InvoiceDetailsPage } from './components/pages/invoice/invoice-details-page'
import { InvoicesSummaryPage } from './components/pages/invoice/invoices-summary-page'
import { UpdateInvoicePage } from './components/pages/invoice/update-invoice-page'
import { QueryPage } from './components/pages/query'
import { SettingsPage } from './components/pages/settings/settings-page'
import { CreateTransferPage } from './components/pages/transfer/create-transfer-page'
import { TransferDetailsPage } from './components/pages/transfer/transfer-details-page'
import { TransferSummaryPage } from './components/pages/transfer/transfers-summary-page'
import { UpdateTransferPage } from './components/pages/transfer/update-transfer-page'
import { useAxiosAuth } from './hooks/use-axios-auth'
import { useAuth } from '@clerk/react'
import { useGlobalData } from './hooks/use-global-data'

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
          </MainLayout>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
