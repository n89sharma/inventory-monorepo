import { useArrivalStore } from '@/data/store/arrival-store'
import type { ArrivalForm } from '@/ui-types/arrival-form-types'
import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrivalFormPage } from './arrival-form-page'

export function UpdateArrivalPage(): React.JSX.Element {
  const { collectionId: arrivalNumber } = useParams<{ collectionId: string }>()
  const navigate = useNavigate()

  const arrivalFormData = useArrivalStore(state => state.arrivalFormData)
  const getArrivalForUpdate = useArrivalStore(state => state.getArrivalForUpdate)
  const submitUpdateArrival = useArrivalStore(state => state.submitUpdateArrival)

  useEffect(() => {
    if (!arrivalNumber) return
    getArrivalForUpdate(arrivalNumber)
  }, [arrivalNumber])

  const pageConfig = {
    pageHeading: `Edit Arrival ${arrivalNumber}`,
    saveButtonText: 'Save Changes',
    submittingText: 'Saving…',
    cancelNavUrl: `/arrivals/${arrivalNumber}`,
  }

  const breadcrumbs = [
    { label: 'Arrivals', href: '/arrivals' },
    { label: arrivalNumber!, href: `/arrivals/${arrivalNumber}` },
    { label: 'Edit' },
  ]

  async function onValidArrivalUpdateSubmit(arrivalForm: ArrivalForm) {
    try {
      const res = await submitUpdateArrival(arrivalNumber!, arrivalForm)
      if (res.success) {
        navigate(`/arrivals/${arrivalNumber}`, {
          state: { successMessage: `Arrival ${arrivalNumber} updated!` }
        })
      }
    } catch {
      toast.error('Something went wrong on the server.', { position: 'top-center' })
    }
  }

  if (!arrivalFormData) return <div>Loading…</div>
  return <ArrivalFormPage
    defaultValues={arrivalFormData}
    pageConfig={pageConfig}
    breadcrumbs={breadcrumbs}
    onValidSubmit={onValidArrivalUpdateSubmit}
  />
}
