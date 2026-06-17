import { CreateSalvagedPart } from 'shared-types'
import { NotFoundError, ValidationError } from '../lib/errors.js'
import { prisma } from '../prisma.js'

export async function createAssetSalvagedPart(
  recipientBarcode: string,
  data: CreateSalvagedPart,
  userId: number
): Promise<void> {
  if (data.donor_barcode === recipientBarcode) {
    throw new ValidationError('Donor and recipient cannot be the same asset')
  }
  const recipient = await prisma.asset.findUnique({
    where: { barcode: recipientBarcode },
    select: { id: true }
  })
  if (!recipient) throw new NotFoundError(`Asset ${recipientBarcode} not found`)

  const donor = await prisma.asset.findUnique({
    where: { barcode: data.donor_barcode },
    select: { id: true }
  })
  if (!donor) throw new NotFoundError(`Donor asset ${data.donor_barcode} not found`)

  await prisma.assetSalvagedPart.create({
    data: {
      recipient_asset_id: recipient.id,
      donor_asset_id: donor.id,
      part: data.part,
      is_exchange: data.is_exchange,
      notes: data.notes,
      fixed_at: new Date(),
      fixed_by: userId
    }
  })
}
