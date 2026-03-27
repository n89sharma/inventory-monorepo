import express from 'express';
import { prisma } from '../prisma.js'

const router = express.Router();

router.get('/', async (req, res) => {

  const accessories = await prisma.accessory.findMany()
  const assetTypes = await prisma.assetType.findMany()
  const trackingStatuses = await prisma.trackingStatus.findMany()
  const availabilityStatuses = await prisma.availabilityStatus.findMany()
  const technicalStatuses = await prisma.technicalStatus.findMany()
  const roles = await prisma.role.findMany()
  const invoiceTypes = await prisma.invoiceType.findMany()
  const warehouses = await prisma.warehouse.findMany()

  res.json({
    coreFunctions: accessories,
    assetTypes: assetTypes,
    trackingStatuses: trackingStatuses,
    availabilityStatuses: availabilityStatuses,
    technicalStatuses: technicalStatuses,
    roles: roles,
    invoiceTypes: invoiceTypes,
    warehouses: warehouses
  })
})

export default router;
