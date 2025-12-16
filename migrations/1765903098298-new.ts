import { MigrationInterface, QueryRunner } from 'typeorm';

export class New1765903098298 implements MigrationInterface {
  name = 'New1765903098298';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "refund_reason"`);
    await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "refunded_at"`);
    await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "paymentId"`);
    await queryRunner.query(
      `ALTER TABLE "order" ADD "refund_reason" "public"."order_refund_reason_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "order" ADD "refunded_at" TIMESTAMP`);
    await queryRunner.query(
      `ALTER TABLE "order" ADD "refund_amount" numeric(10,2) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "order" ADD "paymentId" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."order_status_enum" RENAME TO "order_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."order_status_enum" AS ENUM('Cancelado', 'Aprovado', 'Aguardando pagamento', 'Pendente', 'Rejeitado', 'Pagamento em análise', 'Separado', 'Embalado', 'Em transporte', 'Saiu para entrega', 'Entregue', 'Aguardando retirada', 'Extraviado', 'Em analise', 'Devolvido', 'Parcialmente devolvido')`,
    );
    await queryRunner.query(
      `ALTER TABLE "order" ALTER COLUMN "status" TYPE "public"."order_status_enum" USING "status"::"text"::"public"."order_status_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."order_status_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."order_status_enum_old" AS ENUM('Cancelado', 'Aprovado', 'Aguardando pagamento', 'Pendente', 'Rejeitado', 'Pagamento em análise', 'Separado', 'Embalado', 'Em transporte', 'Saiu para entrega', 'Entregue', 'Aguardando retirada', 'Devolvido', 'Extraviado', 'Em analise', 'devolvido')`,
    );
    await queryRunner.query(
      `ALTER TABLE "order" ALTER COLUMN "status" TYPE "public"."order_status_enum_old" USING "status"::"text"::"public"."order_status_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."order_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."order_status_enum_old" RENAME TO "order_status_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "paymentId"`);
    await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "refund_amount"`);
    await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "refunded_at"`);
    await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "refund_reason"`);
    await queryRunner.query(
      `ALTER TABLE "order" ADD "paymentId" character varying(255)`,
    );
    await queryRunner.query(`ALTER TABLE "order" ADD "refunded_at" TIMESTAMP`);
    await queryRunner.query(
      `CREATE TYPE "public"."order_refund_reason_enum" AS ENUM('customer_request', 'product_defect', 'wrong_item', 'not_delivered', 'duplicated_payment', 'other')`,
    );
    await queryRunner.query(
      `ALTER TABLE "order" ADD "refund_reason" "public"."order_refund_reason_enum"`,
    );
  }
}
