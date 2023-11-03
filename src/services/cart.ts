import { Lifetime } from "awilix"
import CustomerService from "../services/customer"
import { CartService as MedusaCartService, Cart, OrderService } from "@medusajs/medusa"
import { MedusaError } from "medusa-core-utils"
import { getAmount } from "../scripts/get-amount"

type InjectedDependencies = {
  customerService: CustomerService
  orderService: OrderService
}

class CartService extends MedusaCartService {
  static LIFE_TIME = Lifetime.SCOPED
  protected readonly customerService_: CustomerService = null!; // add initialiser to overwrite from base CartService
  protected readonly orderService_: OrderService = null!;

  constructor( dependencies: InjectedDependencies ) {
    // @ts-expect-error prefer-rest-params
    super(...arguments)

    try {
      this.customerService_ = dependencies.customerService
      this.orderService_ = dependencies.orderService
    } catch (e) {
      // avoid errors when backend first runs
    }
  }

  async applyDiscounts(cart: Cart, discountCodes: string[]) {
    console.log("running extended applyDiscounts code")
    for (const discountCode of discountCodes) {
      // Fetch the discount details
      const discount = await this.discountService_.retrieveByCode(discountCode);

      // Check for any special conditions in the metadata
      if (discount.metadata && Object.keys(discount.metadata).length > 0) {
        // Check if the discount has a maximum uses per customer condition
        if (discount.metadata.maximum_uses_per_customer) {
          // Check if the user is logged in
          if (!cart.customer_id) {
            throw new MedusaError(MedusaError.Types.INVALID_ARGUMENT, "You must be logged in to use this discount");
          }

          // Fetch the customer's orders
          const orders = await this.orderService_.list({ customer_id: cart.customer_id });

          // Count how many times the discount has been used by the customer
          const discountUses = orders.reduce((count, order) => {
            return count + order.discounts.filter(discount => discount.code === discountCode).length;
          }, 0);

          // If the discount has been used the maximum number of times, throw an error
          if (discountUses >= discount.metadata.maximum_uses_per_customer) {
            throw new MedusaError(MedusaError.Types.INVALID_ARGUMENT, `You have used this discount the maximum number of times (${discount.metadata.maximum_uses_per_customer})`);
          }
        }

        // Check if the discount has a minimum spend condition
        if (discount.metadata.minimum_spend) {

          // Calculate the total price of the cart
          const totalPrice = cart.items.reduce((total, item) => total + item.unit_price, 0);

          // If the total price is less than the minimum spend, throw an error
          if (totalPrice < discount.metadata.minimum_spend) {
            throw new MedusaError(MedusaError.Types.INVALID_ARGUMENT, `You must spend at least ${getAmount(discount.metadata.minimum_spend as number,cart.region)} to get this discount`);
          }
        }

        // If all conditions are met, continue to apply the discount to the cart
      }

      try {
        await super.applyDiscounts(cart, [discountCode]);
      } catch (error) {
        // Handle the error
        console.error(error);
      }
    }
  }
}

export default CartService
