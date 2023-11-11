export const getStoreDetails = (sales_channel) => {
  return {
    sales_channel_id: sales_channel.id,
    store_name: sales_channel.name,
    store_description: sales_channel.description,
    store_url: sales_channel.metadata.store_url,
    store_logo: sales_channel.metadata.store_logo,
    store_favicon: sales_channel.metadata.store_favicon,
    // add any other details as needed in future
  };
}
