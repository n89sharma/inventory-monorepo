import express from 'express'
import { createOrganization, getOrganizations } from '../controllers/organizationController.js'

const router = express.Router()

router.get('/', getOrganizations)
router.post('/', createOrganization)

export default router