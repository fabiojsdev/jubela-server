import { MigrationInterface, QueryRunner } from 'typeorm';

export class New1765331980312 implements MigrationInterface {
  name = 'New1765331980312';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "refresh_token_employee" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "token_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_valid" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "employeeId" uuid, CONSTRAINT "PK_81169f84cbace9eb6fff3256202" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."employee_role_enum" AS ENUM('admin', 'ler-produtos', 'editar-produtos', 'editar-precos', 'ler-pedidos', 'user')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."employee_situation_enum" AS ENUM('empregado', 'demitido')`,
    );
    await queryRunner.query(
      `CREATE TABLE "employee" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "cpf" character varying(14) NOT NULL, "email" character varying(50) NOT NULL, "name" character varying(125) NOT NULL, "password_hash" character varying(255) NOT NULL, "role" "public"."employee_role_enum" array NOT NULL, "situation" "public"."employee_situation_enum" NOT NULL DEFAULT 'empregado', "phone_number" character varying(15) NOT NULL, "address" character varying(100) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_cc5bc3cbcb7312fbc898749c5bc" UNIQUE ("cpf"), CONSTRAINT "UQ_817d1d427138772d47eca048855" UNIQUE ("email"), CONSTRAINT "PK_3c2bc72f03fd5abbbc5ac169498" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "product" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "category" character varying(60) NOT NULL, "description" character varying(255) NOT NULL, "price" numeric(10,2) NOT NULL, "images" character varying array NOT NULL, "quantity" integer NOT NULL, "sku" character varying(255) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "employeeId" uuid, CONSTRAINT "PK_bebc9158e480b949565b4dc7a82" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "product_name" character varying(150) NOT NULL, "quantity" integer NOT NULL, "price" numeric(10,2) NOT NULL, "orderId" uuid, "productId" uuid, CONSTRAINT "PK_ba5885359424c15ca6b9e79bcf6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."order_status_enum" AS ENUM('Cancelado', 'Aprovado', 'Aguardando pagamento', 'Rejeitado', 'Pagamento em análise', 'Separado', 'Embalado', 'Em transporte', 'Saiu para entrega', 'Entregue', 'Aguardando retirada', 'Devolvido', 'Extraviado', 'Em analise')`,
    );
    await queryRunner.query(
      `CREATE TABLE "order" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "total_price" numeric(10,2) NOT NULL, "description" character varying(255) NOT NULL, "status" "public"."order_status_enum" NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "PK_1031171c13130102495201e3e20" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "refresh_token_user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "token_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_valid" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "PK_6bbe63d2fe75e7f0ba1710351d4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(50) NOT NULL, "name" character varying(125) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "log_user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(50) NOT NULL, "name" character varying(125) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "UQ_3202ebc28ae6901df4192b4e336" UNIQUE ("email"), CONSTRAINT "PK_0d5473a41a198fd20e7920889b0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "log_employee" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(50) NOT NULL, "name" character varying(125) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "employeeId" uuid, CONSTRAINT "PK_7d61e44b0c92794c16325c8f07c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "jwt_blacklist" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(50) NOT NULL, "token" character varying(255) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_115e9ec74f8243b396da68a2eea" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`ALTER TABLE "employee" DROP COLUMN "role"`);
    await queryRunner.query(
      `ALTER TABLE "employee" ADD "role" "public"."employee_role_enum" NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "employee" ALTER COLUMN "situation" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_token_employee" ADD CONSTRAINT "FK_80be477e3ea9be2d92cc12ee993" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product" ADD CONSTRAINT "FK_c72519111a22951e993f7ecfb27" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "items" ADD CONSTRAINT "FK_9e039229fb4b5a379ab79e887ad" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "items" ADD CONSTRAINT "FK_4be3a424b9afbf6445222f89018" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order" ADD CONSTRAINT "FK_caabe91507b3379c7ba73637b84" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_token_user" ADD CONSTRAINT "FK_b57f15fa07da87bdd715f6cd8a4" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "log_user" ADD CONSTRAINT "FK_1eb9be53afe77959ab29166e31d" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "log_employee" ADD CONSTRAINT "FK_e155820666b446a09f80da90a0f" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "log_employee" DROP CONSTRAINT "FK_e155820666b446a09f80da90a0f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "log_user" DROP CONSTRAINT "FK_1eb9be53afe77959ab29166e31d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_token_user" DROP CONSTRAINT "FK_b57f15fa07da87bdd715f6cd8a4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order" DROP CONSTRAINT "FK_caabe91507b3379c7ba73637b84"`,
    );
    await queryRunner.query(
      `ALTER TABLE "items" DROP CONSTRAINT "FK_4be3a424b9afbf6445222f89018"`,
    );
    await queryRunner.query(
      `ALTER TABLE "items" DROP CONSTRAINT "FK_9e039229fb4b5a379ab79e887ad"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product" DROP CONSTRAINT "FK_c72519111a22951e993f7ecfb27"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_token_employee" DROP CONSTRAINT "FK_80be477e3ea9be2d92cc12ee993"`,
    );
    await queryRunner.query(
      `ALTER TABLE "employee" ALTER COLUMN "situation" SET DEFAULT 'empregado'`,
    );
    await queryRunner.query(`ALTER TABLE "employee" DROP COLUMN "role"`);
    await queryRunner.query(`DROP TYPE "public"."employee_role_enum"`);
    await queryRunner.query(
      `ALTER TABLE "employee" ADD "role" "public"."employee_role_enum" array NOT NULL`,
    );
    await queryRunner.query(`DROP TABLE "jwt_blacklist"`);
    await queryRunner.query(`DROP TABLE "log_employee"`);
    await queryRunner.query(`DROP TABLE "log_user"`);
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`DROP TABLE "refresh_token_user"`);
    await queryRunner.query(`DROP TABLE "order"`);
    await queryRunner.query(`DROP TYPE "public"."order_status_enum"`);
    await queryRunner.query(`DROP TABLE "items"`);
    await queryRunner.query(`DROP TABLE "product"`);
    await queryRunner.query(`DROP TABLE "employee"`);
    await queryRunner.query(`DROP TYPE "public"."employee_situation_enum"`);
    await queryRunner.query(`DROP TYPE "public"."employee_role_enum"`);
    await queryRunner.query(`DROP TABLE "refresh_token_employee"`);
  }
}
