import { useDepartureStore } from '@/data/store/departure-store'
import type { DepartureForm } from '@/ui-types/departure-form-types'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
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
      const res = await submitCreateDeparture(data)
      if (res.success) {
        navigate(`/departures/${res.data.departureNumber}`, {
          state: { successMessage: `Departure ${res.data.departureNumber} created!` }
        })
      }
    } catch {
      toast.error('Something went wrong on the server.', { position: 'top-center' })
    }
  }

  return <DepartureFormPage pageConfig={pageConfig} breadcrumbs={breadcrumbs} onValidSubmit={onValidDepartureCreateSubmit} />
}
