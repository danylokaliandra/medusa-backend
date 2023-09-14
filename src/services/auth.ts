import { Lifetime } from "awilix"
import { AuthenticateResult } from "@medusajs/medusa/dist/types/auth"
import { AuthService as MedusaAuthService } from "@medusajs/medusa"
import { Customer } from "@medusajs/medusa"
import { debugLog } from "../scripts/debug"

class AuthService extends MedusaAuthService {
  static LIFE_TIME = Lifetime.SCOPED
  protected readonly salesChannelID_: string | null = null;

  // constructor reads the salesChannelID from the container where it was registered by middleware
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
   * Authenticates a customer based on an email, password combination. Uses
   * scrypt to match password with hashed value. Extended from medusa core to 
   * retrieve customer matching the sales channel from middleware.
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
    debugLog("authenticateCustomer running...")
    debugLog("email:", email, "password:", password)
    debugLog("sales channel ID registered through middleware", this.salesChannelID_);
    
    // customer service was initialised from the AuthService parent constructor
    if (!this.customerService_) {
      throw new Error("CustomerService is not initialized");
    }

    debugLog ("returning list of registered customers with entered email and expected sales channel ID")  
    const customers = await this.customerService_.list({ email, has_account: true, sales_channel_id: this.salesChannelID_ })
    debugLog ("customers:", customers)
    const customer = customers.length > 0 ? customers[0] : null;
    debugLog ("customer:", customer)

    if (!customer) {
      return {
        success: false,
        error: "Invalid email or password",
      };
    }

    return await this.atomicPhase_(async (transactionManager) => {
      try {
        const customer: Customer = await this.customerService_
          .withTransaction(transactionManager)
          .retrieveRegisteredByEmail(email, {
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
              .retrieveRegisteredByEmail(email)

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
