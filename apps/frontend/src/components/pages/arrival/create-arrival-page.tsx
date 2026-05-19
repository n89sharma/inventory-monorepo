import { useArrivalMutations } from '@/hooks/use-arrival-mutations'
import type { ArrivalForm } from '@/ui-types/arrival-form-types'
import { useNavigate } from 'react-router-dom'
import { ArrivalFormPage } from './arrival-form-page'

export function CreateArrivalPage(): React.JSX.Element {
  const navigate = useNavigate()
  const mutations = useArrivalMutations()

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
      const { arrivalNumber } = await mutations.create(data)
      navigate(`/arrivals/${arrivalNumber}`, {
        state: { successMessage: `Arrival ${arrivalNumber} created!` }
      })
    } catch {
      // interceptor already showed the error toast
    }
  }

  return <ArrivalFormPage pageConfig={pageConfig} breadcrumbs={breadcrumbs} onValidSubmit={onValidArrivalCreateSubmit} />
}
