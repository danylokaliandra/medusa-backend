import { EventBusService, DraftOrderService, CartService } from "@medusajs/medusa"
import { getStoreDetails } from "../scripts/sales-channel";
import { formatAmount } from "medusa-react"
import { debugLog } from "../scripts/debug"

const SENDGRID_ORDER_PLACED = process.env.SENDGRID_ORDER_PLACED
const SENDGRID_FROM = process.env.SENDGRID_FROM

type InjectedDependencies = {
  eventBusService: EventBusService,
  draftOrderService: DraftOrderService,
  cartService: CartService,
  sendgridService: any
}

class OrderPlacedSubscriber {
  protected readonly draftOrderService_: DraftOrderService
  protected readonly cartService_: CartService
  protected sendGridService: any

  constructor({
    eventBusService,
    draftOrderService,
    cartService,
    sendgridService,
  }: InjectedDependencies) {
    this.draftOrderService_ = draftOrderService
    this.cartService_ = cartService
    this.sendGridService = sendgridService
    eventBusService.subscribe(
      "draft_order.created", 
      this.handleDraftOrderPlaced
    )
  }

  handleDraftOrderPlaced = async (data: Record<string, any>) => {
    if (!data.resend) {
      debugLog("handleDraftOrderPlaced running (original event)...(doing nothing)")
      // does nothing, do not want emails sent on original draft_order.placed
      // email = order.email
    } else {
      debugLog("handleDraftOrderPlaced running (resent event)...")
      const draftOrder = await this.draftOrderService_.retrieve(data.id)
      const draftOrderCart = await this.cartService_.retrieveWithTotals(draftOrder.cart_id, {
        relations: ["sales_channel", "customer"],
      })
      const store = getStoreDetails(draftOrderCart.sales_channel)
      let email
      email = data.email
      this.sendgridEmail(email, draftOrder, draftOrderCart, store)
    }
  }

  // SendGrid Email Handler
  sendgridEmail = (email: string, draftOrder: any, draftOrderCart: any, store) => {
    debugLog("sending email to:", email)
    debugLog("using template ID:", SENDGRID_ORDER_PLACED)
    debugLog("using store details:", store)
    this.sendGridService.sendEmail({
      templateId: SENDGRID_ORDER_PLACED,
      from: SENDGRID_FROM,
      to: email,
      dynamic_template_data: {
        order_id: `DRAFT-${draftOrder.display_id}`,
        order_date: new Date(draftOrder.created_at).toLocaleDateString('en-US', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',}),
        status: draftOrder.status,
        customer: draftOrderCart.customer,
        items: draftOrderCart.items.map((item) => ({
          title: item.title,
          quantity: item.quantity,
          total: (item.total / 100).toFixed(2),
        })),
        shipping_address: draftOrderCart.shipping_address,
        subtotal: (draftOrderCart.subtotal / 100).toFixed(2),
        shipping_total: (draftOrderCart.shipping_total / 100).toFixed(2),
        tax_total: (draftOrderCart.tax_total / 100).toFixed(2),
        total: (draftOrderCart.total / 100).toFixed(2),
        store: store,
        /*data*/ /* add in to see the full data object returned by the event */
      }
    })    
  }
}

export default OrderPlacedSubscriber
