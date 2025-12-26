import { MigrationInterface, QueryRunner } from 'typeorm';

export class New1766766628080 implements MigrationInterface {
  name = 'New1766766628080';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order" ALTER COLUMN "refund_amount" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order" ALTER COLUMN "refund_amount" SET NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "refund_reason"`);
    await queryRunner.query(
      `CREATE TYPE "public"."order_refund_reason_enum" AS ENUM('customer_request', 'product_defect', 'wrong_item', 'not_delivered', 'duplicated_payment', 'other')`,
    );
    await queryRunner.query(
      `ALTER TABLE "order" ADD "refund_reason" "public"."order_refund_reason_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "cancel_reason"`);
    await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "canceled_at"`);
    await queryRunner.query(
      `ALTER TABLE "order" DROP COLUMN "refund_reason_code"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."order_refund_reason_code_enum"`,
    );
  }
}
