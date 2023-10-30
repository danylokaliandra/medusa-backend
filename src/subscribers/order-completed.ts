import { EventBusService, OrderService } from "@medusajs/medusa"
import { debugLog } from "../scripts/debug"

type InjectedDependencies = {
  eventBusService: EventBusService,
  orderService: OrderService,
}

class OrderCompletedSubscriber {
  protected readonly orderService_: OrderService

  constructor({
    eventBusService,
    orderService,
  }: InjectedDependencies) {
    this.orderService_ = orderService
    eventBusService.subscribe(
      "order.shipment_created", 
      this.handleOrderCompleted
    )
    eventBusService.subscribe(
      "order.payment_captured", 
      this.handleOrderCompleted
    )
  }

  handleOrderCompleted = async (data: Record<string, any>) => {
    const order = await this.orderService_.retrieve(data.id)
    if (order.payment_status === "captured" && order.fulfillment_status === "shipped" && order.status === "pending") {
      await this.orderService_.completeOrder(order.id)
    }
  }
}

export default OrderCompletedSubscriber
