import { CustomerService, SalesChannelService, EventBusService } from "@medusajs/medusa"
import { getStoreDetails } from "../scripts/sales-channel";
import { debugLog } from "../scripts/debug"

const RESEND_CUSTOMER_PASSWORD_RESET = process.env.RESEND_CUSTOMER_PASSWORD_RESET


type InjectedDependencies = {
  eventBusService: EventBusService,
  customerService: CustomerService,
  salesChannelService: SalesChannelService,
  resendService: any
}

class CustomerPasswordResetSubscriber {
  protected readonly customerService_: CustomerService
  protected readonly salesChannelService_: SalesChannelService
  protected resendService_: any

  constructor({
    eventBusService,
    customerService,
    salesChannelService,
    resendService,
  }: InjectedDependencies) {
    this.customerService_ = customerService
    this.salesChannelService_ = salesChannelService
    this.resendService_ = resendService
    eventBusService.subscribe(
      "customer.password_reset", 
      this.handleCustomerPasswordReset
    )
  }

  handleCustomerPasswordReset = async (data: Record<string, any>) => {
    const customer = await this.customerService_.retrieve(data.id)
    const store = getStoreDetails(await this.salesChannelService_.retrieve(customer.sales_channel_id));
    debugLog("handleCustomerPasswordReset running...")
    debugLog("using template ID:", RESEND_CUSTOMER_PASSWORD_RESET)
    debugLog("sending email to:", data.email)
    debugLog("sending email from:", store.store_email)
    debugLog("using store details:", store)
    this.resendService_.sendEmail(
      RESEND_CUSTOMER_PASSWORD_RESET,
      store.store_email,
      data.email,
      {
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        token: data.token,
        store: store,
      },
    )
  }
}

export default CustomerPasswordResetSubscriber
