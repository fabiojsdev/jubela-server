import { MigrationInterface, QueryRunner } from 'typeorm';

export class New1765574050528 implements MigrationInterface {
  name = 'New1765574050528';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."order_status_enum" RENAME TO "order_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."order_status_enum" AS ENUM('Cancelado', 'Aprovado', 'Aguardando pagamento', 'Pendente', 'Rejeitado', 'Pagamento em análise', 'Separado', 'Embalado', 'Em transporte', 'Saiu para entrega', 'Entregue', 'Aguardando retirada', 'Devolvido', 'Extraviado', 'Em analise')`,
    );
    await queryRunner.query(
      `ALTER TABLE "order" ALTER COLUMN "status" TYPE "public"."order_status_enum" USING "status"::"text"::"public"."order_status_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."order_status_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."order_status_enum_old" AS ENUM('Cancelado', 'Aprovado', 'Aguardando pagamento', 'Rejeitado', 'Pagamento em análise', 'Separado', 'Embalado', 'Em transporte', 'Saiu para entrega', 'Entregue', 'Aguardando retirada', 'Devolvido', 'Extraviado', 'Em analise')`,
    );
    await queryRunner.query(
      `ALTER TABLE "order" ALTER COLUMN "status" TYPE "public"."order_status_enum_old" USING "status"::"text"::"public"."order_status_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."order_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."order_status_enum_old" RENAME TO "order_status_enum"`,
    );
  }
}
