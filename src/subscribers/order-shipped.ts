import { EventBusService, OrderService, FulfillmentService } from "@medusajs/medusa"
import { debugLog } from "../scripts/debug"


const SENDGRID_ORDER_SHIPPED = process.env.SENDGRID_ORDER_SHIPPED
const SENDGRID_FROM = process.env.SENDGRID_FROM
const STORE_URL = process.env.STORE_URL
const STORE_NAME = process.env.STORE_NAME
const STORE_LOGO = process.env.STORE_LOGO

type InjectedDependencies = {
  eventBusService: EventBusService,
  orderService: OrderService,
  fulfillmentService: FulfillmentService,
  sendgridService: any
}

class OrderShippedSubscriber {
  protected readonly orderService_: OrderService
  protected readonly fulfillmentService_: FulfillmentService
  protected sendGridService: any

  constructor({
    eventBusService,
    orderService,
    fulfillmentService,
    sendgridService,
  }: InjectedDependencies) {
    this.orderService_ = orderService
    this.fulfillmentService_ = fulfillmentService
    this.sendGridService = sendgridService
    eventBusService.subscribe(
      "order.shipment_created", 
      this.handleOrderShipped
    )
  }

  handleOrderShipped = async (data: Record<string, any>) => {
    const order = await this.orderService_.retrieve(data.id, {
      relations: ["items", "customer", "shipping_address"],
    })
    const fulfillment = await this.fulfillmentService_.retrieve(data.fulfillment_id, {
      relations: ["items", "tracking_links"],
    })
    debugLog("handleOrderShipped running...")
    if (!data.no_notification) ( // do not send if notifications suppressed
      debugLog("notifications on, sending email to:", order.email),
      this.sendGridService.sendEmail({
        templateId: SENDGRID_ORDER_SHIPPED,
        from: SENDGRID_FROM,
        to: order.email,
        dynamic_template_data: {
          order_id: order.display_id,
          shipped_date: new Date(fulfillment.shipped_at).toLocaleDateString('en-US', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',}),
          order_date: new Date(order.created_at).toLocaleDateString('en-US', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',}),
          status: order.fulfillment_status,
          customer: order.customer,
          items: order.items.map((item) => ({
            title: item.title,
            quantity: item.quantity,
          })),
          order_fulfillment: fulfillment,
          shipping_address: order.shipping_address,
          tracking_numbers: fulfillment.tracking_numbers,
          store_url: STORE_URL,
          store_name: STORE_NAME,
          store_logo: STORE_LOGO,
          /*data*/ /* add in to see the full data object returned by the event */
        }
      })
    )
  }
}

export default OrderShippedSubscriber
