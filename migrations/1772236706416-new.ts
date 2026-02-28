import { MigrationInterface, QueryRunner } from 'typeorm';

export class New1772236706416 implements MigrationInterface {
  name = 'New1772236706416';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "password_hash" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "password_hash" SET NOT NULL`,
    );
  }
}
