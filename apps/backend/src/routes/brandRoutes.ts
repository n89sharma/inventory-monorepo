import express from 'express'
import { createBrand, getBrands } from '../controllers/brandController.js'

const router = express.Router()

router.get('/', getBrands)
router.post('/', createBrand)

export default router
