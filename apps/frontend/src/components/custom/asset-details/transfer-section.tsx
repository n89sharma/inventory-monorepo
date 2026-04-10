import { Button } from '@/components/shadcn/button'
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import type { AssetTransfer } from 'shared-types'
import { DataRowContainer, Section, SectionHeader } from './detail-layout'
import { DataDateRow, DataLinkRow, DataValueRow } from './detail-row'
import { OptionalSection } from './optional-section'

interface TransferSectionProps {
  transfers: AssetTransfer[]
}

export function TransferSection({ transfers }: TransferSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const currTransfer = transfers[currentIndex] || null

  function handleNextTransfer() {
    setCurrentIndex((prev) => (prev + 1) % transfers.length)
  }

  function handlePreviousTransfer() {
    setCurrentIndex((prev) => (prev - 1 + transfers.length) % transfers.length)
  }

  return (
    <Section>
      <div className="flex items-center">
        <SectionHeader title="Transfer" />
        {transfers.length > 0 && (
          <div className="flex items-center justify-between w-full ml-10">
            <span className="text-sm font-medium text-muted-foreground">{`${currentIndex + 1}/${transfers.length}`}</span>
            <div>
              <Button variant="outline" size="xs" onClick={handlePreviousTransfer} aria-label="Previous transfer">
                <CaretLeftIcon weight="fill" aria-hidden="true" />
              </Button>
              <Button variant="outline" size="xs" onClick={handleNextTransfer} aria-label="Next transfer">
                <CaretRightIcon weight="fill" aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}
      </div>
      <OptionalSection condition={!!currTransfer} fallback="No transfers on record">
        <DataRowContainer>
          <DataLinkRow label="Transfer #" value={currTransfer?.transfer_number} to={`/transfers/${currTransfer?.transfer_number}`} />
          <DataDateRow label="Transferred On" value={currTransfer?.created_at} />
          <DataValueRow label="Source" value={currTransfer?.source_code} />
          <DataValueRow label="Destination" value={currTransfer?.destination_code} />
          <DataValueRow label="Transporter" value={currTransfer?.transporter} />
        </DataRowContainer>
      </OptionalSection>
    </Section>
  )
}
