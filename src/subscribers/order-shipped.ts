import { EventBusService, OrderService } from "@medusajs/medusa"
import { createEvent } from "../scripts/klaviyo"
import { getStoreDetails } from "../scripts/sales-channel"
import { debugLog } from "../scripts/debug"

const SENDGRID_ORDER_SHIPPED = process.env.SENDGRID_ORDER_SHIPPED
const SENDGRID_FROM = process.env.SENDGRID_FROM

type InjectedDependencies = {
  eventBusService: EventBusService,
  orderService: OrderService,
  sendgridService: any
}

class OrderShippedSubscriber {
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
      this.sendgridEmail(email, order, store)
      // send klaviyo event but not for resends
      if (!data.resend) {
        this.klaviyoEvent(order, store)
      }
    }
  }

  // SendGrid Email Handler
  sendgridEmail = (email: string, order: any, store) => {
    debugLog("notifications on..."),
    debugLog("using template ID:", SENDGRID_ORDER_SHIPPED),
    debugLog("using store details:", store),
    debugLog("sending email to:", email),
    this.sendGridService.sendEmail({
      templateId: SENDGRID_ORDER_SHIPPED,
      from: SENDGRID_FROM,
      to: email,
      dynamic_template_data: {
        order_id: order.display_id,
        // use ship date from first fulfillment
        shipped_date: new Date(order.fulfillments[0].shipped_at).toLocaleDateString('en-US', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',}),
        order_date: new Date(order.created_at).toLocaleDateString('en-US', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',}),
        status: order.fulfillment_status,
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

      await createEvent("Order Shipped", order.email, order.id, (order.total / 100).toFixed(2), orderProperties)
      debugLog("'Order Shipped' event created successfully in Klaviyo.")
    } catch (error) {
      console.error("Error creating Klaviyo event:", error.message)
    }
  }  
}

export default OrderShippedSubscriber
