import { Lifetime } from "awilix"
import { AuthenticateResult } from "@medusajs/medusa/dist/types/auth"
import { Customer } from "../models/customer"
import CustomerService from "../services/customer"
import { AuthService as MedusaAuthService } from "@medusajs/medusa"
import { debugLog } from "../scripts/debug"

type InjectedDependencies = {
  customerService: CustomerService
}

class AuthService extends MedusaAuthService {
  static LIFE_TIME = Lifetime.SCOPED
  protected readonly customerService_: CustomerService = null!; // add initialiser to overwrite from base AuthService

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
   * Authenticates a customer based on an email, password combination. Uses
   * scrypt to match password with hashed value. Extended from medusa core to 
   * retrieve customer matching the sales channel provided in the header.
   * @param {string} email - the email of the user
   * @param {string} password - the password of the user
   * @return {{ success: (bool), customer: (object | undefined) }}
   *    success: whether authentication succeeded
   *    user: the user document if authentication succeded
   *    error: a string with the error message
   */
  async authenticateCustomer(
    email: string,
    password: string
  ): Promise<AuthenticateResult> {
    debugLog("running authenticateCustomer", "email:", email, "password:", password)
    return await this.atomicPhase_(async (transactionManager) => {
      try {
        const sC = this.customerService_.updateBillingAddress_
        const customer: Customer = await this.customerService_
          .withTransaction(transactionManager)
          .retrieveRegisteredByEmailAndSalesChannel(email, {
            select: ["id", "password_hash"],
          })
        if (customer.password_hash) {
          const passwordsMatch = await this.comparePassword_(
            password,
            customer.password_hash
          )

          if (passwordsMatch) {
            const customer = await this.customerService_
              .withTransaction(transactionManager)
              .retrieveRegisteredByEmailAndSalesChannel(email)
            return {
              success: true,
              customer,
            }
          }
        }
      } catch (error) {
        // ignore
      }

      return {
        success: false,
        error: "Invalid email or password",
      }
    })
  }
}

export default AuthService
