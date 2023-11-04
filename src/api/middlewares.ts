import type { MiddlewaresConfig } from "@medusajs/medusa"
import type { 
  MedusaNextFunction, 
  MedusaRequest, 
  MedusaResponse,
} from "@medusajs/medusa"
import PublishableApiKeyService from "@medusajs/medusa/dist/services/publishable-api-key"
import { debugLog } from "../scripts/debug"

// middleware to use the publishable API key to register the sales channel on every request from the store
const salesChannelMiddleware = async (
  req: MedusaRequest, 
  res: MedusaResponse, 
  next: MedusaNextFunction
) => {
  // resolve publishable key service
  const publishableKeyService: PublishableApiKeyService = req.scope.resolve("publishableApiKeyService")
  // Retrieve x-publishable-api-key
  const pubKey = req.get("x-publishable-api-key")
  // grab sales channels
  const channels = await publishableKeyService.listSalesChannels(pubKey)
  // return key of first sales channel
  const sales_channel_id = String(channels[0]?.id)
  debugLog(`running salesChannelMiddleware for sales channel '${channels[0]?.name}'`)

  // Register the Sales Channel ID
  req.scope.register({
    salesChannelID: {
      resolve: () => sales_channel_id,
    },
  })

  next()
}

export const config: MiddlewaresConfig = {
  routes: [
    {
      matcher: "/store/*",
      middlewares: [salesChannelMiddleware],
    },
  ],
}
