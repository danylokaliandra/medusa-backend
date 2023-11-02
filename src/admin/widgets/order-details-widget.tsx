import { useState } from "react"

import type { OrderDetailsWidgetProps, WidgetConfig } from "@medusajs/admin"
import { Container, Button, RadioGroup, Label, Input } from "@medusajs/ui"
import { useAdminCustomPost, useAdminGetSession } from "medusa-react"

const OrderDetailsWidget = ({ order }: OrderDetailsWidgetProps) => {
  const { user, isLoading } = useAdminGetSession()
  const { mutate } = useAdminCustomPost(
    `/admin/emails/${order.id}`,
    ["resend-email"]
  )
  const [selectedEmail, setSelectedEmail] = useState(order.customer.email)
  const [customEmail, setCustomEmail] = useState("")
  // TODO: need validation on custom email
  const emailToSend = selectedEmail === "custom" ? customEmail : selectedEmail
  console.log("emailToSend",emailToSend)

  const resendEmail = (eventName) => {
    console.log(`resendOrderConfirmation for ${eventName}`)
    mutate({
      email: selectedEmail,
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

  return (
    <div>
      <Container>
        <div className="flex flex-col">
          <RadioGroup value={selectedEmail} onValueChange={setSelectedEmail}>
            <div className="flex items-center gap-x-3">
              <RadioGroup.Item value={order.customer.email} id="customer_email" />
              <Label htmlFor="customer_email" weight="plus">
                Customer [{order.customer.email}]
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
                <Input
                  size="small"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  placeholder="Enter Other Email"
                />
              )}
            </div>
          </RadioGroup>
          <div className="flex justify-between mt-3">
            <Button variant="secondary" onClick={() => resendEmail("order.placed.resend")}>Resend Placed</Button>
            <Button variant="secondary" onClick={() => resendEmail("order.payment_captured.resend")}>Resend Paid</Button>
            <Button variant="secondary" onClick={() => resendEmail("order.shipment_created.resend")}>Resend Shipped</Button>
            <Button variant="secondary" disabled={true} onClick={() => resendEmail("order.canceled.resend")}>Resend Canceled</Button>
            {/* TODO: make the buttons only appear when the appropriate status is reached */}
          </div>
        </div>
      </Container>
    </div>
  )
}

export const config: WidgetConfig = {
  zone: "order.details.after",
}

export default OrderDetailsWidget
