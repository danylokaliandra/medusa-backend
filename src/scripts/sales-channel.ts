export const getStoreDetails = (sales_channel) => {
    return {
        store_name: sales_channel.name,
        store_url: sales_channel.description,
        // add any other details as needed in future
    };
}