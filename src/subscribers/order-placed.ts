import { EventBusService, OrderService } from "@medusajs/medusa"
import { createEvent } from "../scripts/klaviyo"
import { getStoreDetails } from "../scripts/sales-channel";
import { debugLog } from "../scripts/debug"

const SENDGRID_ORDER_PLACED = process.env.SENDGRID_ORDER_PLACED
const SENDGRID_FROM = process.env.SENDGRID_FROM

type InjectedDependencies = {
  eventBusService: EventBusService,
  orderService: OrderService,
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
      relations: ["items", "customer", "shipping_address", "sales_channel"],
    })
    const store = getStoreDetails(order.sales_channel)
    let email
    if (!data.resend) {
      debugLog("handleOrderPlaced running (original event)...")
      email = order.email
    } else {
      debugLog("handleOrderPlaced running (resent event)...")
      email = data.email
    }

    this.sendgridEmail(email, order, store)
    // send klaviyo event but not for resends
    if (!data.resend) {
      this.klaviyoEvent(order, store)
    }
  }

  // SendGrid Email Handler
  sendgridEmail = (email: string, order: any, store) => {
    debugLog("sending email to:", email)
    debugLog("using template ID:", SENDGRID_ORDER_PLACED)
    debugLog("using store details:", store)
    this.sendGridService.sendEmail({
      templateId: SENDGRID_ORDER_PLACED,
      from: SENDGRID_FROM,
      to: email,
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
        discount: order.discount_total > 0 ? true : false,
        discount_total: (order.discount_total / 100).toFixed(2),
        gift_card: order.gift_card > 0 ? true : false,
        gift_card_total: (order.gift_card_total / 100).toFixed(2),
        tax_total: (order.tax_total / 100).toFixed(2),
        shipping_total: (order.shipping_total / 100).toFixed(2),
        total: (order.total / 100).toFixed(2),
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

      // Create the 'Order Placed' Event
      await createEvent("Order Placed", order.email, order.id, (order.total / 100).toFixed(2), orderProperties)
      debugLog("'Order Placed' event created successfully in Klaviyo.")

      // Counter for keeping track of the item number across all products
      let itemCounter = 0;

      // Create 'Product Ordered' Events for each individual item on the order
      for (const item of order.items) {
        const itemProperties = {
          itemNumber: 0, // just an initial placeholder
          item: item,
          store: store,
          // ... [Add other properties as needed]
        }

        // Loop through the quantity of each item and create an event for each one
        for (let i = 0; i < item.quantity; i++) {
          // Include the itemCounter in the properties
          itemProperties.itemNumber = itemCounter;

          await createEvent("Product Ordered", order.email, `${order.id}_${itemProperties.itemNumber}`, (item.unit_price / 100).toFixed(2), itemProperties)
          debugLog(`'Product Ordered' event for item ${item.id} created successfully in Klaviyo.`)

          // Increment the itemCounter for the next item
          itemCounter++;
        }
      }
    } catch (error) {
      console.error("Error creating Klaviyo event:", error.message)
    }
  }
}

export default OrderPlacedSubscriber
