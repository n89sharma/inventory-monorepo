import { Avatar, AvatarFallback } from '@/components/shadcn/avatar'
import { Button } from '@/components/shadcn/button'
import { Textarea } from '@/components/shadcn/textarea'
import { useAssetStore } from '@/data/store/asset-store'
import { CircleNotchIcon } from '@phosphor-icons/react'
import { useState } from 'react'

type AddCommentInputProps = {
  barcode: string
}

export function AddCommentInput({ barcode }: AddCommentInputProps) {
  const [text, setText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const createComment = useAssetStore(state => state.createComment)

  async function handleSubmit() {
    if (!text.trim() || isSubmitting) return
    setIsSubmitting(true)
    await createComment(barcode, { comment: text.trim() })
    setIsSubmitting(false)
    setText('')
  }

  function handleCancel() {
    setText('')
  }

  return (
    <div className="flex flex-row gap-4 pl-2">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback>DU</AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-2 flex-1">
        <Textarea
          placeholder="Add a comment..."
          value={text}
          onChange={e => setText(e.target.value)}
          className="min-h-18 resize-none"
          maxLength={2000}
          disabled={isSubmitting}
        />
        <div className="flex flex-row gap-2">
          <Button
            size="sm"
            disabled={!text.trim() || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting && <CircleNotchIcon className="animate-spin" size={16} />}
            Comment
          </Button>
          {text.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
