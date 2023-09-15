const dotenv = require('dotenv');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Project Directory
const projectDir = path.resolve(__dirname, '../..');

// Grab environment variables
const envFile = process.env.NODE_ENV === 'development' ? '.env' : `.env.${process.env.NODE_ENV}`;
const envPath = path.resolve(projectDir, envFile);
if (!fs.existsSync(envPath)) {
  console.error(`Environment file ${envFile} does not exist.`);
  process.exit(1);
}
dotenv.config({ path: envPath });

function backupDatabase() {
  // Define the backup directory
  const backupDirectory = path.resolve(projectDir, 'z_backups')

  // Create the backup directory if it doesn't exist
  if (!fs.existsSync(backupDirectory)) {
    fs.mkdirSync(backupDirectory, { recursive: true });
  }

  // Generate the backup file name
  const timestamp = new Date().toISOString().replace(/[^a-zA-Z0-9]/g, '');
  const backupFileName = `backup-${process.env.NODE_ENV}-${timestamp}.dump`;

  // Execute the database backup command
  try {
    console.log(`Attempting to backup ${process.env.NODE_ENV} database...`)
    execSync(`pg_dump ${process.env.DATABASE_URL} > ${path.join(backupDirectory, backupFileName)}`);
    console.log(`Backup created for ${process.env.NODE_ENV} database to ${backupDirectory}.`);
  } catch (error) {
    console.error(`Error creating backup for ${process.env.NODE_ENV} database: ${error.message}`);
  }
}

// Run the backupDatabase function when script is executed
backupDatabase();
