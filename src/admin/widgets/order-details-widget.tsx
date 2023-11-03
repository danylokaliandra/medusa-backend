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
  const emailToSend = selectedEmail === "custom" ? customEmail : selectedEmail

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
            <Button variant="secondary" onClick={() => resendEmail("order.placed")} disabled={!isValidEmail(emailToSend)}>Resend Order Confirmation</Button>
            <Button variant="secondary" onClick={() => resendEmail("order.payment_captured")} disabled={!isValidEmail(emailToSend) || !["captured", "refunded", "partially_refunded"].includes(order.payment_status)}>Resend Payment Confirmation</Button>
            <Button variant="secondary" onClick={() => resendEmail("order.shipment_created")} disabled={!isValidEmail(emailToSend) || order.fulfillment_status !== "shipped"}>Resend Shipment Confirmation</Button>
            <Button variant="secondary" onClick={() => resendEmail("order.canceled")} disabled={!isValidEmail(emailToSend) || order.status !== "canceled"}>Resend Cancellation Confirmation</Button>
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
