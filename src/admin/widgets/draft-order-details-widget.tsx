import type { DraftOrderDetailsWidgetProps, WidgetConfig } from "@medusajs/admin"
import { Container, Select, Text, Heading, Button, RadioGroup, Label, Input } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { useAdminSalesChannels, useAdminCustomPost, useAdminGetSession, useUpdateCart } from "medusa-react"
import { useAdminStore } from "medusa-react"

const DraftOrderSalesChannelWidget = ({ draftOrder }: DraftOrderDetailsWidgetProps) => {
  const { store } = useAdminStore()
  const defaultSalesChannelId = store.default_sales_channel_id
  const { sales_channels, isLoading: isLoadingSalesChannel } = useAdminSalesChannels()
  const updateCart = useUpdateCart(draftOrder.cart_id)
  const [selectedChannel, setSelectedChannel] = useState(draftOrder.cart.sales_channel_id)
  const { user, isLoading: isLoadingUser } = useAdminGetSession()
  const { mutate } = useAdminCustomPost(
    `/admin/emails/${draftOrder.id}`,
    ["resend-email"]
  )
  const [selectedEmail, setSelectedEmail] = useState(draftOrder.cart.email)
  const [customEmail, setCustomEmail] = useState("")
  const emailToSend = selectedEmail === "custom" ? customEmail : selectedEmail

  const handleSalesChannelChange = async (value) => {
    setSelectedChannel(value)
    updateCart.mutate({ sales_channel_id: value })
  }

  const resendEmail = (eventName) => {
    mutate({
      email: emailToSend,
      eventName: eventName,
    })
  }

  const getCustomLabel = () => {
    if (selectedEmail === "custom") {
      return ""
    } else if (selectedEmail !== "custom" && customEmail) {
      return `Other [${customEmail}]`
    } else {
      return "Other [select to enter]"
    }
  }

  const isValidEmail = (email) => {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    return re.test(String(email).toLowerCase())
  }

  useEffect(() => {
    if (!isLoadingSalesChannel && sales_channels) {
      const currentChannel = sales_channels.find(channel => channel.id === draftOrder.cart.sales_channel_id)
      if (currentChannel) {
        setSelectedChannel(currentChannel.id)
      }
    }
  }, [isLoadingSalesChannel, sales_channels, draftOrder])

  return (
    <div className="flex flex-col">
      { !isLoadingSalesChannel && !isLoadingUser && sales_channels && draftOrder.status === 'open' && (
      <Container className={`${selectedChannel === defaultSalesChannelId ? 'bg-ui-tag-orange-bg' : ''}`}>
          <div>
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
      </Container>
      )}
      {selectedChannel !== defaultSalesChannelId && (
        <Container>
          <div>
            <RadioGroup value={selectedEmail} onValueChange={setSelectedEmail}>
              <div className="flex items-center gap-x-3">
                <RadioGroup.Item value={draftOrder.cart.email} id="customer_email" />
                <Label htmlFor="customer_email" weight="plus">
                  Customer [{draftOrder.cart.email}]
                </Label>
              </div>
              <div className="flex items-center gap-x-3">
                <RadioGroup.Item value={user?.email} id="user_email" />
                <Label htmlFor="user_email" weight="plus">
                  Admin User [{user.email}]
                </Label>
              </div>
              <div className="flex items-center gap-x-3">
                <RadioGroup.Item value="custom" id="custom_email" />
                <Label htmlFor="custom_email" weight="plus">
                  {getCustomLabel()}
                </Label>
                {selectedEmail === "custom" && (
                  <div className="flex items-center">
                    <Input
                      size="small"
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      placeholder="Enter Other Email"
                    />
                    {!isValidEmail(customEmail) && (
                      <span className="text-red-500 ml-2">Note: enter valid email.</span>
                    )}
                </div>
                )}
              </div>
            </RadioGroup>
            <div className="flex justify-between mt-3">
              <Button variant="secondary" onClick={() => resendEmail("draft_order.created")} disabled={!isValidEmail(emailToSend)}>Resend Draft Order</Button>
            </div>
          </div>
        </Container>
      )}
    </div>
  )
}

export const config: WidgetConfig = {
  zone: "draft_order.details.before",
}

export default DraftOrderSalesChannelWidget
