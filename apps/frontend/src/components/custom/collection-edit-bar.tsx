import { DotsThreeVerticalIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertDialogDescription } from "../shadcn/alert-dialog";
import { Button } from "../shadcn/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../shadcn/dropdown-menu";
import { DeleteEntityDialog } from "./delete-entity-dialog";
import { ShareButton } from "./share-button";

type CollectionEditBarProps = {
  section: string,
  collectionId: string
}
export function CollectionEditBar({
  section,
  collectionId }: CollectionEditBarProps): React.JSX.Element {

  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <div className="flex gap-2">
      <ShareButton />
      <Button asChild>
        <Link to={`/${section}/${collectionId}/edit`}><PencilSimpleIcon />Edit</Link>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" aria-label="More options">
            <DotsThreeVerticalIcon aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
            <TrashIcon />Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteEntityDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        entity={section}
        entityId={collectionId}
      >
        <AlertDialogDescription>
          This does not delete the underlying assets present in the collection.
        </AlertDialogDescription>
      </DeleteEntityDialog>
    </div>
  )

}