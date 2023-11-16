import { EventBusService, OrderService } from "@medusajs/medusa"
import { createEvent } from "../scripts/klaviyo"
import { getStoreDetails } from "../scripts/sales-channel"
import { debugLog } from "../scripts/debug"

const RESEND_ORDER_SHIPPED = process.env.RESEND_ORDER_SHIPPED
const RESEND_FROM = process.env.RESEND_FROM

type InjectedDependencies = {
  eventBusService: EventBusService,
  orderService: OrderService,
  resendService: any
}

class OrderShippedSubscriber {
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
      "order.shipment_created", 
      this.handleOrderShipped
    )
  }

  handleOrderShipped = async (data: Record<string, any>) => {
    const order = await this.orderService_.retrieve(data.id, {
      relations: ["items", "customer", "shipping_address", "sales_channel", "fulfillments", "fulfillments.tracking_links"],
    })
    const store = getStoreDetails(order.sales_channel)
    let email
    if (!data.resend) {
      debugLog("handleOrderShipped running (original event)...")
      email = order.email
    } else {
      debugLog("handleOrderShipped running (resent event)...")
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
    debugLog("using template ID:", RESEND_ORDER_SHIPPED),
    debugLog("sending email to:", email),
    debugLog("sending email from:", RESEND_FROM),
    debugLog("using store details:", store),
    this.resendService_.sendEmail(
      RESEND_ORDER_SHIPPED,
      RESEND_FROM,
      email,
      {
        order_id: order.display_id,
        // use ship date from first fulfillment
        shipped_date: new Date(order.fulfillments[0].shipped_at).toLocaleDateString('en-US', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',}),
        order_date: new Date(order.created_at).toLocaleDateString('en-US', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',}),
        // status: order.fulfillment_status,
        isShipped: order.fulfillment_status == 'shipped',
        isPartiallyShipped: order.fulfillment_status == 'partially_shipped',
        customer: order.customer,
        items: order.items.map((item) => ({
          title: item.title,
          quantity: item.quantity,
        })),
        shipping_address: order.shipping_address,
        tracking_numbers: order.fulfillments.reduce((acc, fulfillment) => {
          const trackingNumbers = fulfillment.tracking_links.map(link => link.tracking_number);
          return [...acc, ...trackingNumbers];
        }, []),
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

      await createEvent("Order Shipped", order.email, order.id, (order.total / 100).toFixed(2), orderProperties)
      debugLog("'Order Shipped' event created successfully in Klaviyo.")
    } catch (error) {
      console.error("Error creating Klaviyo event:", error.message)
    }
  }  
}

export default OrderShippedSubscriber
