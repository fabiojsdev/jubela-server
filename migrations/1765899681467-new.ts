import { MigrationInterface, QueryRunner } from "typeorm";

export class New1765899681467 implements MigrationInterface {
    name = 'New1765899681467'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "paymentId"`);
        await queryRunner.query(`CREATE TYPE "public"."order_refund_reason_enum" AS ENUM('customer_request', 'product_defect', 'wrong_item', 'not_delivered', 'duplicated_payment', 'other')`);
        await queryRunner.query(`ALTER TABLE "order" ADD "refund_reason" "public"."order_refund_reason_enum" NOT NULL`);
        await queryRunner.query(`ALTER TABLE "order" ADD "refunded_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "order" ADD "paymentId" character varying(255)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "paymentId"`);
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "refunded_at"`);
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "refund_reason"`);
        await queryRunner.query(`DROP TYPE "public"."order_refund_reason_enum"`);
        await queryRunner.query(`ALTER TABLE "order" ADD "paymentId" character varying(255)`);
    }

}
