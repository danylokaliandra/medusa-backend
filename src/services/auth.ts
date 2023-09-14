import { Lifetime } from "awilix";
import { AuthenticateResult } from "@medusajs/medusa/dist/types/auth";
import { Customer } from "../models/customer";
import CustomerService from "../services/customer";
import { AuthService as MedusaAuthService } from "@medusajs/medusa";
import { debugLog } from "../scripts/debug";

type InjectedDependencies = {
  customerService: CustomerService;
};

class AuthService extends MedusaAuthService {
  static LIFE_TIME = Lifetime.SCOPED;
  protected readonly customerService_: CustomerService = null!; // add initialiser to overwrite from base AuthService

  // initialise Sales Channel
  protected readonly salesChannel_: string | null = null;

  // capture Sales Channel from middleware
  constructor(container, options, dependencies: InjectedDependencies) {
    // @ts-expect-error prefer-rest-params
    super(...arguments);

    try {
      this.salesChannel_ = container.salesChannel;
      this.customerService_ = dependencies.customerService;
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
    debugLog("authenticateCustomer running...");
    debugLog("email:", email, "password:", password);
    debugLog("sales channel registered through middleware", this.salesChannel_);

    return await this.atomicPhase_(async (transactionManager) => {
      // get list of users with that email

      try {
        const customerList: Customer[] = await this.customerService_
          .withTransaction(transactionManager)
          .listByEmail(email.toLowerCase());
        debugLog("customer list", customerList);

        // get customer from customerList that has sales_channel matching this.salesChannel_
        const customer = customerList.find(
          (customer) => customer.sales_channel_id === this.salesChannel_
        );
        debugLog("selected customer", customer);
        return;
        // filter out sales channels

        /*        if (customer.password_hash) {
          const passwordsMatch = await this.comparePassword_(
            password,
            customer.password_hash
          )

          if (passwordsMatch) {
            const customer = await this.customerService_
              .withTransaction(transactionManager)
              .retrieveRegisteredByEmailAndSalesChannel(email)
            debugLog("authenticateCustomer success")
            return {
              success: true,
              customer,
            }
          }
        }*/
      } catch (error) {
        // ignore
      }

      debugLog("authenticateCustomer failed, invalid email or password");
      return {
        success: false,
        error: "Invalid email or password",
      };
    });
  }
}

export default AuthService;
