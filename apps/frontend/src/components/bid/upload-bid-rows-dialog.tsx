import { Button } from '@/components/shadcn/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/shadcn/dialog'
import { AlertDialogDescription } from '@/components/shadcn/alert-dialog'
import { BidSheetPasteFields } from '@/components/bid/bid-sheet-paste-fields'
import { ConfirmActionDialog } from '@/components/shared/confirm-action-dialog'
import { parseBidPaste } from '@/lib/bid-paste'
import { SpinnerGapIcon, UploadSimpleIcon, WarningIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import type { UploadBidRows } from 'shared-types'
import { toast } from 'sonner'

interface UploadBidRowsDialogProps {
  hasRows: boolean
  onUpload: (upload: UploadBidRows) => Promise<void>
}

export function UploadBidRowsDialog({
  hasRows,
  onUpload,
}: UploadBidRowsDialogProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [firstRowIsHeaders, setFirstRowIsHeaders] = useState(true)
  const [pendingUpload, setPendingUpload] = useState<UploadBidRows | null>(null)
  const [uploading, setUploading] = useState(false)

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen)
    if (newOpen) return
    setText('')
    setFirstRowIsHeaders(true)
  }

  async function send(upload: UploadBidRows) {
    setUploading(true)
    try {
      await onUpload(upload)
      handleOpenChange(false)
    } catch {
      // interceptor surfaced the error toast — keep the dialog open
    } finally {
      setUploading(false)
    }
  }

  function handleUpload() {
    const result = parseBidPaste(text, firstRowIsHeaders)
    if (!result.ok) {
      toast.error(result.error, { position: 'top-center' })
      return
    }
    if (hasRows) {
      setPendingUpload(result.upload)
      return
    }
    void send(result.upload)
  }

  function confirmReplace() {
    const upload = pendingUpload
    setPendingUpload(null)
    if (upload !== null) void send(upload)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={uploading ? undefined : handleOpenChange}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <UploadSimpleIcon />
            Upload
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Upload vendor sheet</DialogTitle>
            <DialogDescription>
              Paste the rows copied from the vendor's spreadsheet.
            </DialogDescription>
          </DialogHeader>
          <BidSheetPasteFields
            text={text}
            onTextChange={setText}
            firstRowIsHeaders={firstRowIsHeaders}
            onFirstRowIsHeadersChange={setFirstRowIsHeaders}
          />
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => handleOpenChange(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleUpload} disabled={uploading || text.trim() === ''}>
              {uploading && <SpinnerGapIcon className="animate-spin" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmActionDialog
        open={pendingUpload !== null}
        onOpenChange={(newOpen) => {
          if (!newOpen) setPendingUpload(null)
        }}
        title="Replace the existing rows?"
        confirmLabel="Replace"
        confirmVariant="destructive"
        icon={<WarningIcon />}
        onConfirm={confirmReplace}
      >
        <AlertDialogDescription>
          Every current row and its pricing will be lost.
        </AlertDialogDescription>
      </ConfirmActionDialog>
    </>
  )
}
