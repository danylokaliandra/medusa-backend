import { Customer, EventBusService } from "@medusajs/medusa"

const SENDGRID_CUSTOMER_CONFIRMATION = process.env.SENDGRID_CUSTOMER_CONFIRMATION
const SENDGRID_FROM = process.env.SENDGRID_FROM
const STORE_URL = process.env.STORE_URL

type InjectedDependencies = {
  eventBusService: EventBusService,
  sendgridService: any
}

class CustomerConfirmationSubscriber {
  protected sendGridService: any

  constructor({
    eventBusService,
    sendgridService,
  }: InjectedDependencies) {
    this.sendGridService = sendgridService
    eventBusService.subscribe(
      "customer.created", 
      this.handleCustomerConfirmation
    )
  }

  handleCustomerConfirmation = async (data: Customer) => {
    this.sendGridService.sendEmail({
      templateId: SENDGRID_CUSTOMER_CONFIRMATION,
      from: SENDGRID_FROM,
      to: data.email,
      dynamic_template_data: {
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        store_url: STORE_URL
        /*data*/ /* add in to see the full data object returned by the event */
      },
    })
  }
}

export default CustomerConfirmationSubscriber
