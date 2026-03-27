import { createArrival } from '@/data/api/arrival-api'
import type { ArrivalForm } from 'shared-types'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrivalFormPage } from './arrival-form-page'

export function CreateArrivalPage(): React.JSX.Element {
  const navigate = useNavigate()

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

  async function onValidSubmit(data: ArrivalForm) {
    try {
      const res = await createArrival(data)
      if (res.success) {
        navigate(`/arrivals/${res.data.arrivalNumber}`, {
          state: { successMessage: `Arrival ${res.data.arrivalNumber} created!` }
        })
      }
    } catch {
      toast.error('Something went wrong on the server.', { position: 'top-center' })
    }
  }

  return <ArrivalFormPage pageConfig={pageConfig} breadcrumbs={breadcrumbs} onValidSubmit={onValidSubmit} />
}
