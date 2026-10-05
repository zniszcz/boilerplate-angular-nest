import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Refresh tokens belong to the authentication domain, which knows users
 * only by id, so the foreign key to users goes. See ADR 0015.
 */
export class SeparateAuthenticationFromUsers1791234545294 implements MigrationInterface {
  name = 'SeparateAuthenticationFromUsers1791234545294';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ALTER COLUMN "id" DROP DEFAULT`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3ddc983c5f7bcf132fd8732c3f" ON "refresh_tokens"  ("user_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3ddc983c5f7bcf132fd8732c3f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()`,
    );
    // Tokens of deleted users would break the restored foreign key.
    await queryRunner.query(
      `DELETE FROM "refresh_tokens" WHERE "user_id" NOT IN (SELECT "id" FROM "users")`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
