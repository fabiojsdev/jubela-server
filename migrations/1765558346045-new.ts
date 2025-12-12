import { MigrationInterface, QueryRunner } from 'typeorm';

export class New1765558346045 implements MigrationInterface {
  name = 'New1765558346045';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "order" ADD "paid_at" TIMESTAMP`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "paid_at"`);
  }
}
