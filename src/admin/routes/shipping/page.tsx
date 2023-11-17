import Medusa from "@medusajs/medusa-js"
import { RouteConfig } from "@medusajs/admin"
import React, { useState, useRef } from "react"
import { Checkbox, Container, Button, IconButton, Table, Tabs, Input } from "@medusajs/ui"
import { RocketLaunch, CubeSolid, XCircleSolid } from "@medusajs/icons"
import { formatAmount } from "medusa-react"
import { Region } from "@medusajs/medusa"
import { useAdminOrders, useAdminCustomPost } from "medusa-react"
import { CSVDownload } from "react-csv";

interface BatchMetadata {
  batch_created: string
  batch_name: string
  batch_color: string
}

interface Metadata {
  batch?: BatchMetadata | string
}

const Shipping = () => {
  const medusa = new Medusa({baseUrl: process.env.MEDUSA_BACKEND_URL, maxRetries: 3})
  const { mutate } = useAdminCustomPost(`/orders/metadata`,["order-metadata"])
  // state variables
  const [selectedFulfillmentOrders, setSelectedFulfillmentOrders] = useState([])
  const [selectedShippingFulfillments, setSelectedShippingFulfillments] = useState([])
  const [selectedPackingOrders, setSelectedPackingOrders] = useState([])
  const [showTracking, setShowTracking] = useState(false);
  const [trackingNumbers, setTrackingNumbers] = useState(new Array(selectedShippingFulfillments.length).fill({ fulfillmentId: "", trackingNumber: "" }));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [downloadCSVKey, setDownloadCSVKey] = useState(null);
  // overall orders
  const { orders, isLoading, error, refetch } = useAdminOrders({
    limit: 0, // no limit (grab all orders)
    offset: 0,
    status: ["pending"], // pending, completed, archived, canceled, requires_action
    payment_status: ["captured"], // captured, awaiting, not_paid, refunded, partially_refunded, canceled, requires_action
    // fulfillment_status: [] // not_fulfilled, fulfilled, partially_fulfilled, shipped, partially_shipped, canceled, returned, partially_returned, requires_action
    fields: "id,display_id,created_at,subtotal,discount_total,gift_card_total,tax_total,shipping_total,total,payment_status,fulfillment_status,status,fulfillments,sales_channel,edits,metadata",
    expand: "customer,fulfillments,items,sales_channel,shipping_address,edits,region",
  })
  const sortedOrders = orders ? orders.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) : [];
  // for use in fulfillment
  const fulfillmentOrders = sortedOrders ? sortedOrders.filter(order => order.fulfillment_status === 'not_fulfilled' || order.fulfillment_status === 'canceled') : []
  const fulfillmentOrdersFiltered = fulfillmentOrders.filter(order => selectedFulfillmentOrders.includes(order.display_id))
  // for use in packing
  const packingOrders = sortedOrders ? sortedOrders.filter(order => order.fulfillment_status === 'fulfilled') : []
  const packingOrdersFiltered = packingOrders.filter(order => selectedPackingOrders.includes(order.display_id));
  // for use in shipping
  const shippingOrders = sortedOrders ? sortedOrders.filter(order => order.fulfillment_status === 'fulfilled') : []
  const shippingFulfillments = shippingOrders
    .flatMap((order) => order.fulfillments)
    .filter((fulfillment) => fulfillment.canceled_at === null && fulfillment.shipped_at === null)
  const shippingFulfillmentsFiltered = shippingOrders.flatMap(order => order.fulfillments.filter(fulfillment => selectedShippingFulfillments.includes(fulfillment.id)))
  const trackingNumberInputRefs = useRef(shippingFulfillmentsFiltered.map(() => React.createRef<HTMLInputElement>()))

  // CURRENT FORMAT HELPER
  const getAmount = (amount, region: Region ) => {
    if (!amount) {
      return
    }
    return formatAmount({ amount, region, includeTaxes: false })
  }

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
      setSelectedFulfillmentOrders(fulfillmentOrders.map((order) => order.display_id));
    } else {
      setSelectedFulfillmentOrders([])
    }
  };

  const createFulfillments = async () => {
    for (const order of fulfillmentOrdersFiltered) {
      const itemsToFulfill = order.items.map(item => ({
        item_id: item.id,
        quantity: item.quantity,
      }))
      try {
        await medusa.admin.orders.createFulfillment(order.id, {
          items: itemsToFulfill
        })
      } catch (error) {
        console.error(`Failed to create fulfillment for order ${order.display_id}:`, error)
      }
    }
    // refetch orders
    refetch()
  }

  // PACKING LOGIC
  const colors = [
    'bg-ui-bg-base hover:bg-ui-bg-base-hover',
    'bg-ui-tag-green-bg hover:bg-ui-tag-green-bg-hover', // green
    'bg-ui-tag-purple-bg hover:bg-ui-tag-purple-bg-hover', // purple
    'bg-ui-tag-orange-bg hover:bg-ui-tag-orange-bg-hover', // orange
    'bg-ui-tag-blue-bg hover:bg-ui-tag-blue-bg-hover', // blue
    'bg-ui-tag-red-bg hover:bg-ui-tag-red-bg-hover', // red
    'bg-ui-tag-neutral-bg hover:bg-ui-tag-neutral-bg-hover', // gray
  ];

  const handlePackingCheckbox = (checked, orderId) => {
    if (checked) {
      setSelectedPackingOrders([...selectedPackingOrders, orderId])
    } else {
      setSelectedPackingOrders(selectedPackingOrders.filter((id) => id !== orderId))
    }
  }

  const handleSelectAllPackingCheckboxes = (checked) => {
    if (checked) {
      setSelectedPackingOrders(packingOrders.map((order) => order.display_id));
    } else {
      setSelectedPackingOrders([])
    }
  };

  const handleBatchAssign = async (batchId) => {
    // batchId 0 to clear batch
    for (const order of packingOrdersFiltered) {
      const metadata: Metadata = batchId === 0 ? { batch: "" } : {
        batch: {
          batch_created: new Date().toISOString(),
          batch_name: `Batch ${batchId}`,
          batch_color: colors[batchId],
        },
      };
      try {
        await mutate({ id: order.id, metadata: metadata });
      } catch (error) {
        console.error(`Failed to update order ${order.display_id}:`, error);
      }
    }
    // refetch orders
    refetch();
  };

  const generateCSVData = () => {
    return packingOrdersFiltered.map(order => ({
      name: order.shipping_address.first_name + (order.shipping_address.last_name ? ` ${order.shipping_address.last_name}` : '') ,
      address_1: order.shipping_address.address_1,
      address_2: order.shipping_address.address_2,
      city: order.shipping_address.city,
      province: order.shipping_address.province,
      postal_code: order.shipping_address.postal_code,
    }));
  };

  const handleCSVDownload = () => {
    setDownloadCSVKey(Date.now()); // Use the current timestamp as a unique key
    setTimeout(() => setDownloadCSVKey(null), 500); // Reset the key after 0.5s
  }

  const generatePackingList = async () => {
    // CSS content based on Tailwind CSS
    let cssContent = `
      .font-bold { font-weight: 700; }
      .font-semibold { font-weight: 600; }
      .text-xl { font-size: 1.25rem; }
      .text-lg { font-size: 1.125rem; }
      .text-base { font-size: 1rem; }
      .w-12 { width: 3rem; }
      .h-12 { height: 3rem; }
      .w-full { width: 100%; }
      .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
      .bg-gray-200 { background-color: rgb(229 231 235); }
      .bg-gray-300 { background-color: rgb(209 213 219); }
      .text-left { text-align: left; }
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .items-center { align-items: center; }
      .flex { display: flex; }
      .justify-between { justify-content: space-between; }
      .page-break { page-break-after: always; }

      @media print {
        @page {
          size: portrait;
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

    for (let i = 0; i < packingOrdersFiltered.length; i++) {
      const order = packingOrdersFiltered[i];
      // Capture Order Notes
      const { notes } = await medusa.admin.notes.list({
        resource_id: order.id,
        limit: 10,
        offset: 0
      });

      // Order Header
      html += `
        <div class="bg-gray-300 text-center py-1 flex justify-between items-center">
          <h2 class="text-xl font-semibold">${order.sales_channel.name ?? "undefined"}</h2>
          <h1 class="text-lg font-bold">Order #${String(order.display_id).padStart(8, '0')}${order.metadata.batch ? ` - ${(order.metadata.batch as BatchMetadata).batch_name}` : ''}</h1>
          <img src="${order.sales_channel.metadata?.logo ?? "undefined"}" alt="Logo" class="w-12 h-12 max-w-full max-h-full" />
        </div>
        <div class="flex justify-between py-1">
          <div class="flex flex-col">
            <table>
              <tr>
                <td class="text-base font-semibold">Ship To:</td>
                <td>${order.shipping_address.first_name} ${order.shipping_address.last_name}</td>
              </tr>
              <tr>
                <td class="text-base font-semibold"></td>
                <td>${order.shipping_address.address_1} ${order.shipping_address.address_2}</td>
              </tr>
              <tr>
                <td class="text-base font-semibold"></td>
                <td>${order.shipping_address.city}, ${order.shipping_address.province}</td>
              </tr>
              <tr>
                <td class="text-base font-semibold"></td>
                <td>${order.shipping_address.postal_code}</td>
              </tr>
            </table>
          </div>
          <div class="flex flex-col">
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
          <tr class="text-base font-semibold bg-gray-200">
            <th class="text-base font-semibold text-left">ITEM</th>
            <th class="text-base font-semibold text-left">SIZE</th>
            <th class="text-base font-semibold text-right">UNIT PRICE</th>
            <th class="text-base font-semibold text-center">QUANTITY</th>
            <th class="text-base font-semibold text-right">TOTAL</th>
          </tr>
      `;

      // Order Items (inside each order)
      order.items.forEach(item => {
        html += `
          <tr>
            <td class="text-base text-left">${item.title}</td>
            <td class="text-base text-left"> ${item.variant.title}</td>
            <td class="text-base text-right">${getAmount(item.unit_price,order.region)}</td>
            <td class="text-base text-center">${item.quantity}</td>
            <td class="text-base text-right">${getAmount(item.subtotal,order.region)}</td>
          </tr>
        `;
      });

      // Order Footer
      html += `
        </table>
        <div class="flex justify-between py-1">
          <div>
            ${notes.length > 0 ? (`
              <table>
                <thead>
                  <tr>
                    <th class="text-base font-semibold text-left">Notes:</th>
                  </tr>
                </thead>
                <tbody>
                  ${notes.map((note) => `
                    <tr>
                      <td class="text-base">${note.value} (${new Date(note.created_at).toLocaleString()} by ${note.author.first_name} ${note.author.last_name})</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            `) : ""}
          </div>
          <div>
            <table>
              <tr>
                <td class="text-base font-semibold text-right">
                  Sub Total:
                </td>
                <td class="text-base font-semibold text-right">${getAmount(order.subtotal,order.region)}</td>
              </tr>
              ${order.discount_total > 0 ? (`
                <tr>
                  <td class="text-base font-semibold text-right">
                    Discount:
                  </td>
                  <td class="text-base font-semibold text-right">-${getAmount(order.discount_total,order.region)}</td>
                </tr>
              `) : ""}
              ${order.gift_card_total > 0 ? (`
                <tr>
                  <td class="text-base font-semibold text-right">
                    Gift Card:
                  </td>
                  <td class="text-base font-semibold text-right">-${getAmount(order.gift_card_total,order.region)}</td>
                </tr>
              `) : ""}
              ${order.tax_total > 0 ? (`
                <tr>
                  <td class="text-base font-semibold text-right">
                    Tax:
                  </td>
                  <td class="text-base font-semibold text-right">${getAmount(order.tax_total,order.region)}</td>
                </tr>
              `) : ""}
              ${order.shipping_total > 0 ? (`
                <tr>
                  <td class="text-base font-semibold text-right">
                    Shipping:
                  </td>
                  <td class="text-base font-semibold text-right">${getAmount(order.shipping_total,order.region)}</td>
                </tr>
              `) : ""}
              <tr>
                <td class="text-base font-semibold text-right">
                  Total:
                </td>
                <td class="text-base font-semibold text-right">${getAmount(order.total,order.region)}</td>
              </tr>
            </table>
          </div>
        </div>
        <br>
      `;

      // Insert a page break after every second packing list, unless it's the last one
      if ((i + 1) % 2 === 0 && i !== packingOrdersFiltered.length - 1) {
        html += '<div class="page-break"></div>';
      }

    };

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

  // SHIPPING LOGIC
  const handleShippingCheckbox = (checked, fulfillmentId) => {
    if (checked) {
      setSelectedShippingFulfillments([...selectedShippingFulfillments, fulfillmentId]);
    } else {
      setSelectedShippingFulfillments(selectedShippingFulfillments.filter((id) => id !== fulfillmentId));
    }
  }

  const handleSelectAllShippingCheckboxes = (checked) => {
    if (checked) {
      const allFulfillmentIds = shippingFulfillments.map((fulfillment) => fulfillment.id)
      setSelectedShippingFulfillments(allFulfillmentIds)
    } else {
      setSelectedShippingFulfillments([])
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
    if (e.target.value.length === 13 && trackingNumberInputRefs.current[index + 1] !== undefined) {
      trackingNumberInputRefs.current[index+1].current.focus();
    }
  }

  const createShipments = async () => {
    // Iterate over each fulfillment and tracking number
    // TODO: extend this to handle multiple tracking numbers (requires modifying the input page as well)
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
                <Tabs.Trigger value="packing">Packing</Tabs.Trigger>
                <Tabs.Trigger value="shipping">Shipping</Tabs.Trigger>
              </Tabs.List>
            </div>
            <div>
              <Tabs.Content value="fulfillment">
                <Button onClick={createFulfillments} disabled={selectedFulfillmentOrders.length === 0}>Fulfill Orders{selectedFulfillmentOrders.length > 0 && ` #${selectedFulfillmentOrders.sort((a, b) => a - b).join(", ")}`}</Button>
              </Tabs.Content>
              <Tabs.Content value="packing">
              <div className="flex space-x-2">
                <IconButton onClick={() => handleBatchAssign(0)}><XCircleSolid /></IconButton>
                {Array.from({ length: 6 }).map((_, i) => (
                  <IconButton
                    key={i}
                    onClick={() => handleBatchAssign(i+1)}
                    className={ colors[i+1] }
                  >
                    <CubeSolid/>
                  </IconButton>
                ))}
                <Button onClick={handleCSVDownload} disabled={selectedPackingOrders.length === 0}>
                  Export Addresses
                </Button>
                {downloadCSVKey && (
                  <CSVDownload
                    key={downloadCSVKey}
                    data={generateCSVData()}
                    target="_blank"
                  />
                )}
                <Button onClick={generatePackingList}
                  disabled={selectedPackingOrders.length === 0}>Print Packing Lists{selectedPackingOrders.length > 0 && ` for Orders #${selectedPackingOrders.sort((a, b) => a - b).join(", ")}`}
                </Button>
              </div>
              </Tabs.Content>
              <Tabs.Content value="shipping">
              {!showTracking ? (
                <Button onClick={handleShowTracking} disabled={selectedShippingFulfillments.length === 0}>Enter Tracking Numbers</Button>
              ) : (
                <div>
                  <Button onClick={handleShowTracking}>Back</Button>
                  <Button onClick={createShipments} disabled={selectedShippingFulfillments.length === 0 || selectedShippingFulfillments.some((fulfillmentId) => {
                    const trackingInfo = trackingNumbers.find((tn) => tn && tn.fulfillmentId === fulfillmentId);
                    return !trackingInfo || trackingInfo.trackingNumber.length !== 13;
                  })}>Ship & Mark Complete</Button>
                </div>
              )}
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
                        checked={fulfillmentOrders.every((order) => selectedFulfillmentOrders.includes(order.display_id))}
                      />
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
                  {fulfillmentOrders?.map((order) => (
                    <Table.Row
                      key={order.id}
                      onClick={(event) => {
                        // ignore if the target is the checkbox column
                        if ((event.target as Element).closest('.ignoreClick')) return;
                        window.open(`/app/a/orders/${order.id}`, '_blank');
                      }}
                    >
                      <Table.Cell className="ignoreClick">
                        <Checkbox
                          checked={selectedFulfillmentOrders.includes(order.display_id)}
                          onCheckedChange={(checked) => handleFulfillmentCheckbox(checked, order.display_id)}/>
                      </Table.Cell>
                      <Table.Cell>#{order.display_id}</Table.Cell>
                      <Table.Cell>{new Date(order.created_at).toDateString()}</Table.Cell>
                      <Table.Cell>{order.shipping_address.first_name} {order.shipping_address.last_name}</Table.Cell>
                      <Table.Cell>
                        {order.items.map((item) => (
                          <div key={item.variant_id}>
                            {item.quantity} x {item.title} ({item.variant.title})
                          </div>
                        ))}
                      </Table.Cell>
                      <Table.Cell>{getAmount(order.total,order.region)}</Table.Cell>
                      <Table.Cell>{order.sales_channel.name}</Table.Cell>
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
                        checked={packingOrders.every((order) => selectedPackingOrders.includes(order.display_id))}
                      />
                    </Table.HeaderCell>
                    <Table.HeaderCell>Batch</Table.HeaderCell>
                    <Table.HeaderCell>Order#</Table.HeaderCell>
                    <Table.HeaderCell>Date</Table.HeaderCell>
                    <Table.HeaderCell>Shipping To</Table.HeaderCell>
                    <Table.HeaderCell>Total</Table.HeaderCell>
                    <Table.HeaderCell>Sales Channel</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {packingOrders?.map((order) => (
                    <Table.Row
                      key={order.id}
                      onClick={(event) => {
                        // ignore if the target is the checkbox column
                        if ((event.target as Element).closest('.ignoreClick')) return;
                        window.open(`/app/a/orders/${order.id}`, '_blank');
                      }}
                      className={
                        typeof order.metadata?.batch === 'object' && 'batch_color' in (order.metadata.batch as BatchMetadata)
                          ? (order.metadata.batch as BatchMetadata).batch_color
                          : ""
                      }
                      >
                      <Table.Cell className="ignoreClick">
                        <Checkbox
                          checked={selectedPackingOrders.includes(order.display_id)}
                          onCheckedChange={(checked) => handlePackingCheckbox(checked, order.display_id)}/>
                      </Table.Cell>
                      <Table.Cell>
                        {typeof order.metadata?.batch === 'object'
                          ? (order.metadata.batch as BatchMetadata).batch_name
                          : (order.metadata?.batch as string) ?? ""}
                      </Table.Cell>
                      <Table.Cell>#{order.display_id}</Table.Cell>
                      <Table.Cell>{new Date(order.created_at).toDateString()}</Table.Cell>
                      <Table.Cell>{order.shipping_address.first_name} {order.shipping_address.last_name}</Table.Cell>
                      <Table.Cell>{getAmount(order.total,order.region)}</Table.Cell>
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
                    <h3 className="inter-small-regular text-grey-50 pt-1.5">Orders below have been paid for and are ready for tracking number assignment. Orders in blue have multiple fulfillments.</h3>
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
                          checked={shippingFulfillments.every((fulfillment) => selectedShippingFulfillments.includes(fulfillment.id))}/>
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
                    {shippingOrders?.flatMap((order) =>
                      order.fulfillments.map((fulfillment) => {
                        if (fulfillment.canceled_at || fulfillment.shipped_at) { return null } // Skip if fulfillment cancelled or shipped
                        const isPartialShipment = order.items.some((orderItem) => {
                          const fulfillmentItem = fulfillment.items.find((item) => item.item_id === orderItem.id);
                          return !fulfillmentItem || fulfillmentItem.quantity !== orderItem.quantity;
                        })
                        return (
                          <Table.Row
                            key={fulfillment.id}
                            onClick={(event) => {
                              // ignore if the target is the checkbox column
                              if ((event.target as Element).closest('.ignoreClick')) return;
                              window.open(`/app/a/orders/${order.id}`, '_blank');
                            }}
                            className={isPartialShipment ? "bg-ui-bg-highlight-hover" : "white"}
                          >
                            <Table.Cell className="ignoreClick">
                              <Checkbox
                                checked={selectedShippingFulfillments.includes(fulfillment.id)}
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
                            <Table.Cell>{getAmount(order.total,order.region)}</Table.Cell>
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
                    {shippingOrders?.flatMap((order) =>
                      order.fulfillments.map((fulfillment) => {
                        if (fulfillment.canceled_at) { return null } // Skip if fulfillment cancelled
                        if (!selectedShippingFulfillments.includes(fulfillment.id)) { return null } // Skip if fulfillment is not selected
                        const row = (
                          <Table.Row
                            key={fulfillment.id}
                            onClick={(event) => {
                              // ignore if the target is the checkbox column
                              if ((event.target as Element).closest('.ignoreClick')) return;
                              window.open(`/app/a/orders/${order.id}`, '_blank');
                            }}
                          >
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
                            <Table.Cell className="ignoreClick">
                              <Input
                                ref={(ref) => {
                                  const index = shippingFulfillmentsFiltered.findIndex(
                                    (f) => f.id === fulfillment.id
                                  )
                                  if (ref) {
                                    // Create a new RefObject and assign its current property the ref
                                    trackingNumberInputRefs.current[index] = { current: ref };
                                  }
                                }}
                                placeholder="Enter tracking number (13 digits)"
                                maxLength={13}
                                onFocus={() => {
                                  setCurrentIndex(shippingFulfillmentsFiltered.findIndex(f => f.id === fulfillment.id));
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
