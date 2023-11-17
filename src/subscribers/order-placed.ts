import { EventBusService, OrderService } from "@medusajs/medusa"
import { createEvent } from "../scripts/klaviyo"
import { getStoreDetails } from "../scripts/sales-channel";
import { getAmount } from "../scripts/get-amount"
import { debugLog } from "../scripts/debug"

const RESEND_ORDER_PLACED = process.env.RESEND_ORDER_PLACED

type InjectedDependencies = {
  eventBusService: EventBusService,
  orderService: OrderService,
  resendService: any
}

class OrderPlacedSubscriber {
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

    this.sendEmail(email, order, store)
    // send klaviyo event but not for resends
    if (!data.resend) {
      this.klaviyoEvent(order, store)
    }
  }

  // Email Handler
  sendEmail = (email: string, order: any, store) => {
    debugLog("using template ID:", RESEND_ORDER_PLACED)
    debugLog("sending email to:", email)
    debugLog("sending email from:", store.store_email)
    debugLog("using store details:", store)
    this.resendService_.sendEmail(
      RESEND_ORDER_PLACED,
      store.store_email,
      email,
      {
        order_id: String(order.display_id).padStart(8, '0'),
        order_date: new Date(order.created_at).toLocaleDateString('en-US', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',}),
        status: order.status,
        customer: order.customer,
        items: order.items.map((item) => ({
          title: item.title,
          quantity: item.quantity,
          total: getAmount(item.total, order.region),
        })),
        shipping_address: order.shipping_address,
        subtotal: getAmount(order.subtotal, order.region),
        discount: order.discount_total > 0 ? true : false,
        discount_total: getAmount(order.discount_total, order.region),
        gift_card: order.gift_card > 0 ? true : false,
        gift_card_total: getAmount(order.gift_card_total, order.region),
        tax_total: getAmount(order.tax_total, order.region),
        shipping_total: getAmount(order.shipping_total, order.region),
        total: getAmount(order.total,order.region),
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
