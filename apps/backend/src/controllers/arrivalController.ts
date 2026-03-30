import { NextFunction, Request, Response } from 'express'
import { ArrivalDetail, ArrivalSummary, CreateArrivalSchema } from 'shared-types'
import { z } from 'zod'
import { getArrivals as getArrivalsDb, getAssetsForArrival as getAssetsForArrivalDb } from '../../generated/prisma/sql.js'
import { DateRangeWithWarehouseSchema } from '../middleware/validation.js'
import { prisma } from '../prisma.js'
import { createArrival as createArrivalSer, updateArrival as updateArrivalSer } from '../services/arrivalService.js'

export async function getArrivals(
  req: Request,
  res: Response<ArrivalSummary[] | { error: string }>) {
  try {
    const { fromDate, toDate, warehouse } = res.locals.query as z.infer<typeof DateRangeWithWarehouseSchema>
    const arrivals = await prisma.$queryRawTyped(getArrivalsDb(fromDate, toDate, warehouse ?? 0))
    res.json(arrivals)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch arrivals' })
  }
}

export async function getArrival(
  req: Request,
  res: Response<ArrivalDetail | { error: string }>) {

  const { arrivalNumber } = req.params
  try {
    const [arrival, assets] = await Promise.all([
      prisma.arrival.findUnique({
        where: { arrival_number: arrivalNumber },
        include: { origin: true, destination: true, transporter: true, created_by: true }
      }),
      prisma.$queryRawTyped(getAssetsForArrivalDb(arrivalNumber))
    ])

    if (!arrival) {
      res.status(404).json({ error: `Arrival ${arrivalNumber} not found` })
      return
    }

    res.json({
      arrival_number: arrival.arrival_number,
      vendor: arrival.origin,
      transporter: arrival.transporter,
      warehouse: arrival.destination,
      comment: arrival.notes,
      created_at: arrival.created_at,
      created_by: arrival.created_by?.email,
      assets,
    })
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch arrival ${arrivalNumber}` })
  }
}

export async function createArrival(
  req: Request,
  res: Response<{ arrivalNumber: string }>,
  next: NextFunction) {

  try {
    const validatedArrival = CreateArrivalSchema.parse(req.body)
    const arrivalNumber = await createArrivalSer(validatedArrival)
    res.status(201).json({ arrivalNumber: arrivalNumber })
  } catch (error) {
    next(error)
  }
}

export async function getArrivalForEdit(req: Request, res: Response) {
  const { arrivalNumber } = req.params
  try {
    const arrival = await prisma.arrival.findUnique({
      where: { arrival_number: arrivalNumber },
      include: {
        origin: true,
        destination: true,
        transporter: true,
        assets: {
          include: {
            technical_specification: true,
            asset_accessories: true
          }
        }
      }
    })

    if (!arrival) {
      res.status(404).json({ error: `Arrival ${arrivalNumber} not found` })
      return
    }

    res.json({
      id: arrival.id,
      arrivalNumber: arrival.arrival_number,
      vendorId: arrival.origin_id,
      transporterId: arrival.transporter_id,
      warehouseId: arrival.destination_id,
      comment: arrival.notes ?? '',
      assets: arrival.assets.map(asset => ({
        id: asset.id,
        barcode: asset.barcode,
        modelId: asset.model_id,
        serialNumber: asset.serial_number,
        meterBlack: Number(asset.technical_specification?.meter_black ?? 0),
        meterColour: Number(asset.technical_specification?.meter_colour ?? 0),
        cassettes: asset.technical_specification?.cassettes ?? null,
        technicalStatusId: asset.technical_status_id,
        internalFinisher: asset.technical_specification?.internal_finisher ?? '',
        coreFunctionIds: asset.asset_accessories.map(aa => aa.accessory_id)
      }))
    })
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch arrival ${arrivalNumber} for edit` })
  }
}

export async function updateArrival(
  req: Request,
  res: Response<{ arrivalNumber: string }>,
  next: NextFunction) {

  const { arrivalNumber } = req.params
  try {
    const validated = CreateArrivalSchema.parse(req.body)
    await updateArrivalSer(validated)
    res.json({ arrivalNumber })
  } catch (error) {
    next(error)
  }
}