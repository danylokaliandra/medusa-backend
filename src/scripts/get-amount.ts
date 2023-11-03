import { formatAmount } from "medusa-react"
import { Region } from "@medusajs/medusa"

export const getAmount = (amount: number | null | undefined, region: Region) => {
  return formatAmount({
    amount: amount || 0,
    region: region,
    includeTaxes: false,
  })
}
