import { DotsThreeVerticalIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../shadcn/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../shadcn/dropdown-menu";
import { AlertDialogDestructive } from "./delete-collection-dialog";
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
      <AlertDialogDestructive
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        section={section}
        collectionId={collectionId}
      />
    </div>
  )

}