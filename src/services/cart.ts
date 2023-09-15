import { Lifetime } from "awilix"
import CustomerService from "../services/customer"
import { CartService as MedusaCartService } from "@medusajs/medusa"

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
