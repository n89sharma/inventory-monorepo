import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { UploadBidRowsDialog } from './upload-bid-rows-dialog'

const PASTED = 'Serial\tModel\nS1\tC3000'
const PARSED = { headers: ['Serial', 'Model'], rows: [['S1', 'C3000']] }

async function openAndPaste(hasRows: boolean, text = PASTED) {
  const onUpload = vi.fn().mockResolvedValue(undefined)
  render(<UploadBidRowsDialog hasRows={hasRows} onUpload={onUpload} />)
  fireEvent.click(screen.getByRole('button', { name: 'Upload' }))
  fireEvent.change(await screen.findByLabelText('Pasted rows'), { target: { value: text } })
  return onUpload
}

function clickUploadInDialog() {
  const buttons = screen.getAllByRole('button', { name: 'Upload' })
  const dialogButton = buttons[buttons.length - 1]
  if (!dialogButton) throw new Error('Expected the dialog Upload button')
  fireEvent.click(dialogButton)
}

describe('UploadBidRowsDialog', () => {
  it('disables Upload while the text area is empty', async () => {
    await openAndPaste(false, '')
    const buttons = screen.getAllByRole('button', { name: 'Upload' })
    expect(buttons[buttons.length - 1]).toBeDisabled()
  })

  it('uploads straight away when the bid has no rows', async () => {
    const onUpload = await openAndPaste(false)
    clickUploadInDialog()
    await waitFor(() => expect(onUpload).toHaveBeenCalledWith(PARSED))
    expect(screen.queryByText('Replace the existing rows?')).not.toBeInTheDocument()
  })

  it('asks before replacing existing rows', async () => {
    const onUpload = await openAndPaste(true)
    clickUploadInDialog()
    expect(await screen.findByText('Replace the existing rows?')).toBeInTheDocument()
    expect(onUpload).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Replace' }))
    await waitFor(() => expect(onUpload).toHaveBeenCalledWith(PARSED))
  })

  it('sends nothing when the replace confirmation is cancelled', async () => {
    const onUpload = await openAndPaste(true)
    clickUploadInDialog()
    const confirmation = await screen.findByRole('alertdialog')
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Cancel' }))
    await waitFor(() =>
      expect(screen.queryByText('Replace the existing rows?')).not.toBeInTheDocument(),
    )
    expect(onUpload).not.toHaveBeenCalled()
  })
})
