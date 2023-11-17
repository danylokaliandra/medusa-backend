import type { OrderDetailsWidgetProps, WidgetConfig } from "@medusajs/admin"
import { Badge } from "@medusajs/ui"

const OrderDetailsWidgetBefore = ({ order }: OrderDetailsWidgetProps) => {
  const url = order.sales_channel?.metadata?.url
  return (
    <div className="mb-4">
      {url ? (
        <a href={url as string} target="_blank" rel="noopener noreferrer">
          <Badge size="large" color="blue">Sales Channel: <strong>{order.sales_channel?.name}</strong></Badge>
        </a>
      ) : (
        <Badge size="large" color="blue">Sales Channel: <strong>{order.sales_channel.name}</strong></Badge>
      )}
    </div>
  )
}

export const config: WidgetConfig = {
  zone: "order.details.before",
}

export default OrderDetailsWidgetBefore
