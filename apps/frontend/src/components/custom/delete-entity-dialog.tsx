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
import { TrashIcon } from "@phosphor-icons/react"
import type { ReactNode } from "react"

type DeleteEntityDialogProps = {
  entity: string,
  entityId: string,
  children?: ReactNode,
  open?: boolean,
  onOpenChange?: (open: boolean) => void
}

export function DeleteEntityDialog({
  entity,
  entityId,
  children,
  open,
  onOpenChange }: DeleteEntityDialogProps) {

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
            <TrashIcon />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete {`${entity} ${entityId}`}?</AlertDialogTitle>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel variant="outline">Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive">Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
