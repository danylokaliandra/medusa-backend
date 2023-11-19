import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import AWS from 'aws-sdk';
import os from 'os';
import { debugLog } from "../scripts/debug"

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.BACKUP_S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.BACKUP_S3_SECRET_ACCESS_KEY,
});

const s3 = new AWS.S3({ endpoint: process.env.BACKUP_S3_ENDPOINT });

export async function backupDatabaseToCloud(): Promise<void> {
  // Define the backup directory as the system's temp directory
  const backupDirectory = os.tmpdir();

  // Generate the backup file name
  const timestamp = new Date().toISOString().replace(/[^a-zA-Z0-9]/g, '');
  const backupFileName = `backup-${process.env.NODE_ENV}-${timestamp}.dump.gz`;
  const backupFilePath = path.join(backupDirectory, backupFileName);

  // Execute the database backup command
  try {
    debugLog(`Attempting to backup ${process.env.NODE_ENV} database...`)
    execSync(`pg_dump ${process.env.DATABASE_URL} | gzip > ${backupFilePath}`);
    debugLog(`Backup created for ${process.env.NODE_ENV} database to temporary location ${backupDirectory}.`);

    // Upload the backup to S3
    const fileStream = fs.createReadStream(backupFilePath);
    const uploadParams = {
      Bucket: process.env.BACKUP_S3_BUCKET,
      Key: backupFileName,
      Body: fileStream,
    };
    s3.upload(uploadParams, function(err, data) {
      if (err) {
        console.error(`Error uploading backup to S3: ${err.message}`);
      } else {
        debugLog(`Backup successfully uploaded to S3 at ${data.Location}`);
        // Delete the local backup file after successful upload
        fs.unlinkSync(backupFilePath);
        debugLog(`Local backup file ${backupFilePath} deleted.`);
      }
    });
  } catch (error) {
    console.error(`Error creating backup for ${process.env.NODE_ENV} database: ${error.message}`);
  }
}
