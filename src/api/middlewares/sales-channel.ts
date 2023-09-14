import { Lifetime } from "awilix"
import PublishableApiKeyService from "@medusajs/medusa/dist/services/publishable-api-key"
import { NextFunction, Request, Response } from "express"
import { debugLog } from "../../scripts/debug";

export async function registerSalesChannelID(req, res, next) {
  // resolve publishable key service
  const publishableKeyService: PublishableApiKeyService = req.scope.resolve("publishableApiKeyService")
  // Retrieve x-publishable-api-key
  const pubKey = req.get("x-publishable-api-key")
  // grab sales channels
  const channels = await publishableKeyService.listSalesChannels(pubKey)
  // return key of first sales channel
  const sales_channel_id = String(channels[0]?.id)

  // Register the Sales Channel ID
  req.scope.register({
    salesChannelID: {
      resolve: () => sales_channel_id,
    },
  })
  
  next()
}
