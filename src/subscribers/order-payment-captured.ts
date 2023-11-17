import { EventBusService, OrderService } from "@medusajs/medusa"
import { createEvent } from "../scripts/klaviyo"
import { getStoreDetails } from "../scripts/sales-channel";
import { debugLog } from "../scripts/debug"

const RESEND_ORDER_PAID = process.env.RESEND_ORDER_PAID

type InjectedDependencies = {
  eventBusService: EventBusService,
  orderService: OrderService,
  resendService: any
}

class OrderPaymentCapturedSubscriber {
  protected readonly orderService_: OrderService
  protected resendService_: any

  constructor({
    eventBusService,
    orderService,
    resendService,
  }: InjectedDependencies) {
    this.orderService_ = orderService
    this.resendService_ = resendService
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
    let email
    if (!data.resend) {
      debugLog("handleOrderPaymentCaptured running (original event)...")
      email = order.email
    } else {
      debugLog("handleOrderPaymentCaptured running (resent event)...")
      email = data.email
    }
    if (!data.no_notification) { // do not send if notifications suppressed
      this.sendEmail(email, order, store)
      // send klaviyo event but not for resends
      if (!data.resend) {
        this.klaviyoEvent(order, store)
      }
  }
  }

  // Email Handler
  sendEmail = (email: string, order: any, store) => {
    debugLog("notifications on..."),
    debugLog("using template ID:", RESEND_ORDER_PAID),
    debugLog("sending email to:", email),
    debugLog("sending email from:", store.store_email),
    debugLog("using store details:", store),
    this.resendService_.sendEmail(
      RESEND_ORDER_PAID,
      store.store_email,
      email,
      {
        order_id: String(order.display_id).padStart(8, '0'),
        order_date: new Date(order.created_at).toLocaleDateString('en-US', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',}),
        status: order.status,
        customer: order.customer,
        shipping_address: order.shipping_address,
        store: store,
      }
    )
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
