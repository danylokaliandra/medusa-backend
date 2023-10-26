import Medusa from "@medusajs/medusa-js"
import { RouteConfig } from "@medusajs/admin"
import React, { useState } from 'react';
import { Checkbox, Container, Button, Table, Tabs, Text } from "@medusajs/ui"
import { useAdminOrders } from 'medusa-react';
import { SimpleConsoleLogger } from "typeorm";
import { RocketLaunch } from "@medusajs/icons"

const Shipping = () => {
  const [selectedFulfillmentOrders, setSelectedFulfillmentOrders] = useState([])
  const [selectAllFulfillmentOrders, setSelectAllFulfillmentOrders] = useState(false)
  const [selectedShippingOrders, setSelectedShippingOrders] = useState([])
  const [selectAllShippingOrders, setSelectAllShippingOrders] = useState(false)
  const [selectedPackingOrders, setSelectedPackingOrders] = useState([])
  const [selectAllPackingOrders, setSelectAllPackingOrders] = useState(false)
  
  const { orders, isLoading, error } = useAdminOrders({
    limit: 25,
    offset: 0,
    status: ["pending"], // pending, completed, archived, canceled, requires_action
    payment_status: ["captured"], // captured, awaiting, not_paid, refunded, partially_refunded, canceled, requires_action
    // fulfillment_status: [] // not_fulfilled, fulfilled, partially_fulfilled, shipped, partially_shipped, canceled, returned, partially_returned, requires_action
    fields: "id,display_id,created_at,total,payment_status,fulfillment_status,status,fulfillments,sales_channel",
    expand: "customer,fulfillments,sales_channel",
  })
  const notFulfilledOrders = orders ? orders.filter(order => order.fulfillment_status === 'not_fulfilled') : []
  const fulfilledOrders = orders ? orders.filter(order => order.fulfillment_status === 'fulfilled') : []
  const shippedOrders = orders ? orders.filter(order => order.fulfillment_status === 'shipped') : []

  // FULFILLMENTS LOGIC
  const handleFulfillmentCheckbox = (checked, orderId) => {
    if (checked) {
      setSelectedFulfillmentOrders([...selectedFulfillmentOrders, orderId]);
    } else {
      setSelectedFulfillmentOrders(selectedFulfillmentOrders.filter((id) => id !== orderId));
    }
  }

  const handleSelectAllFulfillmentCheckboxes = (checked) => {
    setSelectAllFulfillmentOrders(checked)
    if (checked) {
      setSelectedFulfillmentOrders(orders.map((order) => order.display_id));
    } else {
      setSelectedFulfillmentOrders([])
    }
  };

  /* const createFulfillments = async () => {
    for (const orderId of selectedFulfillmentOrders) {
      const order = orders.find(order => order.id === orderId);
      const itemsToFulfill = order.items.map(item => ({
        itemId: item.id,
        quantity: item.quantity,
      }));
  
      try {
        await medusa.admin.orders.createFulfillment(orderId, { items: itemsToFulfill });
      } catch (error) {
        console.error(`Failed to create fulfillment for order ${orderId}:`, error);
      }
    }
   
    // Refresh orders
    useAdminOrders.refresh();
  };
 */

  // SHIPPING LOGIC

  const handleShippingCheckbox = (checked, orderId) => {
    if (checked) {
      setSelectedShippingOrders([...selectedShippingOrders, orderId]);
    } else {
      setSelectedShippingOrders(selectedShippingOrders.filter((id) => id !== orderId));
    }
  }

  const handleSelectAllShippingCheckboxes = (checked) => {
    setSelectAllShippingOrders(checked)
    if (checked) {
      setSelectedShippingOrders(orders.map((order) => order.display_id));
    } else {
      setSelectedShippingOrders([])
    }
  };

  // PACKING LOGIC
  
  const handlePackingCheckbox = (checked, orderId) => {
    if (checked) {
      setSelectedPackingOrders([...selectedPackingOrders, orderId]);
    } else {
      setSelectedPackingOrders(selectedPackingOrders.filter((id) => id !== orderId));
    }
  }

  const handleSelectAllPackingCheckboxes = (checked) => {
    setSelectAllPackingOrders(checked)
    if (checked) {
      setSelectedPackingOrders(orders.map((order) => order.display_id));
    } else {
      setSelectedPackingOrders([])
    }
  };

  // DATA LOADING
  if (isLoading) {
    return <div>Loading...</div>;
  }

  // ERROR HANDLING
  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div>
      <Container>
        <Tabs defaultValue="fulfillment">
          <div className="flex justify-between">
            {/* TABS AND BUTTONS */}
            <div>
              <Tabs.List >
                <Tabs.Trigger value="fulfillment">Fulfillment</Tabs.Trigger>
                <Tabs.Trigger value="shipping">Shipping</Tabs.Trigger>
                <Tabs.Trigger value="packing">Packing</Tabs.Trigger>
              </Tabs.List>
            </div>
            <div>
              <Tabs.Content value="fulfillment">
                <Button disabled={selectedFulfillmentOrders.length === 0}>Fulfill Orders{selectedFulfillmentOrders.length > 0 && ` #${selectedFulfillmentOrders.sort((a, b) => a - b).join(", ")}`}</Button>
              </Tabs.Content>
              <Tabs.Content value="shipping">
                <Button disabled={selectedShippingOrders.length === 0}>Enter Tracking Numbers{selectedShippingOrders.length > 0 && ` for Orders #${selectedShippingOrders.sort((a, b) => a - b).join(", ")}`}</Button>
                <Button disabled={selectedShippingOrders.length === 0}>Ship{selectedShippingOrders.length > 0 && ` for Orders #${selectedShippingOrders.sort((a, b) => a - b).join(", ")}`}</Button>
              </Tabs.Content>
              <Tabs.Content value="packing">
                <Button disabled={selectedPackingOrders.length === 0}>Print Packing Lists{selectedPackingOrders.length > 0 && ` for Orders #${selectedPackingOrders.sort((a, b) => a - b).join(", ")}`}</Button>
              </Tabs.Content>
            </div>
          </div>
          <div className="mt-2">
            {/* FULFILLMENT */}
            <Tabs.Content value="fulfillment">
              {/* TODO:
                - Tables full of payment processed (but not yet shipped) orders
                - Selector (checkboxes) to select ones to ship
                - Click 'fulfill' and it moves to shipping tab */}
              <div className="px-xlarge py-large border-grey-20 border-b border-solid">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="inter-small-regular text-grey-50 pt-1.5">Orders below have been paid for and are awaiting fulfillment.</h3>
                  </div>
                </div>
              </div>
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>
                      <Checkbox
                        onCheckedChange={handleSelectAllFulfillmentCheckboxes}
                        checked={notFulfilledOrders.every((order) => selectedFulfillmentOrders.includes(order.display_id))}
                      />
                    </Table.HeaderCell>
                    <Table.HeaderCell>Order#</Table.HeaderCell>
                    <Table.HeaderCell>Sales Channel</Table.HeaderCell>
                    <Table.HeaderCell>Date</Table.HeaderCell>
                    <Table.HeaderCell>Customer Email</Table.HeaderCell>
                    {/* <Table.HeaderCell>Payment Status</Table.HeaderCell> */}
                    {/* <Table.HeaderCell>Fulfillment Status</Table.HeaderCell> */}
                    {/* <Table.HeaderCell>Order Status</Table.HeaderCell> */}
                    <Table.HeaderCell>Total</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {notFulfilledOrders?.map((order) => (
                    <Table.Row key={order.id}>
                      <Table.Cell>
                        <Checkbox
                          checked={selectedFulfillmentOrders.includes(order.display_id)}
                          onCheckedChange={(checked) => handleFulfillmentCheckbox(checked, order.display_id)}/>
                      </Table.Cell>
                      <Table.Cell>#{order.display_id}</Table.Cell>
                      <Table.Cell>{order.sales_channel.name}</Table.Cell>
                      <Table.Cell>{new Date(order.created_at).toDateString()}</Table.Cell>
                      <Table.Cell>{order.customer.email}</Table.Cell>
                      {/* <Table.Cell>{order.payment_status}</Table.Cell> */}
                      {/* <Table.Cell>{order.fulfillment_status}</Table.Cell> */}
                      {/* <Table.Cell>{order.status}</Table.Cell> */}
                      <Table.Cell>${(order.total / 100).toFixed(2)}</Table.Cell>
                      {/* rows not in use yet
                      <Table.Cell>{JSON.stringify(order.fulfillments)}</Table.Cell>
                      */}
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </Tabs.Content>
            {/* SHIPPING */}
            <Tabs.Content value="shipping">
              {/* TO DO:
                - Entry mode, can enter tracking numbers in order, auto move to next field on entry
                - When done, a 'ship all' button to ship em all
                - Save tracking numbers in case page fails...
                - Cancel fulfillment (to move back to fulfillment) */}
              <div className="px-xlarge py-large border-grey-20 border-b border-solid">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="inter-small-regular text-grey-50 pt-1.5">Orders below have been paid for and are away tracking number entry for shipment.</h3>
                  </div>
                </div>
              </div>
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>
                      <Checkbox
                        onCheckedChange={handleSelectAllShippingCheckboxes}
                        checked={fulfilledOrders.every((order) => selectedShippingOrders.includes(order.display_id))}
                      />
                    </Table.HeaderCell>
                    <Table.HeaderCell>Order#</Table.HeaderCell>
                    <Table.HeaderCell>Sales Channel</Table.HeaderCell>
                    <Table.HeaderCell>Date</Table.HeaderCell>
                    <Table.HeaderCell>Customer Email</Table.HeaderCell>
                    {/* <Table.HeaderCell>Payment Status</Table.HeaderCell> */}
                    {/* <Table.HeaderCell>Fulfillment Status</Table.HeaderCell> */}
                    {/* <Table.HeaderCell>Order Status</Table.HeaderCell> */}
                    <Table.HeaderCell>Total</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {fulfilledOrders?.map((order) => (
                    <Table.Row key={order.id}>
                      <Table.Cell>
                        <Checkbox
                          checked={selectedShippingOrders.includes(order.display_id)}
                          onCheckedChange={(checked) => handleShippingCheckbox(checked, order.display_id)}/>
                      </Table.Cell>
                      <Table.Cell>#{order.display_id}</Table.Cell>
                      <Table.Cell>{order.sales_channel.name}</Table.Cell>
                      <Table.Cell>{new Date(order.created_at).toDateString()}</Table.Cell>
                      <Table.Cell>{order.customer.email}</Table.Cell>
                      <Table.Cell>${(order.total / 100).toFixed(2)}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </Tabs.Content>
            {/* PACKING */}
            <Tabs.Content value="packing">
              <div className="px-xlarge py-large border-grey-20 border-b border-solid">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="inter-small-regular text-grey-50 pt-1.5">Time to ship! Let's print some packing slips.</h3>
                  </div>
                </div>
              </div>
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>
                      <Checkbox
                        onCheckedChange={handleSelectAllPackingCheckboxes}
                        checked={shippedOrders.every((order) => selectedPackingOrders.includes(order.display_id))}
                      />
                    </Table.HeaderCell>
                    <Table.HeaderCell>Order#</Table.HeaderCell>
                    <Table.HeaderCell>Sales Channel</Table.HeaderCell>
                    <Table.HeaderCell>Date</Table.HeaderCell>
                    <Table.HeaderCell>Customer Email</Table.HeaderCell>
                    {/* <Table.HeaderCell>Payment Status</Table.HeaderCell> */}
                    {/* <Table.HeaderCell>Fulfillment Status</Table.HeaderCell> */}
                    {/* <Table.HeaderCell>Order Status</Table.HeaderCell> */}
                    <Table.HeaderCell>Total</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {shippedOrders?.map((order) => (
                    <Table.Row key={order.id}>
                      <Table.Cell>
                        <Checkbox
                          checked={selectedPackingOrders.includes(order.display_id)}
                          onCheckedChange={(checked) => handlePackingCheckbox(checked, order.display_id)}/>
                      </Table.Cell>
                      <Table.Cell>#{order.display_id}</Table.Cell>
                      <Table.Cell>{order.sales_channel.name}</Table.Cell>
                      <Table.Cell>{new Date(order.created_at).toDateString()}</Table.Cell>
                      <Table.Cell>{order.customer.email}</Table.Cell>
                      {/* <Table.Cell>{order.payment_status}</Table.Cell> */}
                      {/* <Table.Cell>{order.fulfillment_status}</Table.Cell> */}
                      {/* <Table.Cell>{order.status}</Table.Cell> */}
                      <Table.Cell>${(order.total / 100).toFixed(2)}</Table.Cell>
                      {/* rows not in use yet
                      <Table.Cell>{JSON.stringify(order.fulfillments)}</Table.Cell>
                      */}
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </Tabs.Content>
          </div>
        </Tabs>
      </Container>
    </div>
  )
}

export const config: RouteConfig = {
  link: {
    label: "Shipping",
    icon: RocketLaunch
  },
}

export default Shipping
