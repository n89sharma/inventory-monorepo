import express from 'express'
import { getReferenceData } from '../controllers/referenceController.js'

const router = express.Router()

router.get('/', getReferenceData)

export default router
