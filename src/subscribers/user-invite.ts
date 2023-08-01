import { EventBusService } from "@medusajs/medusa"
import { debugLog } from "../scripts/debug"

const SENDGRID_USER_INVITE = process.env.SENDGRID_USER_INVITE
const SENDGRID_FROM = process.env.SENDGRID_FROM
const ADMIN_URL = process.env.ADMIN_URL

type InjectedDependencies = {
  eventBusService: EventBusService
  sendgridService: any
}

class InviteSubscriber {
  protected sendGridService: any

  constructor({ 
    eventBusService,
    sendgridService, 
  }: InjectedDependencies) {
    this.sendGridService = sendgridService
    eventBusService.subscribe(
      "invite.created", 
      this.handleInvite
    )
  }

  handleInvite = async (data: Record<string, any>) => {
    debugLog("handleInvite running...")
    debugLog("using ADMIN_URL value:", ADMIN_URL)
    debugLog("using template ID:", SENDGRID_USER_INVITE)
    debugLog("sending email to:", data.user_email)
    this.sendGridService.sendEmail({
      templateId: SENDGRID_USER_INVITE,
      from: SENDGRID_FROM,
      to: data.user_email,
      dynamic_template_data: {
        token: data.token,
        user_email: data.user_email,
        admin_url: ADMIN_URL
        /*data*/ /* add in to see the full data object returned by the event */
      }
    })
  }
}

export default InviteSubscriber
