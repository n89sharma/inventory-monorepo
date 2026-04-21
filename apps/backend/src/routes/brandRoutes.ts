import express from 'express'
import { createBrand, getBrands } from '../controllers/brandController.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = express.Router()

router.use(requireAuth)

router.get('/', getBrands)
router.post('/', createBrand)

export default router
