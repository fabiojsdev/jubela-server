import { MigrationInterface, QueryRunner } from 'typeorm';

export class New1766763172804 implements MigrationInterface {
  name = 'New1766763172804';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "lowStock"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "product" ADD "lowStock" integer`);
  }
}
