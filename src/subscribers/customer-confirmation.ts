import { CustomerService, SalesChannelService, EventBusService } from "@medusajs/medusa"
import { getProfile, getProfileByEmail, createProfile, updateProfile } from "../scripts/klaviyo"
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
    const store = getStoreDetails(await this.salesChannelService_.retrieve(customer.sales_channel_id));

    debugLog("handleCustomerConfirmation running...")
    if (customer.has_account) {
      debugLog("customer has account...")
      this.sendgridEmail(customer, store)
      this.klaviyoProfile(customer, store)
    }
  }

  // SendGrid Email Handler
  sendgridEmail = (customer: any, store) => {
    debugLog("sending email to:", customer.email)
    debugLog("using template ID:", SENDGRID_CUSTOMER_CONFIRMATION)
    debugLog("using store details:", store)
    debugLog("sending email to:", customer.email)
    this.sendGridService.sendEmail({
      templateId: SENDGRID_CUSTOMER_CONFIRMATION,
      from: SENDGRID_FROM,
      to: customer.email,
      dynamic_template_data: {
        email: customer.email,
        first_name: customer.first_name,
        last_name: customer.last_name,
        store: store,
        /*data*/ /* add in to see the full data object returned by the event */
      },
    })    
  }

  // Klaviyo Profile Handler
  klaviyoProfile = async (customer: any, store) => {
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
          stores: [store], // initialise store as an array as profiles can interact with multiple stores
        }
      }
      const createdProfile = await createProfile(newProfile)
      debugLog("Profile created:", createdProfile)
    } else {
      debugLog("Profile already exists.")
      // see if stores needs updating
      const profile = await getProfile(profiles.data[0].id)
      debugLog("Original profile:", JSON.stringify(profile, null, 2))
      const stores = profile.data.attributes.properties.stores || []

      // Check if the store already exists in the profile based on sales_channel_id
      const storeIndex = stores.findIndex(s => s.sales_channel_id === store.sales_channel_id)

      if (storeIndex !== -1) {
        // Store already exists, update its properties
        stores[storeIndex] = { ...stores[storeIndex], ...store }
      } else {
        // Add the new store to the end of the stores array
        stores.push(store)
      }
      debugLog("Patched stores:", JSON.stringify(stores, null, 2))

      // Construct the patch object with only the necessary fields
      const profilePatch = {
        properties: {
          stores: stores
        }
      };
      debugLog("Patched profile:", JSON.stringify(profilePatch, null, 2))

      // Now, update the profile with the modified/updated 'stores' array
      const updatedProfile = await updateProfile(profile.data.id, profilePatch);
      debugLog("Profile updated:", updatedProfile)
    }
  }
}

export default CustomerConfirmationSubscriber
