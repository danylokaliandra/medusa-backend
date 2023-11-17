export const getStoreDetails = (sales_channel) => {
  return {
    sales_channel_id: sales_channel.id,
    store_name: sales_channel.name,
    store_description: sales_channel.description,
    store_url: sales_channel.metadata.store_url,
    store_logo: sales_channel.metadata.store_logo,
    store_favicon: sales_channel.metadata.store_favicon,
    store_email: sales_channel.metadata.store_email,
    store_transfers: sales_channel.metadata.store_transfers,
    // add any other details as needed in future
  };
}
