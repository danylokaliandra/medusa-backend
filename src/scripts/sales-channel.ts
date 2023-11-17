export const getStoreDetails = (sales_channel) => {
  return {
    sales_channel_id: sales_channel.id,
    name: sales_channel.name,
    description: sales_channel.description,
    metadata: sales_channel.metadata,
  };
}
