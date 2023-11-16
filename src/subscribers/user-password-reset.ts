import { EventBusService } from "@medusajs/medusa"
import { debugLog } from "../scripts/debug"

const RESEND_USER_PASSWORD_RESET = process.env.RESEND_USER_PASSWORD_RESET
const RESEND_FROM = process.env.RESEND_FROM
const ADMIN_URL = process.env.ADMIN_URL

type InjectedDependencies = {
  eventBusService: EventBusService
  resendService: any
}

class UserPasswordResetSubscriber {
  protected resendService_: any

  constructor({ 
    eventBusService,
    resendService, 
  }: InjectedDependencies) {
    this.resendService_ = resendService
    eventBusService.subscribe(
      "user.password_reset", 
      this.handleUserPasswordReset
    )
  }

  handleUserPasswordReset = async (data: Record<string, any>) => {
    debugLog("handleUserPasswordReset running...")
    debugLog("using template ID:", RESEND_USER_PASSWORD_RESET)
    debugLog("sending email to:", data.email)
    debugLog("sending email from:", RESEND_FROM)
    debugLog("using ADMIN_URL value:", ADMIN_URL)
    this.resendService_.sendEmail(
      RESEND_USER_PASSWORD_RESET,
      RESEND_FROM,
      data.email,
      {
        token: data.token,
        user_email: data.email,
        admin_url: ADMIN_URL
      }
    )
  }
}

export default UserPasswordResetSubscriber
