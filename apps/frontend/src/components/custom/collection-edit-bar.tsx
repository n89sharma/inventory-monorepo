import { PencilSimpleIcon, DotsThreeVerticalIcon, TrashIcon } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../shadcn/dropdown-menu";
import { Button } from "../shadcn/button";
import { AlertDialogDestructive } from "./delete-collection-dialog";
import { useState } from "react";

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
      {section === 'arrivals' && (
        <Button asChild>
          <Link to={`/${section}/${collectionId}/edit`}><PencilSimpleIcon />Edit</Link>
        </Button>
      )}
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