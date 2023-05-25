import { MigrationInterface, QueryRunner } from "typeorm"

export class AddCustomerSalesChannelId1685018915459 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "customer" ADD "sales_channel_id" character varying`);
        await queryRunner.query(`ALTER TABLE "customer" DROP CONSTRAINT "UQ_unique_email_for_guests_and_customer_accounts"`);
        await queryRunner.query(`ALTER TABLE "customer" ADD CONSTRAINT "UQ_unique_email_sales_channel" UNIQUE (email, has_account, sales_channel_id)`);
        await queryRunner.query(`CREATE INDEX "CustomerSalesChannelId" ON "customer" ("sales_channel_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."CustomerSalesChannelId"`);
        await queryRunner.query(`ALTER TABLE "customer" DROP CONSTRAINT "UQ_unique_email_sales_channel"`);
        await queryRunner.query(`ALTER TABLE "customer" ADD CONSTRAINT "UQ_unique_email_for_guests_and_customer_accounts" UNIQUE (email, has_account)`);
        await queryRunner.query(`ALTER TABLE "customer" DROP COLUMN "sales_channel_id"`);
    }
}
