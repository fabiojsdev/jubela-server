import { MigrationInterface, QueryRunner } from 'typeorm';

export class New1772236381940 implements MigrationInterface {
  name = 'New1772236381940';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "password_hash" character varying(255) NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "password_hash"`);
  }
}
