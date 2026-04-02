import { useArrivalStore } from '@/data/store/arrival-store'
import { useConstantsStore } from '@/data/store/constants-store'
import { useModelStore } from '@/data/store/model-store'
import { useOrgStore } from '@/data/store/org-store'
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

  const orgs = useOrgStore(state => state.organizations)
  const warehouses = useConstantsStore(state => state.warehouses)
  const technicalStatuses = useConstantsStore(state => state.technicalStatuses)
  const coreFunctions = useConstantsStore(state => state.coreFunctions)
  const models = useModelStore(state => state.models)

  useEffect(() => {
    if (!arrivalNumber) return
    if (!orgs.length || !warehouses.length || !models.length || !technicalStatuses.length || !coreFunctions.length) return
    getArrivalForUpdate(arrivalNumber)
  }, [arrivalNumber, orgs.length, warehouses.length, models.length, technicalStatuses.length, coreFunctions.length])

  const pageConfig = {
    pageHeading: `Edit Arrival ${arrivalNumber}`,
    saveButtonText: 'Save Changes',
    submittingText: 'Saving...',
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
