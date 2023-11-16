import { EventBusService } from "@medusajs/medusa"
import { debugLog } from "../scripts/debug"

const RESEND_USER_INVITE = process.env.RESEND_USER_INVITE
const RESEND_FROM = process.env.RESEND_FROM
const ADMIN_URL = process.env.ADMIN_URL

type InjectedDependencies = {
  eventBusService: EventBusService
  resendService: any
}

class InviteSubscriber {
  protected resendService_: any

  constructor({ 
    eventBusService,
    resendService, 
  }: InjectedDependencies) {
    this.resendService_ = resendService
    eventBusService.subscribe(
      "invite.created", 
      this.handleInvite
    )
  }

  handleInvite = async (data: Record<string, any>) => {
    debugLog("handleInvite running...")
    debugLog("using template ID:", RESEND_USER_INVITE)
    debugLog("sending email to:", data.user_email)
    debugLog("sending email from:", RESEND_FROM)
    debugLog("using ADMIN_URL value:", ADMIN_URL)
    this.resendService_.sendEmail(
      RESEND_USER_INVITE,
      RESEND_FROM,
      data.user_email,
      {
        token: data.token,
        user_email: data.user_email,
        admin_url: ADMIN_URL
      }
    )
  }
}

export default InviteSubscriber
