import { cn } from "@/lib/utils"
import { CheckIcon, CopyIcon } from "@phosphor-icons/react"
import { useState } from "react"

type CopyButtonProps = {
  value: string | undefined
  className?: string
}

export function CopyButton({ value, className }: CopyButtonProps): React.JSX.Element {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    if (!value) return
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className={cn("invisible group-hover:visible cursor-pointer", className)}
      aria-label={`Copy ${value}`}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  )
}
