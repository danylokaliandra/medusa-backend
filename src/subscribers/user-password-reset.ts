import { EventBusService } from "@medusajs/medusa"

const SENDGRID_USER_PASSWORD_RESET = process.env.SENDGRID_USER_PASSWORD_RESET
const SENDGRID_FROM = process.env.SENDGRID_FROM
const ADMIN_URL = process.env.ADMIN_URL

type InjectedDependencies = {
  eventBusService: EventBusService
  sendgridService: any
}

class UserPasswordResetSubscriber {
  protected sendGridService: any

  constructor({ 
    eventBusService,
    sendgridService, 
  }: InjectedDependencies) {
    this.sendGridService = sendgridService
    eventBusService.subscribe(
      "user.password_reset", 
      this.handleUserPasswordReset
    )
  }

  handleUserPasswordReset = async (data: Record<string, any>) => {
    this.sendGridService.sendEmail({
      templateId: SENDGRID_USER_PASSWORD_RESET,
      from: SENDGRID_FROM,
      to: data.email,
      dynamic_template_data: {
        token: data.token,
        user_email: data.email,
        admin_url: ADMIN_URL
        /*data*/ /* add in to see the full data object returned by the event */
      }
    })
  }
}

export default UserPasswordResetSubscriber