import type {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/medusa"

import { backupDatabaseToCloud } from "../../../scripts/db-backup-cloud"
import { debugLog } from "../../../scripts/debug"

export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  debugLog("Manually triggered database backup to cloud")
  backupDatabaseToCloud()

  res.json({
    message: "[POST] Backup database to cloud started",
  })
}
