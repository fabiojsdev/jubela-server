import { MigrationInterface, QueryRunner } from 'typeorm';

export class New1765842184456 implements MigrationInterface {
  name = 'New1765842184456';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order" ADD "paymentId" character varying(255)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "paymentId"`);
  }
}
