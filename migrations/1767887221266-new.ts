import { MigrationInterface, QueryRunner } from 'typeorm';

export class New1767887221266 implements MigrationInterface {
  name = 'New1767887221266';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "refresh_token_employee" ADD "expiresAt" TIMESTAMP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_token_user" ADD "expiresAt" TIMESTAMP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "refresh_token_user" DROP COLUMN "expiresAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_token_employee" DROP COLUMN "expiresAt"`,
    );
  }
}
