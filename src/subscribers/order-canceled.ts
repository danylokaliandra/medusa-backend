import { EventBusService, OrderService } from "@medusajs/medusa"
import { getStoreDetails } from "../scripts/sales-channel";
import { debugLog } from "../scripts/debug"

const SENDGRID_ORDER_CANCELED = process.env.SENDGRID_ORDER_CANCELED
const SENDGRID_FROM = process.env.SENDGRID_FROM

type InjectedDependencies = {
  eventBusService: EventBusService,
  orderService: OrderService,
  sendgridService: any
}

class OrderCanceledSubscriber {
  protected readonly orderService_: OrderService
  protected sendGridService: any

  constructor({
    eventBusService,
    orderService, 
    sendgridService,
  }: InjectedDependencies) {
    this.orderService_ = orderService
    this.sendGridService = sendgridService
    eventBusService.subscribe(
      "order.canceled", 
      this.handleOrderCanceled
    )
  }

  handleOrderCanceled = async (data: Record<string, any>) => {
    const order = await this.orderService_.retrieve(data.id, {
      relations: ["customer", "sales_channel"],
    })
    const { store_name, store_url } = getStoreDetails(order.sales_channel);
    debugLog("handleOrderCanceled running...")
    debugLog("using template ID:", SENDGRID_ORDER_CANCELED)
    debugLog("using store_name:", store_name)
    debugLog("using store_url:", store_url)
    debugLog("sending email to:", order.email)
    this.sendGridService.sendEmail({
      templateId: SENDGRID_ORDER_CANCELED,
      from: SENDGRID_FROM,
      to: order.email,
      dynamic_template_data: {
        order_id: order.display_id,
        order_date: new Date(order.created_at).toLocaleDateString('en-US', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',}),
        customer: order.customer,
        store_name: store_name,
        store_url: store_url,
        store_logo: store_url + "/favicon.ico",
        /*data*/ /* add in to see the full data object returned by the event */
      }
    })
  }
}

export default OrderCanceledSubscriber
