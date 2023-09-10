import { EventBusService, OrderService, FulfillmentService } from "@medusajs/medusa"
import { createEvent } from "../scripts/klaviyo"
import { getStoreDetails } from "../scripts/sales-channel";
import { debugLog } from "../scripts/debug"

const SENDGRID_ORDER_SHIPPED = process.env.SENDGRID_ORDER_SHIPPED
const SENDGRID_FROM = process.env.SENDGRID_FROM

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
      relations: ["items", "customer", "shipping_address", "sales_channel"],
    })
    const fulfillment = await this.fulfillmentService_.retrieve(data.fulfillment_id, {
      relations: ["items", "tracking_links"],
    })
    const store = getStoreDetails(order.sales_channel)
    debugLog("handleOrderShipped running...")
    if (!data.no_notification) ( // do not send if notifications suppressed
      this.sendgridEmail(order, fulfillment, store),
      this.klaviyoEvent(order, fulfillment, store)
    )
  }

  // SendGrid Email Handler
  sendgridEmail = (order: any, fulfillment, store) => {
    debugLog("notifications on..."),
    debugLog("using template ID:", SENDGRID_ORDER_SHIPPED),
    debugLog("using store details:", store),
    debugLog("sending email to:", order.email),
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
        store: store,
        /*data*/ /* add in to see the full data object returned by the event */
      }
    })
  }

  // Klaviyo Event Handler
  klaviyoEvent = async (order: any, fulfillment, store) => {
    debugLog("creating event in Klaviyo...")

    try {
      const orderProperties = {
        order: order,
        fulfillment: fulfillment,
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
