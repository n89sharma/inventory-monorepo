import express from 'express'
import { UserQuerySchema, getUsers } from '../controllers/userController.js'
import { validateQuery } from '../middleware/validation.js'

const router = express.Router()

router.get('/', validateQuery(UserQuerySchema), getUsers)

export default router
