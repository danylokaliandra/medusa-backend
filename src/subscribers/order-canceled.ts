import { EventBusService, OrderService } from "@medusajs/medusa"
import { createEvent } from "../scripts/klaviyo"
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
    const order = await this.orderService_.retrieveWithTotals(data.id, {
      relations: ["customer", "sales_channel"],
    })
    const store = getStoreDetails(order.sales_channel)
    let email
    if (!data.resend) {
      debugLog("handleOrderCanceled running (original event)...")
      email = order.email
    } else {
      debugLog("handleOrderCanceled running (resent event)...")
      email = data.email
    }
    this.sendgridEmail(email, order, store)
    if (!data.resend) {
      // send klaviyo event but not for resends
      this.klaviyoEvent(order, store)
    }
  }

  // SendGrid Email Handler
  sendgridEmail = (email: string, order: any, store) => {
    debugLog("sending email to:", email)
    debugLog("using template ID:", SENDGRID_ORDER_CANCELED)
    debugLog("using store details:", store)
    this.sendGridService.sendEmail({
      templateId: SENDGRID_ORDER_CANCELED,
      from: SENDGRID_FROM,
      to: email,
      dynamic_template_data: {
        order_id: order.display_id,
        order_date: new Date(order.created_at).toLocaleDateString('en-US', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',}),
        customer: order.customer,
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

      await createEvent("Order Cancelled", order.email, order.id, (order.total / 100).toFixed(2), orderProperties)
      debugLog("'Order Cancelled' event created successfully in Klaviyo.")
    } catch (error) {
      console.error("Error creating Klaviyo event:", error.message)
    }
  }
}

export default OrderCanceledSubscriber
