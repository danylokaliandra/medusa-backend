import type { DraftOrderDetailsWidgetProps, WidgetConfig } from "@medusajs/admin"
import { Container, Select, Text, Heading } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { useAdminSalesChannels, useUpdateCart } from "medusa-react"
import { useAdminStore } from "medusa-react"

const DraftOrderSalesChannelWidget = ({ draftOrder }: DraftOrderDetailsWidgetProps) => {
  if (draftOrder.status !== 'open') {
    return null; // Render nothing if the draft order status is not 'open'
  }
  const { store } = useAdminStore()
  const defaultSalesChannelId = store.default_sales_channel_id
  const { sales_channels, isLoading } = useAdminSalesChannels()
  const updateCart = useUpdateCart(draftOrder.cart_id)
  const [selectedChannel, setSelectedChannel] = useState(draftOrder.cart.sales_channel_id)

  useEffect(() => {
    if (!isLoading && sales_channels) {
      const currentChannel = sales_channels.find(channel => channel.id === draftOrder.cart.sales_channel_id)
      if (currentChannel) {
        setSelectedChannel(currentChannel.id)
      }
    }
  }, [isLoading, sales_channels, draftOrder])

  const handleSalesChannelChange = async (value) => {
    setSelectedChannel(value)
    updateCart.mutate({ sales_channel_id: value })
  }

  return (
    <div>
      <Container className={`${selectedChannel === defaultSalesChannelId ? 'bg-ui-tag-orange-bg' : ''}`}>
        {sales_channels ? (
          <div className="w-[500px]">
            <Heading className="inter-xlarge-semibold text-grey-90 pb-1.5">Sales Channel</Heading>
            <Select onValueChange={handleSalesChannelChange} value={selectedChannel}>
              <Select.Trigger>
                <Select.Value placeholder="Select a sales channel" />
              </Select.Trigger>
              <Select.Content>
                {sales_channels.map((sales_channel) => (
                  <Select.Item key={sales_channel.id} value={sales_channel.id}>
                    {sales_channel.name} {sales_channel.description ? `[${sales_channel.description}]` : ""}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
            {selectedChannel === defaultSalesChannelId && (
              <Text className="mt-3">
                <strong>Warning:</strong> Please select a non-default Sales Channel.
              </Text>
            )}
          </div>
        ) : (
          <p>Loading...</p>
        )}
      </Container>
    </div>
  )
}

export const config: WidgetConfig = {
  zone: "draft_order.details.before",
}

export default DraftOrderSalesChannelWidget
