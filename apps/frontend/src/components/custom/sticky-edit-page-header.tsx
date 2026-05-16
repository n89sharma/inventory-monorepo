import { CircleNotchIcon } from '@phosphor-icons/react'
import { Button } from '../shadcn/button'
import { PageBreadcrumb } from './page-breadcrumb'
import { StickyPageHeader } from './sticky-page-header'

interface StickyEditPageHeaderProps {
  breadcrumbs: { label: string; href?: string }[]
  pageHeading: string
  onNavigate: (url: string) => void
  cancelNavUrl: string
  isSubmitting: boolean
  isDirty: boolean
  submittingText: string
  saveButtonText: string
  onSave: () => void
}

export function StickyEditPageHeader({
  breadcrumbs,
  pageHeading,
  onNavigate,
  cancelNavUrl,
  isSubmitting,
  isDirty,
  submittingText,
  saveButtonText,
  onSave
}: StickyEditPageHeaderProps): React.JSX.Element {
  return (
    <StickyPageHeader>
      <PageBreadcrumb segments={breadcrumbs} onNavigate={onNavigate} />
      <div className='flex items-center justify-between gap-4'>
        <h1 className='text-2xl font-semibold'>{pageHeading}</h1>
        <div className='flex gap-2'>
          <Button
            variant='outline'
            type='button'
            disabled={isSubmitting}
            onClick={() => onNavigate(cancelNavUrl)}
          >
            Cancel
          </Button>
          <Button
            type='button'
            onClick={onSave}
            disabled={!isDirty || isSubmitting}
          >
            {isSubmitting
              ? <><CircleNotchIcon className='animate-spin mr-1' size={16} />{submittingText}</>
              : saveButtonText
            }
          </Button>
        </div>
      </div>
    </StickyPageHeader>
  )
}
