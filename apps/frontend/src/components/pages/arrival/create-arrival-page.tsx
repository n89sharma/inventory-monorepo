import { useArrivalStore } from '@/data/store/arrival-store'
import type { ArrivalForm } from '@/ui-types/arrival-form-types'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrivalFormPage } from './arrival-form-page'

export function CreateArrivalPage(): React.JSX.Element {
  const navigate = useNavigate()
  const submitCreateArrival = useArrivalStore(state => state.submitCreateArrival)

  const pageConfig = {
    pageHeading: 'Create Arrival',
    saveButtonText: 'Create Arrival',
    submittingText: 'Creating...',
    cancelNavUrl: '/arrivals',
  }

  const breadcrumbs = [
    { label: 'Arrivals', href: '/arrivals' },
    { label: 'Create' },
  ]

  async function onValidArrivalCreateSubmit(data: ArrivalForm) {
    try {
      const res = await submitCreateArrival(data)
      if (res.success) {
        navigate(`/arrivals/${res.data.arrivalNumber}`, {
          state: { successMessage: `Arrival ${res.data.arrivalNumber} created!` }
        })
      }
    } catch {
      toast.error('Something went wrong on the server.', { position: 'top-center' })
    }
  }

  return <ArrivalFormPage pageConfig={pageConfig} breadcrumbs={breadcrumbs} onValidSubmit={onValidArrivalCreateSubmit} />
}
