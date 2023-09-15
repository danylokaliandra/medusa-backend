import { EventBusService, OrderService } from "@medusajs/medusa"
import { createEvent } from "../scripts/klaviyo"
import { getStoreDetails } from "../scripts/sales-channel";
import { debugLog } from "../scripts/debug"

const SENDGRID_ORDER_PAID = process.env.SENDGRID_ORDER_PAID
const SENDGRID_FROM = process.env.SENDGRID_FROM

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
      relations: ["customer", "shipping_address", "sales_channel"],
    })
    const store = getStoreDetails(order.sales_channel)
    debugLog("handleOrderPaymentCaptured running...")
    if (!data.no_notification) ( // do not send if notifications suppressed
      this.sendgridEmail(order, store),
      this.klaviyoEvent(order, store)
    )
  }

  // SendGrid Email Handler
  sendgridEmail = (order: any, store) => {
    debugLog("notifications on..."),
    debugLog("using template ID:", SENDGRID_ORDER_PAID),
    debugLog("using store details:", store),
    debugLog("sending email to:", order.email),
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
        store: store,
        /*data*/ /* add in to see the full data object returned by the event */
      }
    })
  }

  // Klaviyo Event Handler
  klaviyoEvent = async (order: any, store) => {
    debugLog("creating event in Klaviyo...")

    try {
      const orderProperties = {
        order: order,
        store: store,
        // ... [Add other properties as needed]
      }

      await createEvent("Order Paid", order.email, order.id, (order.total / 100).toFixed(2), orderProperties)
      debugLog("'Order Paid' event created successfully in Klaviyo.")
    } catch (error) {
      console.error("Error creating Klaviyo event:", error.message)
    }
  }
}

export default OrderPaymentCapturedSubscriber
