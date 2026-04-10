import { useHoldStore } from '@/data/store/hold-store'
import { useOrgStore } from '@/data/store/org-store'
import { useUserStore } from '@/data/store/user-store'
import type { HoldForm } from '@/ui-types/hold-form-types'
import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { HoldFormPage } from './hold-form-page'

export function UpdateHoldPage(): React.JSX.Element {
  const { collectionId: holdNumber } = useParams<{ collectionId: string }>()
  const navigate = useNavigate()

  const holdFormData = useHoldStore(state => state.holdFormData)
  const getHoldForUpdate = useHoldStore(state => state.getHoldForUpdate)
  const submitUpdateHold = useHoldStore(state => state.submitUpdateHold)

  const users = useUserStore(state => state.users)
  const orgs = useOrgStore(state => state.organizations)

  useEffect(() => {
    if (!holdNumber) return
    if (!users.length || !orgs.length) return
    getHoldForUpdate(holdNumber)
  }, [holdNumber, users.length, orgs.length])

  const pageConfig = {
    pageHeading: `Edit Hold ${holdNumber}`,
    saveButtonText: 'Save Changes',
    submittingText: 'Saving…',
    cancelNavUrl: `/holds/${holdNumber}`,
  }

  const breadcrumbs = [
    { label: 'Holds', href: '/holds' },
    { label: holdNumber!, href: `/holds/${holdNumber}` },
    { label: 'Edit' },
  ]

  async function onValidHoldUpdateSubmit(holdForm: HoldForm) {
    try {
      const res = await submitUpdateHold(holdNumber!, holdForm)
      if (res.success) {
        navigate(`/holds/${holdNumber}`, {
          state: { successMessage: `Hold ${holdNumber} updated!` }
        })
      } else {
        toast.error(res.error.summary, { position: 'top-center' })
      }
    } catch {
      toast.error('Something went wrong on the server.', { position: 'top-center' })
    }
  }

  if (!holdFormData) return <div>Loading…</div>
  return <HoldFormPage
    defaultValues={holdFormData}
    pageConfig={pageConfig}
    breadcrumbs={breadcrumbs}
    onValidSubmit={onValidHoldUpdateSubmit}
  />
}
