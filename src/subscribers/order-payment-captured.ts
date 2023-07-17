import { EventBusService, OrderService } from "@medusajs/medusa"

const SENDGRID_ORDER_PAID = process.env.SENDGRID_ORDER_PAID
const SENDGRID_FROM = process.env.SENDGRID_FROM
const STORE_URL = process.env.STORE_URL
const STORE_NAME = process.env.STORE_NAME
const STORE_LOGO = process.env.STORE_LOGO

type InjectedDependencies = {
  eventBusService: EventBusService,
  orderService: OrderService,
  sendgridService: any
}

class OrderPaymentCapturedSubscriber {
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
      "order.payment_captured", 
      this.handleOrderPaymentCaptured
    )
  }

  handleOrderPaymentCaptured = async (data: Record<string, any>) => {
    const order = await this.orderService_.retrieve(data.id, {
      relations: ["customer", "shipping_address"],
    })
    if (!data.no_notification) ( // do not send if notifications suppressed
      this.sendGridService.sendEmail({
        templateId: SENDGRID_ORDER_PAID,
        from: SENDGRID_FROM,
        to: order.email,
        dynamic_template_data: {
          order_id: order.display_id,
          order_date: new Date(order.created_at).toLocaleDateString('en-US', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',}),
          status: order.status,
          customer: order.customer,
          shipping_address: order.shipping_address,
          store_url: STORE_URL,
          store_name: STORE_NAME,
          store_logo: STORE_LOGO,
          /*data*/ /* add in to see the full data object returned by the event */
        }
      })
    )
  }
}

export default OrderPaymentCapturedSubscriber
