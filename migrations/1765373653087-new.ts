import { MigrationInterface, QueryRunner } from 'typeorm';

export class New1765373653087 implements MigrationInterface {
  name = 'New1765373653087';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "description"`);
    await queryRunner.query(
      `ALTER TABLE "order" ADD "description" character varying(255) NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "description"`);
    await queryRunner.query(
      `ALTER TABLE "order" ADD "description" character varying(255) NOT NULL`,
    );
  }
}
