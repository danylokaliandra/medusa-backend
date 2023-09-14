import { Lifetime } from "awilix"
import { MedusaError } from "medusa-core-utils"
import { FindConfig, Selector as MedusaSelector } from "@medusajs/medusa/dist/types/common"
import { CustomerService as MedusaCustomerService } from "@medusajs/medusa"
import { Customer } from "../models/customer"
import { buildQuery } from "@medusajs/medusa/dist/utils"
import { CreateCustomerInput as MedusaCreateCustomerInput } from "@medusajs/medusa/dist/types/customers"
import { debugLog } from "../scripts/debug"

type CreateCustomerInput = {
  sales_channel_id?: string;
} & MedusaCreateCustomerInput;

type CustomerFilter = {
  email: string;
  sales_channel_id?: string;
};

class CustomerService extends MedusaCustomerService {
  static LIFE_TIME = Lifetime.SCOPED

  // initialise Sales Channel
  protected readonly salesChannelID_: string | null = null;

  // capture Sales Channel from middleware
  constructor(container, options) {
    // @ts-expect-error prefer-rest-params
    super(...arguments)
    
    try {
      this.salesChannelID_ = container.salesChannelID
    } catch (e) {
      // avoid errors when backend first runs
    }
  }

  public async retrieveBySalesChannel_(
    selector: MedusaSelector<Customer>,
    config: FindConfig<Customer> = {}
  ): Promise<Customer | never> {
    debugLog("retrieveBySalesChannel running...")
    const customerRepo = this.activeManager_.withRepository(
      this.customerRepository_
    )
    const query = buildQuery(selector, config)
    debugLog("query:", query)
    const customer = await customerRepo.findOne(query)
    debugLog("customer retrieved:", customer)

    if (!customer) {
      const selectorConstraints = Object.entries(selector)
        .map((key, value) => `${key}: ${value}`)
        .join(", ")
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Customer with ${selectorConstraints} was not found`
      )
    }
    debugLog("retrieveBySalesChannel success...")
    return customer
  }

  async retrieveUnregisteredByEmailAndSalesChannel(
    email: string,
    sales_channel_id: string,
    config: FindConfig<Customer> = {}
  ): Promise<Customer | never> {
    debugLog("retrieveUnregisteredByEmailAndSalesChannel running...")
    debugLog("email:", email, "storefront sales channel id:", sales_channel_id)
    return await this.retrieveBySalesChannel_(
      { email: email.toLowerCase(), has_account: false, sales_channel_id: sales_channel_id },
      config
    )
  }

  async retrieveRegisteredByEmailAndSalesChannel(
    email: string,
    config: FindConfig<Customer> = {}
  ): Promise<Customer | never> {
    debugLog("retrieveRegisteredByEmailAndSalesChannel running...")
    
    debugLog("email:", email, "storefront sales channel id:", this.salesChannelID_)
    return await this.retrieveBySalesChannel_(
      { email: email.toLowerCase(), has_account: true, sales_channel_id: this.salesChannelID_ },
      config
    )
  }

  async listByEmailAndSalesChannel(
    email: string,
    salesChannelId: string,
    config: FindConfig<Customer> = { relations: [], skip: 0, take: 2 }
  ): Promise<Customer[]> {
    debugLog("listByEmailAndSalesChannel running...")
    debugLog("email:", email, "sales channel id:", salesChannelId)
    const filter: CustomerFilter = {
      email: email.toLowerCase(),
      sales_channel_id: salesChannelId,
    };

    const existing = await this.list(filter, config).catch(() => undefined);
    return existing || [];
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
    debugLog("sales channel id:", this.salesChannelID_)
    return await this.atomicPhase_(async (manager) => {

      const customerRepository = manager.withRepository(
        this.customerRepository_
      )

      customer.email = customer.email.toLowerCase()
      if (!customer.sales_channel_id) { customer.sales_channel_id = this.salesChannelID_ }

      const { email, password } = customer

      // should be a list of customers at this point
      const existing = await this.listByEmailAndSalesChannel(email, this.salesChannelID_).catch(() => undefined)

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

      //else { customer.has_account = false }

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
