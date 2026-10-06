import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/shadcn/alert-dialog'
import { Button } from '@/components/shadcn/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/shadcn/tooltip'
import { SpinnerGapIcon } from '@phosphor-icons/react'
import { useState } from 'react'

interface LifecycleButtonProps {
  label: string
  title: string
  description?: string
  onConfirm: () => Promise<void>
  disabled?: boolean
  disabledReason?: string | null
}

export function LifecycleButton({
  disabledReason,
  ...props
}: LifecycleButtonProps): React.JSX.Element {
  if (disabledReason) return <BlockedLifecycleButton label={props.label} reason={disabledReason} />
  return <ConfirmLifecycleButton {...props} />
}

function BlockedLifecycleButton({
  label,
  reason,
}: {
  label: string
  reason: string
}): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="inline-flex">
          <Button disabled>{label}</Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  )
}

function ConfirmLifecycleButton({
  label,
  title,
  description,
  onConfirm,
  disabled,
}: Omit<LifecycleButtonProps, 'disabledReason'>): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    try {
      await onConfirm()
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button disabled={disabled}>{label}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? <SpinnerGapIcon className="animate-spin" /> : null}
            {label}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
