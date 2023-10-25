import { RouteConfig } from "@medusajs/admin"
import React from 'react';
import { Container, Button, Table } from "@medusajs/ui"
import { useAdminOrders } from 'medusa-react';
import { SimpleConsoleLogger } from "typeorm";
import { ShoppingCartSolid } from "@medusajs/icons"

const Shipping = () => {
  const { orders, isLoading, error } = useAdminOrders({
    limit: 10,
    offset: 0,
    status: ["pending"], // pending, completed, archived, canceled, requires_action
    fields: "id,display_id,created_at,total,payment_status,fulfillment_status,status",
    //expand: "fulfillments",
  })
  // console.log(orders)
  
  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div>
      <Container>
        <div className="px-xlarge py-large border-grey-20 border-b border-solid">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="inter-xlarge-semibold text-grey-90">Packing Lists</h1>
              <h3 className="inter-small-regular text-grey-50 pt-1.5">Let's get those products shipped.</h3>
            </div>
            <div className="flex items-center space-x-2">
              <div>
                <Button>Print Packing Lists</Button>
              </div>
            </div>
          </div>
        </div>
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Order#</Table.HeaderCell>
              <Table.HeaderCell>Date</Table.HeaderCell>
              <Table.HeaderCell>Customer Email</Table.HeaderCell>
              <Table.HeaderCell>Payment Status</Table.HeaderCell>
              <Table.HeaderCell>Fulfillment Status</Table.HeaderCell>
              <Table.HeaderCell>Order Status</Table.HeaderCell>
              <Table.HeaderCell>Total</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {orders?.map((order) => (
              <Table.Row key={order.id}>
                <Table.Cell>#{order.display_id}</Table.Cell>
                <Table.Cell>{new Date(order.created_at).toDateString()}</Table.Cell>
                <Table.Cell>{order.customer.email}</Table.Cell>
                <Table.Cell>{order.payment_status}</Table.Cell>
                <Table.Cell>{order.fulfillment_status}</Table.Cell>
                <Table.Cell>{order.status}</Table.Cell>
                <Table.Cell>${(order.total / 100).toFixed(2)}</Table.Cell>
                {/* rows not in use yet
                <Table.Cell>{JSON.stringify(order.fulfillments)}</Table.Cell>
                */}
              </Table.Row>
            ))}
          </Table.Body>
      </Table>
      </Container>
    </div>
  )
}

export const config: RouteConfig = {
  link: {
    label: "Shipping",
    icon: ShoppingCartSolid
  },
}

export default Shipping
