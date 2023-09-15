import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm"
import { Customer as MedusaCustomer } from "@medusajs/medusa"

@Entity()
export class Customer extends MedusaCustomer {
  @Index("CustomerSalesChannelId")
  @Column({ nullable: true })
  sales_channel_id?: string;
}
