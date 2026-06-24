import { UpdateAssetSpecs } from 'shared-types'
import { validateComponentBrands } from '../lib/asset-component-validation.js'
import { NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import { recordAssetUpdate } from './historyService.js'

export async function updateAssetSpecs(
  barcode: string,
  data: UpdateAssetSpecs,
  userId: number,
): Promise<void> {
  const asset = await prisma.asset.findUnique({
    where: { barcode },
    select: {
      id: true,
      readiness_id: true,
      country_of_origin_id: true,
      manufactured_year: true,
      model: { select: { brand_id: true } },
      technical_specification: {
        select: {
          cassettes: true,
          component_id: true,
          meter_black: true,
          meter_colour: true,
          meter_total: true,
          drum_life_c: true,
          drum_life_m: true,
          drum_life_y: true,
          drum_life_k: true,
          toner_life_c: true,
          toner_life_m: true,
          toner_life_y: true,
          toner_life_k: true,
        },
      },
    },
  })
  if (!asset) throw new NotFoundError(`Asset ${barcode} not found`)

  if (data.component_id !== null) {
    await validateComponentBrands(prisma, [
      { componentId: data.component_id, expectedBrandId: asset.model.brand_id },
    ])
  }

  const meter_total = (data.meter_black ?? 0) + (data.meter_colour ?? 0)

  const accessories = await prisma.accessory.findMany({
    where: { accessory: { in: data.accessory_names } },
    select: { id: true },
  })

  await prisma.$transaction([
    prisma.asset.update({
      where: { id: asset.id },
      data: {
        readiness_id: data.readiness_id,
        country_of_origin_id: data.country_of_origin_id,
        manufactured_year: data.manufactured_year,
      },
    }),
    prisma.technicalSpecification.upsert({
      where: { asset_id: asset.id },
      update: {
        cassettes: data.cassettes,
        component_id: data.component_id,
        meter_black: data.meter_black,
        meter_colour: data.meter_colour,
        meter_total,
        drum_life_c: data.drum_life_c,
        drum_life_m: data.drum_life_m,
        drum_life_y: data.drum_life_y,
        drum_life_k: data.drum_life_k,
        toner_life_c: data.toner_life_c,
        toner_life_m: data.toner_life_m,
        toner_life_y: data.toner_life_y,
        toner_life_k: data.toner_life_k,
      },
      create: {
        asset_id: asset.id,
        cassettes: data.cassettes,
        component_id: data.component_id,
        meter_black: data.meter_black,
        meter_colour: data.meter_colour,
        meter_total,
        drum_life_c: data.drum_life_c,
        drum_life_m: data.drum_life_m,
        drum_life_y: data.drum_life_y,
        drum_life_k: data.drum_life_k,
        toner_life_c: data.toner_life_c,
        toner_life_m: data.toner_life_m,
        toner_life_y: data.toner_life_y,
        toner_life_k: data.toner_life_k,
      },
    }),
    prisma.assetAccessory.deleteMany({ where: { asset_id: asset.id } }),
    ...accessories.map((a) =>
      prisma.assetAccessory.create({ data: { asset_id: asset.id, accessory_id: a.id } }),
    ),
  ])

  await recordAssetUpdate(
    asset.id,
    {
      readiness_id: asset.readiness_id,
      country_of_origin_id: asset.country_of_origin_id,
      manufactured_year: asset.manufactured_year,
      cassettes: asset.technical_specification?.cassettes,
      component_id: asset.technical_specification?.component_id,
      meter_black: asset.technical_specification?.meter_black,
      meter_colour: asset.technical_specification?.meter_colour,
      meter_total: asset.technical_specification?.meter_total,
      drum_life_c: asset.technical_specification?.drum_life_c,
      drum_life_m: asset.technical_specification?.drum_life_m,
      drum_life_y: asset.technical_specification?.drum_life_y,
      drum_life_k: asset.technical_specification?.drum_life_k,
      toner_life_c: asset.technical_specification?.toner_life_c,
      toner_life_m: asset.technical_specification?.toner_life_m,
      toner_life_y: asset.technical_specification?.toner_life_y,
      toner_life_k: asset.technical_specification?.toner_life_k,
    },
    {
      readiness_id: data.readiness_id,
      country_of_origin_id: data.country_of_origin_id,
      manufactured_year: data.manufactured_year,
      cassettes: data.cassettes,
      component_id: data.component_id,
      meter_black: data.meter_black,
      meter_colour: data.meter_colour,
      meter_total,
      drum_life_c: data.drum_life_c,
      drum_life_m: data.drum_life_m,
      drum_life_y: data.drum_life_y,
      drum_life_k: data.drum_life_k,
      toner_life_c: data.toner_life_c,
      toner_life_m: data.toner_life_m,
      toner_life_y: data.toner_life_y,
      toner_life_k: data.toner_life_k,
    },
    userId,
  )
}
