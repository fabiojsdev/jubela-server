import { MigrationInterface, QueryRunner } from 'typeorm';

export class New1776377036060 implements MigrationInterface {
  name = 'New1776377036060';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payment_confirmation" ADD "jobId" integer NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_confirmation" ADD "orderId" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_confirmation" ADD CONSTRAINT "UQ_4fcb95cccf5b46c75c3c45c1acf" UNIQUE ("orderId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "order" ADD "paymentConfirmationId" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "order" ADD CONSTRAINT "UQ_032c061bf1422b58c79c6d34410" UNIQUE ("paymentConfirmationId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_confirmation" ADD CONSTRAINT "FK_4fcb95cccf5b46c75c3c45c1acf" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order" ADD CONSTRAINT "FK_032c061bf1422b58c79c6d34410" FOREIGN KEY ("paymentConfirmationId") REFERENCES "payment_confirmation"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order" DROP CONSTRAINT "FK_032c061bf1422b58c79c6d34410"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_confirmation" DROP CONSTRAINT "FK_4fcb95cccf5b46c75c3c45c1acf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order" DROP CONSTRAINT "UQ_032c061bf1422b58c79c6d34410"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order" DROP COLUMN "paymentConfirmationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_confirmation" DROP CONSTRAINT "UQ_4fcb95cccf5b46c75c3c45c1acf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_confirmation" DROP COLUMN "orderId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_confirmation" DROP COLUMN "jobId"`,
    );
  }
}
