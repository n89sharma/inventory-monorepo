import { app } from './app.js'
import { logger } from './lib/logger.js'
import { startMonthEndSchedule } from './services/monthEndScheduleService.js'

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`)
  startMonthEndSchedule().catch((error: unknown) => {
    logger.error('[month-end] scheduler failed to start', { error })
  })
})
