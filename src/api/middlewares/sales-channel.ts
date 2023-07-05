import { Lifetime } from "awilix"

export async function registerSalesChannel(req, res, next) {
  // Retrieve Sales Channel from the request header 
  const salesChannel = req.header("sales_channel_id")
  
  // Register the Sales Channel
  req.scope.register({
    salesChannel: {
      resolve: () => salesChannel,
    },
  })
  
  next()
}
