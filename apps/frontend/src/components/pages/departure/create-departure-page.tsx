import { useDepartureStore } from '@/data/store/departure-store'
import type { DepartureForm } from '@/ui-types/departure-form-types'
import { useNavigate } from 'react-router-dom'
import { DepartureFormPage } from './departure-form-page'

export function CreateDeparturePage(): React.JSX.Element {
  const navigate = useNavigate()
  const submitCreateDeparture = useDepartureStore(state => state.submitCreateDeparture)

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

  async function onValidDepartureCreateSubmit(data: DepartureForm) {
    try {
      const { departureNumber } = await submitCreateDeparture(data)
      navigate(`/departures/${departureNumber}`, {
        state: { successMessage: `Departure ${departureNumber} created!` }
      })
    } catch {
      // interceptor already showed the error toast
    }
  }

  return <DepartureFormPage pageConfig={pageConfig} breadcrumbs={breadcrumbs} onValidSubmit={onValidDepartureCreateSubmit} />
}
