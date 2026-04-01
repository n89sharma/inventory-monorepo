import { getArrivalForEdit, updateArrival } from '@/data/api/arrival-api'
import { useConstantsStore } from '@/data/store/constants-store'
import { useModelStore } from '@/data/store/model-store'
import { useOrgStore } from '@/data/store/org-store'
import type { ArrivalForm } from '@/ui-types/arrival-form-types'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrivalFormPage } from './arrival-form-page'

export function UpdateArrivalPage(): React.JSX.Element {
  const { collectionId: arrivalNumber } = useParams<{ collectionId: string }>()
  const [arrivalForm, setArrivalForm] = useState<ArrivalForm | null>(null)
  const navigate = useNavigate()

  const orgs = useOrgStore(state => state.organizations)
  const warehouses = useConstantsStore(state => state.warehouses)
  const technicalStatuses = useConstantsStore(state => state.technicalStatuses)
  const coreFunctions = useConstantsStore(state => state.coreFunctions)
  const models = useModelStore(state => state.models)

  useEffect(() => {
    if (!arrivalNumber) return
    if (!orgs.length || !warehouses.length || !models.length || !technicalStatuses.length || !coreFunctions.length) return

    async function load() {
      setArrivalForm(await getArrivalForEdit(arrivalNumber!))
    }
    load()
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

  async function onValidSubmit(arrivalForm: ArrivalForm) {
    try {
      const res = await updateArrival(arrivalNumber!, arrivalForm)
      if (res.success) {
        navigate(`/arrivals/${arrivalNumber}`, {
          state: { successMessage: `Arrival ${arrivalNumber} updated!` }
        })
      }
    } catch {
      toast.error('Something went wrong on the server.', { position: 'top-center' })
    }
  }

  if (!arrivalForm) return <div>Loading…</div>
  return <ArrivalFormPage defaultValues={arrivalForm} pageConfig={pageConfig} breadcrumbs={breadcrumbs} onValidSubmit={onValidSubmit} />
}
