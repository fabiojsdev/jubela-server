import { MigrationInterface, QueryRunner } from 'typeorm';

export class New1776374041074 implements MigrationInterface {
  name = 'New1776374041074';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."payment_confirmation_payment_status_enum" AS ENUM('pendente', 'falhou', 'confirmado')`,
    );
    await queryRunner.query(
      `CREATE TABLE "payment_confirmation" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "payment_status" "public"."payment_confirmation_payment_status_enum" NOT NULL, "attempts" integer NOT NULL DEFAULT '0', "error_message" character varying(200) NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "processedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_99d719c23924b875e604577a242" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "payment_confirmation"`);
    await queryRunner.query(
      `DROP TYPE "public"."payment_confirmation_payment_status_enum"`,
    );
  }
}
