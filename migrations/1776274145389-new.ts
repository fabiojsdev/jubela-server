import { MigrationInterface, QueryRunner } from "typeorm";

export class New1776274145389 implements MigrationInterface {
    name = 'New1776274145389'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "items" ADD "description" character varying(255) NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "items" DROP COLUMN "description"`);
    }

}
