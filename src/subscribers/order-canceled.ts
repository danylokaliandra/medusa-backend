import { EventBusService, OrderService } from "@medusajs/medusa"

const SENDGRID_ORDER_CANCELED = process.env.SENDGRID_ORDER_CANCELED
const SENDGRID_FROM = process.env.SENDGRID_FROM
const STORE_URL = process.env.STORE_URL
const STORE_NAME = process.env.STORE_NAME
const STORE_LOGO = process.env.STORE_LOGO

type InjectedDependencies = {
  eventBusService: EventBusService,
  orderService: OrderService
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
    const order = await this.orderService_.retrieve(data.id, {
      relations: ["customer"],
    })
  	this.sendGridService.sendEmail({
  	  templateId: SENDGRID_ORDER_CANCELED,
  	  from: SENDGRID_FROM,
  	  to: order.email,
  	  dynamic_template_data: {
  	    order_id: order.display_id,
        order_date: new Date(order.created_at).toLocaleDateString('en-US', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',}),
  	    customer: order.customer,
  	    store_url: STORE_URL,
  	    store_name: STORE_NAME,
  	    store_logo: STORE_LOGO,
  	    /*data*/ /* add in to see the full data object returned by the event */
  	  }
  	})
  }
}

export default OrderCanceledSubscriber
