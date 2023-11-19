import { AwilixContainer } from "awilix"
import { backupDatabaseToCloud } from "../scripts/db-backup-cloud"
import { debugLog } from "../scripts/debug"

const scheduledBackupsJob = async (
  container: AwilixContainer,
  options: Record<string, any>
) => {
  const jobSchedulerService = 
    container.resolve("jobSchedulerService")
  jobSchedulerService.create(
    "backup-database-to-cloud", 
    {}, 
    process.env.BACKUP_S3_SCHEDULE, // cron schedule for backup
    async () => {
      debugLog("Job running scheduled database backup to cloud")
      backupDatabaseToCloud()
    }
  )
}

export default scheduledBackupsJob
