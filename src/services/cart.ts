import { Lifetime } from "awilix"
import { Customer } from "../models/customer"
import CustomerService from "../services/customer"
import { validateEmail } from "@medusajs/medusa/dist/utils/is-email"
import { CartService as MedusaCartService } from "@medusajs/medusa"
// extra imports for create function
import {
  CartCreateProps,
} from "@medusajs/medusa/dist/types/cart"
import {
  Cart,
} from "@medusajs/medusa/dist/models"
import { DeepPartial, EntityManager } from "typeorm"
import SalesChannelFeatureFlag from "@medusajs/medusa/dist/loaders/feature-flags/sales-channels"
import { isDefined, MedusaError } from "medusa-core-utils"

type InjectedDependencies = {
  customerService: CustomerService
}

class CartService extends MedusaCartService {
  static LIFE_TIME = Lifetime.SCOPED
  protected readonly customerService_: CustomerService = null!; // add initialiser to overwrite from base CartService

  constructor( dependencies: InjectedDependencies ) {
    // @ts-expect-error prefer-rest-params
    super(...arguments)
    
    try {
      this.customerService_ = dependencies.customerService
    } catch (e) {
      // avoid errors when backend first runs
    }
  }

  /**
   * Creates or fetches a user based on an email.
   * Extended from medusa core to retrieve customer
   * matching the sales channel provided in the header.
   * @param email - the email to use
   * @return the resulting customer object
   */
  protected async createOrFetchGuestCustomerFromEmailAndSalesChannel_(
    email: string,
    sales_channel_id: string,
  ): Promise<Customer> {
    
  	console.log("createOrFetchGuestCustomerFromEmail_ running...")
  	console.log("email: ", email)
  	console.log("sales channel id: ", sales_channel_id)
  	
    
    const validatedEmail = validateEmail(email)
    const salesChannelId = sales_channel_id

    const customerServiceTx = this.customerService_.withTransaction(
      this.activeManager_
    )

    let customer = await customerServiceTx
      .retrieveUnregisteredByEmailAndSalesChannel(validatedEmail, salesChannelId)
      .catch(() => undefined)

    if (!customer) {
      customer = await customerServiceTx.create({ email: validatedEmail })
    }

	/*console.log("Email:", email);
	console.log("customerServiceTx:", customerServiceTx);
	console.log("validatedEmail:", validatedEmail);
	console.log("customer:", customer);*/

    console.log("createOrFetchGuestCustomerFromEmail_ completed...")
    return customer
  }

  /**
   * Creates a cart.
   * @param data - the data to create the cart with
   * @return the result of the create operation
   */
  async create(data: CartCreateProps): Promise<Cart | never> {
    return await this.atomicPhase_(
      async (transactionManager: EntityManager) => {
        console.log("create cart function starting...")
        const cartRepo = transactionManager.withRepository(this.cartRepository_)
        const addressRepo = transactionManager.withRepository(
          this.addressRepository_
        )

        const rawCart: DeepPartial<Cart> = {
          context: data.context ?? {},
        }

        if (
          this.featureFlagRouter_.isFeatureEnabled(SalesChannelFeatureFlag.key)
        ) {
          rawCart.sales_channel_id = (
            await this.getValidatedSalesChannel(data.sales_channel_id)
          ).id
        }

        if (data.customer_id) {
          const customer = await this.customerService_
            .withTransaction(transactionManager)
            .retrieve(data.customer_id)
            .catch(() => undefined)
          rawCart.customer = customer
          rawCart.customer_id = customer?.id
          rawCart.email = customer?.email
        }

        if (!rawCart.email && data.email) {
          console.log("prepping to call createOrFetchGuestCustomerFromEmailAndSalesChannel_...")
          console.log(data.email, data.sales_channel_id)
          const customer = await this.createOrFetchGuestCustomerFromEmailAndSalesChannel_(
            data.email, data.sales_channel_id
          )
          rawCart.customer = customer
          rawCart.customer_id = customer.id
          rawCart.email = customer.email
        }

        if (!data.region_id && !data.region) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `A region_id must be provided when creating a cart`
          )
        }

        rawCart.region_id = data.region_id
        const region = data.region
          ? data.region
          : await this.regionService_
              .withTransaction(transactionManager)
              .retrieve(data.region_id!, {
                relations: ["countries"],
              })
        const regCountries = region.countries.map(({ iso_2 }) => iso_2)

        if (!data.shipping_address && !data.shipping_address_id) {
          if (region.countries.length === 1) {
            rawCart.shipping_address = addressRepo.create({
              country_code: regCountries[0],
            })
          }
        } else {
          if (data.shipping_address) {
            if (!regCountries.includes(data.shipping_address.country_code!)) {
              throw new MedusaError(
                MedusaError.Types.NOT_ALLOWED,
                "Shipping country not in region"
              )
            }
            rawCart.shipping_address = data.shipping_address
          }
          if (data.shipping_address_id) {
            const addr = await addressRepo.findOne({
              where: { id: data.shipping_address_id },
            })
            if (
              addr?.country_code &&
              !regCountries.includes(addr.country_code)
            ) {
              throw new MedusaError(
                MedusaError.Types.NOT_ALLOWED,
                "Shipping country not in region"
              )
            }
            rawCart.shipping_address_id = data.shipping_address_id
          }
        }

        if (data.billing_address) {
          if (!regCountries.includes(data.billing_address.country_code!)) {
            throw new MedusaError(
              MedusaError.Types.NOT_ALLOWED,
              "Billing country not in region"
            )
          }
          rawCart.billing_address = data.billing_address
        }
        if (data.billing_address_id) {
          const addr = await addressRepo.findOne({
            where: { id: data.billing_address_id },
          })
          if (addr?.country_code && !regCountries.includes(addr.country_code)) {
            throw new MedusaError(
              MedusaError.Types.NOT_ALLOWED,
              "Billing country not in region"
            )
          }
          rawCart.billing_address_id = data.billing_address_id
        }

        const remainingFields: (keyof Cart)[] = [
          "context",
          "type",
          "metadata",
          "discounts",
          "gift_cards",
        ]

        for (const remainingField of remainingFields) {
          if (isDefined(data[remainingField]) && remainingField !== "object") {
            const key = remainingField as string
            rawCart[key] = data[remainingField]
          }
        }

        const createdCart = cartRepo.create(rawCart)
        const cart = await cartRepo.save(createdCart)
        await this.eventBus_
          .withTransaction(transactionManager)
          .emit(CartService.Events.CREATED, {
            id: cart.id,
          })
        return cart
      }
    )
  }
}

export default CartService
