import { Router } from "express"
import { registerSalesChannel } from "./middlewares/sales-channel"

export default (rootDirectory: string): Router | Router[] => {
  // Custom routes
  const router = Router()
  router.use(registerSalesChannel)

  return router
}
