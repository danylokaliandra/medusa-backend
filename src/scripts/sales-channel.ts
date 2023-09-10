export const getStoreDetails = (sales_channel) => {
    return {
        store_name: sales_channel.name,
        store_url: sales_channel.description,
        store_logo: sales_channel.description + "/favicon.ico"
        // add any other details as needed in future
        // TODO replace with sales channel metadata object when available
    };
}