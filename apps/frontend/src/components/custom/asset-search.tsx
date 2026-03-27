import { cn } from "@/lib/utils"
import { Button } from '@/components/shadcn/button'
import { Input } from '@/components/shadcn/input'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export const AssetSearch = ({ className }: { className?: string }) => {
  const [barcode, setBarcode] = useState("")
  const [invalid, setInvalid] = useState(false)
  const navigate = useNavigate()

  function handleSearch() {
    if (!barcode) { setInvalid(true); return }
    navigate(`/search/${barcode}`)
  }

  return (
    <form onSubmit={e => { e.preventDefault(); handleSearch() }} className={cn("flex flex-row gap-2", className)}>
      <Input
        type="text"
        name="barcode"
        autoComplete="off"
        placeholder="Search by barcode…"
        value={barcode}
        aria-invalid={invalid}
        onChange={e => { setBarcode(e.target.value.trim()); setInvalid(false) }}
      />
      <Button
        type="submit"
        variant="secondary"
        className="rounded-md"
      >
        Search
      </Button>
    </form>
  )
}
