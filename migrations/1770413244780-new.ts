import { MigrationInterface, QueryRunner } from "typeorm";

export class New1770413244780 implements MigrationInterface {
    name = 'New1770413244780'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "product_images" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "url" character varying(120) NOT NULL, "publicId" character varying(120) NOT NULL, "isMain" boolean NOT NULL DEFAULT false, "order" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "productId" uuid, CONSTRAINT "PK_1974264ea7265989af8392f63a1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "images"`);
        await queryRunner.query(`ALTER TABLE "product_images" ADD CONSTRAINT "FK_b367708bf720c8dd62fc6833161" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "product_images" DROP CONSTRAINT "FK_b367708bf720c8dd62fc6833161"`);
        await queryRunner.query(`ALTER TABLE "product" ADD "images" character varying array`);
        await queryRunner.query(`DROP TABLE "product_images"`);
    }

}
