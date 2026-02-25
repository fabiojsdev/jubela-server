import { MigrationInterface, QueryRunner } from 'typeorm';

export class New1771980495901 implements MigrationInterface {
  name = 'New1771980495901';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "log_user" DROP CONSTRAINT "UQ_3202ebc28ae6901df4192b4e336"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "log_user" ADD CONSTRAINT "UQ_3202ebc28ae6901df4192b4e336" UNIQUE ("email")`,
    );
  }
}
