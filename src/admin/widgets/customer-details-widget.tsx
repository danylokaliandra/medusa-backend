import type { CustomerDetailsWidgetProps, WidgetConfig } from "@medusajs/admin"
import { Heading } from "@medusajs/ui"

const CustomerDetailsWidget = ({ customer }: CustomerDetailsWidgetProps) => {
  return (
    <div className="bg-white p-8 border border-gray-200 rounded-lg">
      <div>
      <Heading level="h2">Shipping Addresses</Heading>
      {customer.shipping_addresses.length === 0 ? (
        <p className="inter-base-regular text-grey-50 mt-2 whitespace-pre-wrap">No shipping addresses saved.</p>
      ) : (
        customer.shipping_addresses.map((address, index) => (
          <p className="inter-base-regular text-grey-50 mt-2 whitespace-pre-wrap" key={index}>
            {address.first_name} {address.last_name}, {address.company ? `${address.company}, ` : ''}{address.address_1}, {address.address_2 ? `${address.address_2}, ` : ''}{address.city}, {address.province}, {address.postal_code}, {address.country_code}
          </p>
        ))
      )}
      </div>
      <div>
        <Heading level="h2">Sales Channel ID</Heading>
        <p className="inter-base-regular text-grey-50 mt-2 whitespace-pre-wrap">{customer.sales_channel_id}</p>
      </div>
    </div>
  )
}

export const config: WidgetConfig = {
  zone: "customer.details.after",
}

export default CustomerDetailsWidget
