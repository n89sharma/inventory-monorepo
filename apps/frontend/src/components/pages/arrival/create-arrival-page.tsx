import { useArrivalStore } from '@/data/store/arrival-store'
import type { ArrivalForm } from '@/ui-types/arrival-form-types'
import { useNavigate } from 'react-router-dom'
import { ArrivalFormPage } from './arrival-form-page'

export function CreateArrivalPage(): React.JSX.Element {
  const navigate = useNavigate()
  const submitCreateArrival = useArrivalStore(state => state.submitCreateArrival)

  const pageConfig = {
    pageHeading: 'Create Arrival',
    saveButtonText: 'Create Arrival',
    submittingText: 'Creating…',
    cancelNavUrl: '/arrivals',
  }

  const breadcrumbs = [
    { label: 'Arrivals', href: '/arrivals' },
    { label: 'Create' },
  ]

  async function onValidArrivalCreateSubmit(data: ArrivalForm) {
    try {
      const { arrivalNumber } = await submitCreateArrival(data)
      navigate(`/arrivals/${arrivalNumber}`, {
        state: { successMessage: `Arrival ${arrivalNumber} created!` }
      })
    } catch {
      // interceptor already showed the error toast
    }
  }

  return <ArrivalFormPage pageConfig={pageConfig} breadcrumbs={breadcrumbs} onValidSubmit={onValidArrivalCreateSubmit} />
}
