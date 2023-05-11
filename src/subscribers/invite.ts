import { EventBusService } from "@medusajs/medusa"

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
    const HOSTNAME = process.env.HOSTNAME
    this.sendGridService.sendEmail({
      templateId: process.env.SENDGRID_INVITE_USER,
      from: process.env.SENDGRID_FROM,
      to: data.user_email,
      dynamic_template_data: {
        token: data.token,
        user_email: data.user_email,
        HOSTNAME
      }
    })
  }
}

export default InviteSubscriber