import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle
} from "@/components/shadcn/alert-dialog"
import { TrashIcon } from "@phosphor-icons/react"

type AlertDialogDestructiveProps = {
  section: string,
  collectionId: string,
  open?: boolean,
  onOpenChange?: (open: boolean) => void
}

export function AlertDialogDestructive({
  section,
  collectionId,
  open,
  onOpenChange }: AlertDialogDestructiveProps) {

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
            <TrashIcon />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete {`${section} ${collectionId}`}?</AlertDialogTitle>
          <AlertDialogDescription>
            This does not delete the underlying assets present in the collection.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="outline">Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive">Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
