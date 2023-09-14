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
import { debugLog } from "../scripts/debug"

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
}

export default CartService
