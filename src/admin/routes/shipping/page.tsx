import Medusa from "@medusajs/medusa-js"
import { RouteConfig } from "@medusajs/admin"
import React, { useState, useRef } from "react"
import { Checkbox, Container, Button, Table, Tabs, Input } from "@medusajs/ui"
import { useAdminOrders } from "medusa-react"
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
    fields: "id,display_id,created_at,subtotal,tax_total,shipping_total,total,payment_status,fulfillment_status,status,fulfillments,sales_channel,edits",
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
    // CSS content based on Tailwind CSS
    let cssContent = `
      .font-bold { font-weight: 700; }
      .text-xl { font-size: 1.25rem; } /* added for larger store name */
      .text-lg { font-size: 1.125rem; }
      .text-base { font-size: 1rem; }
      .font-semibold { font-weight: 600; }
      .w-24 { width: 6rem; }
      .h-24 { height: 6rem; }
      .w-full { width: 100%; }
      .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
      .bg-gray-200 { background-color: #edf2f7; }
      .text-center { text-align: center; }
      .flex { display: flex; }
      .justify-between { justify-content: space-between; }
      .items-center { align-items: center; }
      .page-break { page-break-after: always; }

      @media print {
        @page {
          size: landscape;
        }
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `;
    let encodedCssContent = encodeURIComponent(cssContent);
  
    let html = `
      <html>
      <head>
        <link rel="stylesheet" href="data:text/css;charset=UTF-8,${encodedCssContent}">
      </head>
      <body>
    `;

    shippedOrdersSelected.forEach(order => {
      // Order Header
      html += `
        <div class="bg-gray-200 text-center py-2">
          <h1 class="text-lg font-bold">Packing Slip</h1>
        </div>
        <div class="flex justify-between items-center py-2">
          <div>
            <h2 class="text-xl font-semibold">${order.sales_channel.metadata?.store_name ?? "UNKNOWN"}</h2>
            <p>${order.sales_channel.metadata?.store_url ?? "UNKNOWN"}</p>
          </div>
          <div>
            <img src="${order.sales_channel.metadata?.store_logo ?? "UNKNOWN"}" alt="Logo" class="w-24 h-24" />
          </div>
        </div>
        <div class="flex justify-between py-2">
          <div>
            <h2 class="text-base font-semibold">Ship To:</h2>
            <p>${order.shipping_address.first_name} ${order.shipping_address.last_name}</p>
            <p>${order.shipping_address.address_1}</p>
          </div>
          <div>
            <table>
              <tr>
                <td class="text-base font-semibold">Order #</td>
                <td>${String(order.display_id).padStart(8, '0')}</td>
              </tr>
              <tr>
                <td class="text-base font-semibold">Date</td>
                <td>${new Date(order.created_at).toDateString()}</td>
              </tr>
              <tr>
                <td class="text-base font-semibold">User</td>
                <td>${order.customer.email}</td>
              </tr>
              <tr>
                <td class="text-base font-semibold">Ship Date</td>
                <td>${new Date(order.fulfillments[0].shipped_at).toDateString()}</td>
              </tr>
            </table>
          </div>
        </div>
        <table class="w-full">
          <tr class="font-semibold bg-gray-200">
            <th class="font-semibold" align="left">Item</th>
            <th class="font-semibold" align="left">Size</th>
            <th class="font-semibold" align="right">Unit Price</th>
            <th class="font-semibold" align="center">Quantity</th>
            <th class="font-semibold" align="right">Total</th>
          </tr>
      `;

      // Order Items (inside each order)
      order.items.forEach(item => {
        html += `
          <tr>
            <td class="text-base" align="left">${item.title}</td>
            <td class="text-base" align="left"> ${item.variant.title}</td>
            <td class="text-base" align="right">${(item.unit_price / 100).toFixed(2)}</td>
            <td class="text-base" align="center">${item.quantity}</td>
            <td class="text-base" align="right">${((item.unit_price * item.quantity) / 100).toFixed(2)}</td>
          </tr>
        `;
      });

      // Order Footer
      html += `
        </table>
        <table class="w-full">
          <tr>
            <td rowspan="4">
              TODO: Add internal order notes here and any other useful information.
            </td>
            <td class="text-base font-semibold" align="right">
              Sub Total:
            </td>
            <td class="text-base font-semibold" align="right">${(order.subtotal / 100).toFixed(2)}</td>
          </tr>
          <tr>
            <td class="text-base font-semibold" align="right">
              Tax:
            </td>
            <td class="text-base font-semibold" align="right">${(order.tax_total / 100).toFixed(2)}</td>
          </tr>
          <tr>
            <td class="text-base font-semibold" align="right">
              Shipping:
            </td>
            <td class="text-base font-semibold" align="right">${(order.shipping_total / 100).toFixed(2)}</td>
          </tr>
          <tr>
          <td class="text-base font-semibold" align="right">
              Total:
            </td>
            <td class="text-base font-semibold" align="right">${(order.total / 100).toFixed(2)}</td>
          </tr>
        </table>
        <div class="page-break"></div>
      `;
    });

    html += `
      </body>
      </html>
    `;

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
        <Tabs defaultValue="packing">
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
