import { EventBusService, OrderService } from "@medusajs/medusa"
import { getProfileByEmail, createEvent } from "../scripts/klaviyo"
import { debugLog } from "../scripts/debug"

const SENDGRID_ORDER_PLACED = process.env.SENDGRID_ORDER_PLACED
const SENDGRID_FROM = process.env.SENDGRID_FROM
const STORE_URL = process.env.STORE_URL
const STORE_NAME = process.env.STORE_NAME
const STORE_LOGO = process.env.STORE_LOGO

type InjectedDependencies = {
  eventBusService: EventBusService,
  orderService: OrderService
  sendgridService: any
}

class OrderPlacedSubscriber {
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
      "order.placed", 
      this.handleOrderPlaced
    )
  }

  handleOrderPlaced = async (data: Record<string, any>) => {
    const order = await this.orderService_.retrieveWithTotals(data.id, {
      relations: ["items", "customer", "shipping_address"],
    })
    debugLog("handleOrderPlaced running...")
    this.sendgridEmail(order)
    this.klaviyoEvent(order)
  }

  // SendGrid Email Handler
  sendgridEmail = (order: any) => {
    debugLog("sending email to:", order.email)
    debugLog("using template ID:", SENDGRID_ORDER_PLACED)
    debugLog("using STORE_URL value:", STORE_URL)
    this.sendGridService.sendEmail({
      templateId: SENDGRID_ORDER_PLACED,
      from: SENDGRID_FROM,
      to: order.email,
      dynamic_template_data: {
        order_id: order.display_id,
        order_date: new Date(order.created_at).toLocaleDateString('en-US', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',}),
        status: order.status,
        customer: order.customer,
        items: order.items.map((item) => ({
          title: item.title,
          quantity: item.quantity,
          total: (item.total / 100).toFixed(2),
        })),
        shipping_address: order.shipping_address,
        subtotal: (order.subtotal / 100).toFixed(2),
        shipping_total: (order.shipping_total / 100).toFixed(2),
        tax_total: (order.tax_total / 100).toFixed(2),
        total: (order.total / 100).toFixed(2),
        store_url: STORE_URL,
        store_name: STORE_NAME,
        store_logo: STORE_LOGO,
        /*data*/ /* add in to see the full data object returned by the event */
      }
    })    
  }

  // Klaviyo Event Handler
  klaviyoEvent = async (order: any) => {
    debugLog("creating Order Placed event in Klaviyo...")

    try {
      const orderProperties = {
        store_name: STORE_NAME,
        order: order
        // ... [Add other properties as needed]
      }

      await createEvent("Placed Order", order.email, (order.total / 100).toFixed(2), orderProperties)
      debugLog("'Placed Order' event created successfully in Klaviyo.")
    } catch (error) {
      console.error("Error creating Klaviyo event:", error.message)
    }
  }
}

export default OrderPlacedSubscriber
