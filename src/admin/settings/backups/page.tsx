import type { SettingConfig } from "@medusajs/admin"
import { Container, Button } from "@medusajs/ui"
import { ServerStack } from "@medusajs/icons"
import { useAdminCustomPost } from "medusa-react"
import { useLocation, Link } from 'react-router-dom';

const BackupsSettingPage = () => {
  const location = useLocation();
  const settingsLocation = location.pathname.replace(/\/backups$/, '');

  const { mutate } = useAdminCustomPost(
    `/admin/backup`,
    ["manual-backup"]
  )

  const handleBackup = (eventName) => {
    mutate({})
  }
  
  return (
    <div>
      <Link to={settingsLocation}>
        <button className="px-small py-xsmall mb-xsmall">
          <div className="gap-x-xsmall text-grey-50 inter-grey-40 inter-small-semibold flex items-center">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3.75 10H16.875" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>
              <path d="M8.125 5L3.125 10L8.125 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
            <span className="ml-1">Back to settings</span>
          </div>
        </button>
      </Link>
      <Container>
      <div>
        <Button onClick={handleBackup}>Backup Database to Cloud</Button>
      </div>
      </Container>
    </div>
  )
}

export const config: SettingConfig = {
  card: {
    label: "Backups",
    description: "Manage backups",
    icon: ServerStack,
  },
}

export default BackupsSettingPage
