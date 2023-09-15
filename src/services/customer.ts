import { Lifetime } from "awilix"
import { MedusaError } from "medusa-core-utils"
import { CustomerService as MedusaCustomerService } from "@medusajs/medusa"
import { Customer } from "../models/customer"
import { CreateCustomerInput as MedusaCreateCustomerInput } from "@medusajs/medusa/dist/types/customers"
import { debugLog } from "../scripts/debug"

type CreateCustomerInput = {
  sales_channel_id?: string;
} & MedusaCreateCustomerInput;

class CustomerService extends MedusaCustomerService {
  static LIFE_TIME = Lifetime.SCOPED
  protected readonly salesChannelID_: string | null = null;

  // capture Sales Channel from middleware
  constructor( container ) {
    // @ts-expect-error prefer-rest-params
    super(...arguments)
    
    try {
      this.salesChannelID_ = container.salesChannelID;
    } catch (e) {
      // avoid errors when backend first runs
    }
  }

  /**
   * Generate a JSON Web token, that will be sent to a customer, that wishes to
   * reset password.
   * The token will be signed with the customer's current password hash as a
   * secret a long side a payload with userId and the expiry time for the token,
   * which is always 15 minutes.
   * Extended from medusa core to check the sales channel from request header
   * captured in middleware in order to avoid sending password reset to customers
   * in different sales channels.
   * @param {string} customerId - the customer to reset the password for
   * @return {string} the generated JSON web token
   */
   async generateResetPasswordToken(customer_id: string) {
    debugLog("customer.generateResetPasswordToken running...")
    debugLog("customer_id:", customer_id)
    const customer = await this.retrieve(customer_id)
    debugLog("customer sales channel ID:", customer.sales_channel_id)
    debugLog("store sales channel ID:", this.salesChannelID_)

    if (customer.sales_channel_id != this.salesChannelID_) {
      debugLog("customer does not exist in the sales channel, exiting")
      throw new Error("Customer does not exist in the correct sales channel")
    }
    debugLog("customer exists, proceeding to generate reset token") 
    debugLog("running super.generateResetPasswordToken...")
    return super.generateResetPasswordToken(customer_id)
  }

  /**
   * Creates a customer from an email - customers can have accounts associated,
   * e.g. to login and view order history, etc. If a password is provided the
   * customer will automatically get an account, otherwise the customer is just
   * used to hold details of customers. Extended from medusa core to take sales
   * channel from request header captured in middleware to allow one customer
   * per email (regular and guest) per sales channel.
   * @param {object} customer - the customer to create
   * @return {Promise} the result of create
   */
  async create(customer: CreateCustomerInput): Promise<Customer> {
    debugLog("customer.create running...")
    debugLog("customer object:", customer)
    debugLog("customer.sales_channel_id:", customer.sales_channel_id)
    debugLog("sales channel ID registered through middleware", this.salesChannelID_)
    return await this.atomicPhase_(async (manager) => {

      const customerRepository = manager.withRepository(
        this.customerRepository_
      )

      customer.email = customer.email.toLowerCase()

      // set customer.sales_channel_id using the sales channel registered in middleware
      if (!customer.sales_channel_id) { 
        debugLog ("customer.sales_channel_id not set, assigning with value:", this.salesChannelID_)
        customer.sales_channel_id = this.salesChannelID_
      }

      const { email, password } = customer

      // generate a list of customers (registered and guest) with this email in this sales channel
      debugLog ("returning list of customers with email and sales channel ID")  
      const existing = await this.list({ email, sales_channel_id: this.salesChannelID_ }).catch(() => undefined)
      debugLog("existing customers:", existing)

      // should validate that "existing.some(acc => acc.has_account) && password"
      if (existing) {
        if (existing.some((customer) => customer.has_account) && password) {
          throw new MedusaError(
            MedusaError.Types.DUPLICATE_ERROR,
            "A customer with the given email already has an account. Log in instead"
          )
        } else if (
          existing?.some((customer) => !customer.has_account) && !password) {
          throw new MedusaError(
            MedusaError.Types.DUPLICATE_ERROR,
            "Guest customer with email already exists"
          )
        }
      }

      if (password) {
        const hashedPassword = await this.hashPassword_(password)
        customer.password_hash = hashedPassword
        customer.has_account = true
        delete customer.password
      }

      debugLog("calling customer.create with props:", "email:", customer.email, "has_account:", customer.has_account, "sales channel id:", customer.sales_channel_id)

      const created = customerRepository.create(customer)
      const result = await customerRepository.save(created)
      await this.eventBusService_
        .withTransaction(manager)
        .emit(CustomerService.Events.CREATED, result)

      return result
    })
  }
}

export default CustomerService
