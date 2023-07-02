import { Lifetime } from "awilix"
import { Customer } from "../models/customer"
import CustomerService from "../services/customer"
import { validateEmail } from "@medusajs/medusa/dist/utils/is-email"
import { CartService as MedusaCartService } from "@medusajs/medusa"
// extra imports for create function
import {
  CartCreateProps,
  CartUpdateProps
} from "@medusajs/medusa/dist/types/cart"
import {
  Cart,
  DiscountRuleType
} from "@medusajs/medusa/dist/models"
import { DeepPartial, EntityManager } from "typeorm"
import SalesChannelFeatureFlag from "@medusajs/medusa/dist/loaders/feature-flags/sales-channels"
import { isDefined, MedusaError } from "medusa-core-utils"
import { setMetadata } from "@medusajs/medusa/dist/utils"

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
    
  	console.log("createOrFetchGuestCustomerFromEmailAndSalesChannel_ running...")
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
      customer = await customerServiceTx.create({ email: validatedEmail, sales_channel_id: salesChannelId })
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
        console.log("grabbing raw cart?...")

        const rawCart: DeepPartial<Cart> = {
          context: data.context ?? {},
        }
        
        console.log("grabbing sales channel?...", rawCart)
        if (
          this.featureFlagRouter_.isFeatureEnabled(SalesChannelFeatureFlag.key)
        ) {
          rawCart.sales_channel_id = (
            await this.getValidatedSalesChannel(data.sales_channel_id)
          ).id
        }

        console.log("grabbing customer details?...", data)
        if (data.customer_id) {
          const customer = await this.customerService_
            .withTransaction(transactionManager)
            .retrieve(data.customer_id)
            .catch(() => undefined)
          rawCart.customer = customer
          rawCart.customer_id = customer?.id
          rawCart.email = customer?.email
        }
        
        console.log(rawCart, data)
        if (!rawCart.email && data.email) {
          console.log("prepping to call createOrFetchGuestCustomerFromEmailAndSalesChannel_ from cart create function...")
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

  async update(cartId: string, data: CartUpdateProps): Promise<Cart> {
    return await this.atomicPhase_(
      async (transactionManager: EntityManager) => {
        console.log("starting update cart function")
        const cartRepo = transactionManager.withRepository(this.cartRepository_)
        const relations = [
          "items",
          "items.variant",
          "items.variant.product",
          "shipping_methods",
          "shipping_methods.shipping_option",
          "shipping_address",
          "billing_address",
          "gift_cards",
          "customer",
          "region",
          "payment_sessions",
          "region.countries",
          "discounts",
          "discounts.rule",
        ]

        if (
          this.featureFlagRouter_.isFeatureEnabled(
            SalesChannelFeatureFlag.key
          ) &&
          data.sales_channel_id
        ) {
          relations.push("items.variant", "items.variant.product")
        }

        console.log("data during update", data)

        const cart = await this.retrieve(cartId, {
          relations,
        })
        console.log("cart before customer is created:")
        console.log(cart)

        const originalCartCustomer = { ...(cart.customer ?? {}) }
        if (data.customer_id) {
          await this.updateCustomerId_(cart, data.customer_id)
        } else if (isDefined(data.email)) {
          console.log("prepping to call createOrFetchGuestCustomerFromEmailAndSalesChannel_ from cart update function...")
          console.log(data.email, cart.sales_channel_id)
          const customer = await this.createOrFetchGuestCustomerFromEmailAndSalesChannel_(
            data.email, cart.sales_channel_id
          )
          cart.customer = customer
          cart.customer_id = customer.id
          cart.email = customer.email
        }
        console.log("cart after customer is created:")
        console.log(cart)


        if (isDefined(data.customer_id) || isDefined(data.region_id)) {
          await this.updateUnitPrices_(cart, data.region_id, data.customer_id)
        }

        if (isDefined(data.region_id)) {
          const shippingAddress =
            typeof data.shipping_address !== "string"
              ? data.shipping_address
              : {}
          const countryCode =
            (data.country_code || shippingAddress?.country_code) ?? null
          await this.setRegion_(cart, data.region_id, countryCode)
        }

        const addrRepo = transactionManager.withRepository(
          this.addressRepository_
        )

        const billingAddress = data.billing_address_id ?? data.billing_address
        if (billingAddress !== undefined) {
          await this.updateBillingAddress_(cart, billingAddress, addrRepo)
        }

        const shippingAddress =
          data.shipping_address_id ?? data.shipping_address
        if (shippingAddress !== undefined) {
          await this.updateShippingAddress_(cart, shippingAddress, addrRepo)
        }

        if (
          this.featureFlagRouter_.isFeatureEnabled(
            SalesChannelFeatureFlag.key
          ) &&
          isDefined(data.sales_channel_id) &&
          data.sales_channel_id != cart.sales_channel_id
        ) {
          await this.onSalesChannelChange(cart, data.sales_channel_id)
          cart.sales_channel_id = data.sales_channel_id
        }

        if (isDefined(data.discounts) && data.discounts.length) {
          const previousDiscounts = [...cart.discounts]
          cart.discounts.length = 0

          await this.applyDiscounts(
            cart,
            data.discounts.map((d) => d.code)
          )

          const hasFreeShipping = cart.discounts.some(
            ({ rule }) => rule?.type === DiscountRuleType.FREE_SHIPPING
          )

          // if we previously had a free shipping discount and then removed it,
          // we need to update shipping methods to original price
          if (
            previousDiscounts.some(
              ({ rule }) => rule.type === DiscountRuleType.FREE_SHIPPING
            ) &&
            !hasFreeShipping
          ) {
            await this.adjustFreeShipping_(cart, false)
          }

          if (hasFreeShipping) {
            await this.adjustFreeShipping_(cart, true)
          }
        } else if (isDefined(data.discounts) && !data.discounts.length) {
          cart.discounts.length = 0
          await this.refreshAdjustments_(cart)
        }

        if ("gift_cards" in data) {
          cart.gift_cards = []

          await Promise.all(
            (data.gift_cards ?? []).map(async ({ code }) => {
              return this.applyGiftCard_(cart, code)
            })
          )
        }

        if (data?.metadata) {
          cart.metadata = setMetadata(cart, data.metadata)
        }

        if ("context" in data) {
          const prevContext = cart.context || {}
          cart.context = {
            ...prevContext,
            ...data.context,
          }
        }

        if ("completed_at" in data) {
          cart.completed_at = data.completed_at!
        }

        if ("payment_authorized_at" in data) {
          cart.payment_authorized_at = data.payment_authorized_at!
        }

        const updatedCart = await cartRepo.save(cart)

        if (
          (data.email && data.email !== originalCartCustomer.email) ||
          (data.customer_id && data.customer_id !== originalCartCustomer.id)
        ) {
          await this.eventBus_
            .withTransaction(transactionManager)
            .emit(CartService.Events.CUSTOMER_UPDATED, updatedCart.id)
        }

        await this.eventBus_
          .withTransaction(transactionManager)
          .emit(CartService.Events.UPDATED, updatedCart)

        return updatedCart
      }
    )
  }
}

export default CartService
