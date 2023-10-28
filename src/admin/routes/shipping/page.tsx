import Medusa from "@medusajs/medusa-js"
import { RouteConfig } from "@medusajs/admin"
import React, { useState, useRef, useEffect, createRef } from 'react';
import { Checkbox, Container, Button, Table, Tabs, Input } from "@medusajs/ui"
import { useAdminOrders } from 'medusa-react';
import { SimpleConsoleLogger } from "typeorm";
import { RocketLaunch } from "@medusajs/icons"

const Shipping = () => {
  const medusa = new Medusa({baseUrl: process.env.MEDUSA_BACKEND_URL, maxRetries: 3})
  // state variables
  const [selectedFulfillmentOrders, setSelectedFulfillmentOrders] = useState([])
  const [selectedShipping, setSelectedShipping] = useState([])
  const [selectedPackingOrders, setSelectedPackingOrders] = useState([])
  const [showTracking, setShowTracking] = useState(false);
  const [trackingNumbers, setTrackingNumbers] = useState(new Array(selectedShipping.length).fill({ fulfillmentId: "", trackingNumber: "" }));
  const [currentIndex, setCurrentIndex] = useState(0);

  // overall orders
  const { orders, isLoading, error, refetch } = useAdminOrders({
    limit: 25,
    offset: 0,
    status: ["pending"], // pending, completed, archived, canceled, requires_action
    payment_status: ["captured"], // captured, awaiting, not_paid, refunded, partially_refunded, canceled, requires_action
    // fulfillment_status: [] // not_fulfilled, fulfilled, partially_fulfilled, shipped, partially_shipped, canceled, returned, partially_returned, requires_action
    fields: "id,display_id,created_at,total,payment_status,fulfillment_status,status,fulfillments,sales_channel,edits",
    expand: "customer,fulfillments,items,sales_channel,shipping_address,edits",
  })
  // for use in fulfillment
  const notFulfilledOrders = orders ? orders.filter(order => order.fulfillment_status === 'not_fulfilled' || order.fulfillment_status === 'canceled') : []
  // for use in shipping
  const fulfilledOrders = orders ? orders.filter(order => order.fulfillment_status === 'fulfilled' || order.fulfillment_status === 'partially_fulfilled' || order.fulfillment_status === 'partially_shipped') : []
  const fulfilledOrderFulfillments = fulfilledOrders
    .flatMap((order) => order.fulfillments)
    .filter((fulfillment) => fulfillment.canceled_at === null && fulfillment.shipped_at === null)
  const fulfilledOrdersSelected = fulfilledOrders.flatMap(order => order.fulfillments.filter(fulfillment => selectedShipping.includes(fulfillment.id)));
  const inputRefs = useRef(fulfilledOrdersSelected.map(() => React.createRef<HTMLInputElement>()));
  // for use in packing
  const shippedOrders = orders ? orders.filter(order => order.fulfillment_status === 'shipped') : []
  const shippedOrdersSelected = shippedOrders.filter(order => selectedPackingOrders.includes(order.display_id));

  // FULFILLMENTS LOGIC
  const handleFulfillmentCheckbox = (checked, orderId) => {
    if (checked) {
      setSelectedFulfillmentOrders([...selectedFulfillmentOrders, orderId]);
    } else {
      setSelectedFulfillmentOrders(selectedFulfillmentOrders.filter((id) => id !== orderId));
    }
  }

  const handleSelectAllFulfillmentCheckboxes = (checked) => {
    if (checked) {
      setSelectedFulfillmentOrders(notFulfilledOrders.map((order) => order.display_id));
    } else {
      setSelectedFulfillmentOrders([])
    }
  };

  const createFulfillments = async () => {
    for (const displayId of selectedFulfillmentOrders) {
      const order = notFulfilledOrders.find(order => order.display_id === displayId)
      const itemsToFulfill = order.items.map(item => ({
        item_id: item.id,
        quantity: item.quantity,
      }))
      try {
        await medusa.admin.orders.createFulfillment(order.id, {
          items: itemsToFulfill
        })
      } catch (error) {
        console.error(`Failed to create fulfillment for order ${displayId}:`, error)
      }
    }
    // refetch orders
    refetch()
  }

  // SHIPPING LOGIC
  const handleShippingCheckbox = (checked, fulfillmentId) => {
    if (checked) {
      setSelectedShipping([...selectedShipping, fulfillmentId]);
    } else {
      setSelectedShipping(selectedShipping.filter((id) => id !== fulfillmentId));
    }
  }

  const handleSelectAllShippingCheckboxes = (checked) => {
    if (checked) {
      const allFulfillmentIds = fulfilledOrderFulfillments.map((fulfillment) => fulfillment.id)
      setSelectedShipping(allFulfillmentIds)
    } else {
      setSelectedShipping([])
    }
  }

  const handleShowTracking = () => {
    if (!showTracking) {
      setShowTracking(true)
    }
    else {
      setShowTracking(false)
    }
  }

  const handleTrackingNumbers = (e, index, orderId, fulfillmentId) => {
    const newTrackingNumbers = [...trackingNumbers]
    newTrackingNumbers[index] = {
      orderId: orderId,
      fulfillmentId: fulfillmentId,
      trackingNumber: e.target.value,
    }
    setTrackingNumbers(newTrackingNumbers)
    if (e.target.value.length === 13 && inputRefs.current[index + 1] !== undefined) {
      inputRefs.current[index+1].current.focus();
    }
  }

  const createShipments = async () => {
    // Iterate over each fulfillment and tracking number
    // TODO: extend this to handle multiple tracking orders (requires modifying the input page as well)
    for (const { orderId, fulfillmentId, trackingNumber } of trackingNumbers) {
      try {
        // Make the API request to create the shipment
        await medusa.admin.orders.createShipment(orderId, {
          fulfillment_id: fulfillmentId,
          tracking_numbers: [trackingNumber],
          no_notification: false,
        });
      } catch (error) {
        console.error("Error creating shipment:", error);
      }
    }
    // refetch orders
    refetch()
  };

  // PACKING LOGIC
  const handlePackingCheckbox = (checked, orderId) => {
    if (checked) {
      setSelectedPackingOrders([...selectedPackingOrders, orderId])
    } else {
      setSelectedPackingOrders(selectedPackingOrders.filter((id) => id !== orderId))
    }
  }

  const handleSelectAllPackingCheckboxes = (checked) => {
    if (checked) {
      setSelectedPackingOrders(shippedOrders.map((order) => order.display_id));
    } else {
      setSelectedPackingOrders([])
    }
  };

  const generatePackingList = async () => {
    let html = '';
    shippedOrdersSelected.forEach(order => {
      // Order Header
      html += `
        <table cellspacing="0" cellpadding="2" border="0" style="width: 7.5in">
          <thead>
            <tr>
              <th colspan="3">
                Packing Slip
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colspan="2" style="width: 4.5in" class="store-info">
                <div class="company-name">
                  ${order.sales_channel.metadata?.store_name ?? "UNKNOWN"}
                <div>
                  ${order.sales_channel.metadata?.store_url ?? "UNKNOWN"}</div>
              </td>
              <td style="width: 3.5in;" align="right" valign="top">
                <img src="${order.sales_channel.metadata?.store_logo ?? "UNKNOWN"}" />
              </td>
            </tr>
            <tr>
              <td style="height: 0.15in">
              </td>
            </tr>
            <tr>
              <td align="right" style="width: 1in">
                <b>Ship To:</b>
              </td>
              <td style="width: 3.5in; font-size: 14px">
                <div>${order.shipping_address.first_name} ${order.shipping_address.last_name}</div>
                <div>${order.shipping_address.address_1}</div>
              </td>
              <td style="width: 2.5in">
                <table cellspacing="0" border="0" class="order-info">
                  <tr>
                    <td align="right" class="label first">
                      Order #
                    </td>
                    <td>
                      ${order.display_id}
                    </td>
                  </tr>
                  <tr>
                    <td align="right" class="label">
                      Date
                    </td>
                    <td>
                      ${new Date(order.created_at).toDateString()}
                    </td>
                  </tr>
                  <tr>
                    <td align="right" class="label">
                      User
                    </td>
                    <td>
                      ${order.customer.email}
                    </td>
                  </tr>
                  <tr>
                    <td align="right" class="label last">
                      Ship Date
                    </td>
                    <td>
                      ${new Date(order.fulfillments[0].shipped_at).toDateString()}
                      /* TO DO: determine how to get shipped date for overall order, currently hacking with first fulfillment order date */
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      `;

      // Order Items Header
      html += `
        <tr>
          <th align="left" style="width:1.5in" class="sku">
            Item
         </th>
          <th align="left">
            Description
          </th>
          <th align="right" style="width:0.75in" class="price">
            Price
          </th>
          <th align="center" style="width:0.75in">
            Qty
          </th>
          <th align="right" style="width:0.75in" class="price">
            Ext. Price
          </th>
        </tr>
      `;


      // Order Items (inside each order)
      order.items.forEach(item => {
        html += `
          <tr>
            <td class="sku">${item.variant.sku}</td>
            <td>${item.title}<br>${item.variant.title}</td>
            <td align="right" class="price">${(item.unit_price / 100).toFixed(2)}</td>
            <td align="center" style="font-weight:bold;font-size:14px">${item.quantity}</td>
            <td align="right" class="price">${((item.unit_price * item.quantity) / 100).toFixed(2)}</td>
          </tr>
        `;
      });

      // Order Footer
      html += `
        <table cellspacing=0 cellpadding="2" border="0" style="width:100%" class="footer">
          <tbody>
            <tr>
              <td rowspan="4" class="notes" >
                ${order.edits[0]}
                /* TODO: determine how to get internal notes to show */
              </td>
              <td align="right" style="width:1in" class="label price">
                Sub Total:
              </td>
              <td style="width:0.75in" align="right" class="price">${(order.subtotal / 100).toFixed(2)}</td>
            </tr>
            <tr class="tax">
              <td align="right" class="label price">
                Tax:
              </td>
              <td style="width:0.75in" align="right" class="price">${(order.tax_total / 100).toFixed(2)}</td>
            </tr>
            <tr>
              <td align="right" class="label price">
                Shipping:
              </td>
              <td style="width:0.75in" align="right" class="price">${(order.shipping_total / 100).toFixed(2)}</td>
            </tr>
            <tr>
              <td align="right" class="label price">
                Total:
              </td>
              <td style="width:0.75in" align="right" class="price">${(order.total / 100).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        <p align="center"><barcode size="small">${order.display_id}</barcode></p>
      `;

    });

    // Create a new Blob from the HTML string
    const blob = new Blob([html], { type: 'text/html' });

    // Create a URL for the Blob
    const url = URL.createObjectURL(blob);

    // Open the URL in a new tab
    window.open(url, '_blank');
  }

  // DATA LOADING
  if (isLoading) {
    return <div>Loading...</div>
  }

  // ERROR HANDLING
  if (error) {
    return <div>Error: {error.message}</div>
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
                <Button onClick={createFulfillments} disabled={selectedFulfillmentOrders.length === 0}>Fulfill Orders{selectedFulfillmentOrders.length > 0 && ` #${selectedFulfillmentOrders.sort((a, b) => a - b).join(", ")}`}</Button>
              </Tabs.Content>
              <Tabs.Content value="shipping">
              {!showTracking ? (
                <Button onClick={handleShowTracking} disabled={selectedShipping.length === 0}>Enter Tracking Numbers</Button>
              ) : (
                <div>
                  <Button onClick={handleShowTracking}>Back</Button>
                  <Button onClick={createShipments} disabled={selectedShipping.length === 0 || selectedShipping.some((fulfillmentId) => {
                    const trackingInfo = trackingNumbers.find((tn) => tn && tn.fulfillmentId === fulfillmentId);
                    return !trackingInfo || trackingInfo.trackingNumber.length !== 13;
                  })}>Ship</Button>
                </div>
              )}
              </Tabs.Content>
              <Tabs.Content value="packing">
                <Button onClick={generatePackingList}
                  disabled={selectedPackingOrders.length === 0}>Print Packing Lists{selectedPackingOrders.length > 0 && ` for Orders #${selectedPackingOrders.sort((a, b) => a - b).join(", ")}`}
                </Button>
              </Tabs.Content>
            </div>
          </div>
          <div className="mt-2">
            {/* FULFILLMENT */}
            <Tabs.Content value="fulfillment">
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
                    <Table.HeaderCell>Date</Table.HeaderCell>
                    <Table.HeaderCell>Placed By</Table.HeaderCell>
                    <Table.HeaderCell>Items</Table.HeaderCell>
                    <Table.HeaderCell>Total</Table.HeaderCell>
                    <Table.HeaderCell>Sales Channel</Table.HeaderCell>
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
                      <Table.Cell>{new Date(order.created_at).toDateString()}</Table.Cell>
                      <Table.Cell>{order.customer.first_name} {order.customer.last_name}</Table.Cell>
                      <Table.Cell>
                        {order.items.map((item) => (
                          <div key={item.variant_id}>
                            {item.quantity} x {item.title} ({item.variant.title})
                          </div>
                        ))}
                      </Table.Cell>
                      <Table.Cell>${(order.total / 100).toFixed(2)}</Table.Cell>
                      <Table.Cell>{order.sales_channel.name}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </Tabs.Content>
            {/* SHIPPING */}
            <Tabs.Content value="shipping">
              <div className="px-xlarge py-large border-grey-20 border-b border-solid">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="inter-small-regular text-grey-50 pt-1.5">Orders below have been paid for and are ready for tracking number assignment. Rows in blue are partial fulfillments.</h3>
                  </div>
                </div>
              </div>
              {!showTracking ? (
                <Table>
                  <Table.Header>
                    <Table.Row>
                      <Table.HeaderCell>
                        <Checkbox
                          onCheckedChange={handleSelectAllShippingCheckboxes}
                          checked={fulfilledOrderFulfillments.every((fulfillment) => selectedShipping.includes(fulfillment.id))}/>
                      </Table.HeaderCell>
                      <Table.HeaderCell>Order#</Table.HeaderCell>
                      <Table.HeaderCell>Date</Table.HeaderCell>
                      <Table.HeaderCell>Shipping To</Table.HeaderCell>
                      <Table.HeaderCell>Items</Table.HeaderCell>
                      <Table.HeaderCell>Total</Table.HeaderCell>
                      <Table.HeaderCell>Sales Channel</Table.HeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {fulfilledOrders?.flatMap((order) =>
                      order.fulfillments.map((fulfillment) => {
                        if (fulfillment.canceled_at || fulfillment.shipped_at) { return null } // Skip if fulfillment cancelled or shipped
                        const isPartialShipment = order.items.some((orderItem) => {
                          const fulfillmentItem = fulfillment.items.find((item) => item.item_id === orderItem.id);
                          return !fulfillmentItem || fulfillmentItem.quantity !== orderItem.quantity;
                        })
                        return (
                          <Table.Row key={fulfillment.id} className={isPartialShipment ? "bg-ui-bg-highlight-hover" : "white"}>
                            <Table.Cell>
                              <Checkbox
                                checked={selectedShipping.includes(fulfillment.id)}
                                onCheckedChange={(checked) => handleShippingCheckbox(checked, fulfillment.id)}
                              />
                            </Table.Cell>
                            <Table.Cell>#{order.display_id}</Table.Cell>
                            <Table.Cell>{new Date(order.created_at).toDateString()}</Table.Cell>
                            <Table.Cell>{order.shipping_address.first_name} {order.shipping_address.last_name}</Table.Cell>
                            <Table.Cell>
                              {fulfillment.items.map((item) => {
                                const orderItem = order.items.find((oi) => oi.id === item.item_id);
                                if (!orderItem) return null; // Skip if order item not found
                                return (
                                  <div key={item.item_id}>
                                    {item.quantity} x {orderItem.title} ({orderItem.variant.title})
                                  </div>
                                );
                              })}
                            </Table.Cell>
                            <Table.Cell>${(order.total / 100).toFixed(2)}</Table.Cell>
                            <Table.Cell>{order.sales_channel.name}</Table.Cell>
                          </Table.Row>
                        )
                      })
                    )}
                  </Table.Body>
                </Table>
              ) : (
                <Table>
                  <Table.Header>
                    <Table.Row>
                      <Table.HeaderCell>Order#</Table.HeaderCell>
                      <Table.HeaderCell>Date</Table.HeaderCell>
                      <Table.HeaderCell>Shipping To</Table.HeaderCell>
                      <Table.HeaderCell>Items</Table.HeaderCell>
                      <Table.HeaderCell>Tracking Numbers</Table.HeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {fulfilledOrders?.flatMap((order) =>
                      order.fulfillments.map((fulfillment) => {
                        if (fulfillment.canceled_at) { return null } // Skip if fulfillment cancelled
                        if (!selectedShipping.includes(fulfillment.id)) { return null } // Skip if fulfillment is not selected
                        const row = (
                          <Table.Row key={fulfillment.id}>
                            <Table.Cell>#{order.display_id}</Table.Cell>
                            <Table.Cell>{new Date(order.created_at).toDateString()}</Table.Cell>
                            <Table.Cell>{order.shipping_address.first_name} {order.shipping_address.last_name}</Table.Cell>
                            <Table.Cell>
                            {fulfillment.items.map((item) => {
                              const orderItem = order.items.find((oi) => oi.id === item.item_id);
                              if (!orderItem) return null; // Skip if order item not found
                              return (
                                <div key={item.item_id}>
                                  {item.quantity} x {orderItem.title} ({orderItem.variant.title})
                                </div>
                              );
                            })}
                            </Table.Cell>
                            <Table.Cell>
                              <Input
                                ref={(ref) => {
                                  const index = fulfilledOrdersSelected.findIndex(
                                    (f) => f.id === fulfillment.id
                                  )
                                  if (ref) {
                                    // Create a new RefObject and assign its current property the ref
                                    inputRefs.current[index] = { current: ref };
                                  }
                                }}
                                placeholder="Enter tracking number (13 digits)"
                                maxLength={13}
                                onFocus={() => {
                                  setCurrentIndex(fulfilledOrdersSelected.findIndex(f => f.id === fulfillment.id));
                                }}
                                onKeyUp={(e) => handleTrackingNumbers(e, currentIndex, order.id, fulfillment.id)}
                              /> 
                            </Table.Cell>
                          </Table.Row>
                        )
                        return row
                      })
                    )}
                  </Table.Body>
                </Table>
              )}
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
                    <Table.HeaderCell>Date</Table.HeaderCell>
                    <Table.HeaderCell>Customer Email</Table.HeaderCell>
                    <Table.HeaderCell>Total</Table.HeaderCell>
                    <Table.HeaderCell>Sales Channel</Table.HeaderCell>
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
                      <Table.Cell>{new Date(order.created_at).toDateString()}</Table.Cell>
                      <Table.Cell>{order.customer.email}</Table.Cell>
                      <Table.Cell>${(order.total / 100).toFixed(2)}</Table.Cell>
                      <Table.Cell>{order.sales_channel.name}</Table.Cell>
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
