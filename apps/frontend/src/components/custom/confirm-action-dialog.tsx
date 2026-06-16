import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle
} from "@/components/shadcn/alert-dialog"
import type { Button } from "@/components/shadcn/button"
import type { ComponentProps, ReactNode } from "react"

type ButtonVariant = ComponentProps<typeof Button>["variant"]

type ConfirmActionDialogProps = {
  title: string
  confirmLabel: string
  icon: ReactNode
  onConfirm: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  confirmVariant?: ButtonVariant
  children?: ReactNode
}

export function ConfirmActionDialog({
  title,
  confirmLabel,
  icon,
  onConfirm,
  open,
  onOpenChange,
  confirmVariant = "default",
  children,
}: ConfirmActionDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia>{icon}</AlertDialogMedia>
          <AlertDialogTitle>{title}</AlertDialogTitle>
        </AlertDialogHeader>
        {children}
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
