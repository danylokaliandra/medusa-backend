import { Router } from "express"
import { registerSalesChannelID } from "./middlewares/sales-channel"

export default (rootDirectory: string): Router | Router[] => {
  // Custom routes
  const router = Router()
  router.use(registerSalesChannelID)

  return router
}
