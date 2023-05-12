import { EventBusService } from "@medusajs/medusa"

const SENDGRID_INVITE_USER = process.env.SENDGRID_INVITE_USER
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
    this.sendGridService.sendEmail({
      templateId: SENDGRID_INVITE_USER,
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
