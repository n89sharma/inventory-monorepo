import { useDepartureStore } from '@/data/store/departure-store'
import type { DepartureForm } from '@/ui-types/departure-form-types'
import { UNSELECTED } from '@/ui-types/select-option-types'
import { useLocation, useNavigate } from 'react-router-dom'
import type { AssetSummary } from 'shared-types'
import { DepartureFormPage } from './departure-form-page'

export function CreateDeparturePage(): React.JSX.Element {
  const navigate = useNavigate()
  const { state } = useLocation()
  const { preloadedAssets, returnTo } =
    (state ?? {}) as { preloadedAssets?: AssetSummary[]; returnTo?: string }

  const submitCreateDeparture = useDepartureStore(s => s.submitCreateDeparture)

  const pageConfig = {
    pageHeading: 'Create Departure',
    saveButtonText: 'Create Departure',
    submittingText: 'Creating…',
    cancelNavUrl: '/departures',
  }

  const breadcrumbs = [
    { label: 'Departures', href: '/departures' },
    { label: 'Create' },
  ]

  const defaultValues: DepartureForm | undefined = preloadedAssets?.length
    ? { origin: UNSELECTED, customer: null, transporter: null, comment: '', assets: preloadedAssets }
    : undefined

  async function onValidDepartureCreateSubmit(data: DepartureForm) {
    try {
      const { departureNumber } = await submitCreateDeparture(data)
      const destination = returnTo ?? `/departures/${departureNumber}`
      navigate(destination, { state: { successMessage: `Departure ${departureNumber} created!` } })
    } catch {
      // interceptor already showed the error toast
    }
  }

  return (
    <DepartureFormPage
      pageConfig={pageConfig}
      breadcrumbs={breadcrumbs}
      onValidSubmit={onValidDepartureCreateSubmit}
      defaultValues={defaultValues}
    />
  )
}
