import { MigrationInterface, QueryRunner } from "typeorm"

export class RemoveCustomerUniquenessIndex1711895554785 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_unique_email_for_guests_and_customer_accounts"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_unique_email_for_guests_and_customer_accounts" ON "customer" ("email", "has_account") WHERE "deleted_at" IS NULL`);
    }
}
