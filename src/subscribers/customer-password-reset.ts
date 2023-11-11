import { CustomerService, SalesChannelService, EventBusService } from "@medusajs/medusa"
import { getStoreDetails } from "../scripts/sales-channel";
import { debugLog } from "../scripts/debug"

const SENDGRID_CUSTOMER_PASSWORD_RESET = process.env.SENDGRID_CUSTOMER_PASSWORD_RESET
const SENDGRID_FROM = process.env.SENDGRID_FROM

type InjectedDependencies = {
  eventBusService: EventBusService,
  customerService: CustomerService,
  salesChannelService: SalesChannelService,
  sendgridService: any
}

class CustomerPasswordResetSubscriber {
  protected readonly customerService_: CustomerService
  protected readonly salesChannelService_: SalesChannelService
  protected sendGridService: any

  constructor({
    eventBusService,
    customerService,
    salesChannelService,
    sendgridService,
  }: InjectedDependencies) {
    this.customerService_ = customerService
    this.salesChannelService_ = salesChannelService
    this.sendGridService = sendgridService
    eventBusService.subscribe(
      "customer.password_reset", 
      this.handleCustomerPasswordReset
    )
  }

  handleCustomerPasswordReset = async (data: Record<string, any>) => {
    const customer = await this.customerService_.retrieve(data.id)
    const store = getStoreDetails(await this.salesChannelService_.retrieve(customer.sales_channel_id));
    debugLog("handleCustomerPasswordReset running...")
    debugLog("using template ID:", SENDGRID_CUSTOMER_PASSWORD_RESET)
    debugLog("using store details:", store)
    debugLog("sending email to:", data.email)
    this.sendGridService.sendEmail({
      templateId: SENDGRID_CUSTOMER_PASSWORD_RESET,
      from: SENDGRID_FROM,
      to: data.email,
      dynamic_template_data: {
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        token: data.token,
        store: store,
        /*data*/ /* add in to see the full data object returned by the event */
      },
    })
  }
}

export default CustomerPasswordResetSubscriber
