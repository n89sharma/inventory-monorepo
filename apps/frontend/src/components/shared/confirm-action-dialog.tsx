import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/shadcn/alert-dialog'
import type { Button } from '@/components/shadcn/button'
import type { ComponentProps, ReactNode } from 'react'

type ButtonVariant = ComponentProps<typeof Button>['variant']

const DESTRUCTIVE_MEDIA_CLASS =
  'bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive'

type ConfirmActionDialogProps = {
  title: string
  confirmLabel: string
  icon: ReactNode
  onConfirm: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  confirmVariant?: ButtonVariant
  size?: 'default' | 'sm'
  children?: ReactNode
}

export function ConfirmActionDialog({
  title,
  confirmLabel,
  icon,
  onConfirm,
  open,
  onOpenChange,
  confirmVariant = 'default',
  size = 'sm',
  children,
}: ConfirmActionDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size={size}>
        <AlertDialogHeader>
          <AlertDialogMedia
            className={confirmVariant === 'destructive' ? DESTRUCTIVE_MEDIA_CLASS : undefined}
          >
            {icon}
          </AlertDialogMedia>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {children}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="outline">Cancel</AlertDialogCancel>
          <AlertDialogAction variant={confirmVariant} onClick={onConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
