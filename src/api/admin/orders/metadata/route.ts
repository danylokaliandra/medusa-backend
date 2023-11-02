import { MedusaRequest, MedusaResponse } from "@medusajs/medusa"

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const id = req.body.id // TODO get this to pull ID from the params instead of the body
  const metadata = req.body.metadata

  const orderService = req.scope.resolve("orderService")

  const order = await orderService.update(id, { metadata: metadata })

  res.json({ order })
}
