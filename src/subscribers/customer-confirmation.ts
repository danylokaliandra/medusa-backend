import { CustomerService, SalesChannelService, EventBusService } from "@medusajs/medusa"
import { getProfileByEmail, createProfile } from "../scripts/klaviyo"
import { getStoreDetails } from "../scripts/sales-channel";
import { debugLog } from "../scripts/debug"

const SENDGRID_CUSTOMER_CONFIRMATION = process.env.SENDGRID_CUSTOMER_CONFIRMATION
const SENDGRID_FROM = process.env.SENDGRID_FROM

type InjectedDependencies = {
  eventBusService: EventBusService,
  customerService: CustomerService,
  salesChannelService: SalesChannelService,
  sendgridService: any
}

class CustomerConfirmationSubscriber {
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
      "customer.created", 
      this.handleCustomerConfirmation
    )
  }

  handleCustomerConfirmation = async (data: Record<string, any>) => {
    const customer = await this.customerService_.retrieve(data.id)
    const sales_channel = await this.salesChannelService_.retrieve(data.sales_channel_id)
    const { store_name, store_url } = getStoreDetails(sales_channel);

    debugLog("handleCustomerConfirmation running...")
    if (customer.has_account) {
      debugLog("customer has account...")
      this.sendgridEmail(customer, store_name, store_url)
      this.klaviyoCreateProfile(customer, store_name, store_url)
    }
  }

  // SendGrid Email Handler
  sendgridEmail = (customer: any, store_name, store_url) => {
    debugLog("sending email to:", customer.email)
    debugLog("using template ID:", SENDGRID_CUSTOMER_CONFIRMATION)
    debugLog("using store_name:", store_name)
    debugLog("using store_url:", store_url)
    
    this.sendGridService.sendEmail({
      templateId: SENDGRID_CUSTOMER_CONFIRMATION,
      from: SENDGRID_FROM,
      to: customer.email,
      dynamic_template_data: {
        email: customer.email,
        first_name: customer.first_name,
        last_name: customer.last_name,
        store_name: store_name,
        store_url: store_url,
        store_logo: store_url + "/favicon.ico",
        /*data*/ /* add in to see the full data object returned by the event */
      },
    })    
  }

  // Klaviyo Profile Handler
  klaviyoCreateProfile = async (customer: any, store_name, store_url) => {
    // Check if profile exists
    debugLog("Check if profile exists in Klaviyo...")
    const profiles = await getProfileByEmail(customer.email)
    debugLog("Profiles returned:", profiles)
    debugLog("Profiles returned (0 or 1):", profiles.data.length)

    // If profile does not exist, create it
    if (!profiles.data.length) {
      debugLog("Klaviyo profile does not exist, creating...")
      const newProfile = {
        email: customer.email,
        first_name: customer.first_name,
        last_name: customer.last_name,
        // phone_number: customer.phone,
        // Add more attributes if needed
        properties: {
          store_name: store_name,
          store_url: store_url,
        }
      }
      const createdProfile = await createProfile(newProfile)
      debugLog("Profile created:", createdProfile)
    } else {
      debugLog("Profile already exists.")
    }
  }
}

export default CustomerConfirmationSubscriber
