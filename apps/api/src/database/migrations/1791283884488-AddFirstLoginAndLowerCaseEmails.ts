import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Users get the time of their first login, and emails are kept in lower
 * case from now on, so existing ones are lowered too.
 */
export class AddFirstLoginAndLowerCaseEmails1791283884488 implements MigrationInterface {
  name = 'AddFirstLoginAndLowerCaseEmails1791283884488';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "first_login_at" TIMESTAMP WITH TIME ZONE`,
    );
    // Fails on two emails that differ only in case. Merge them by hand first.
    await queryRunner.query(`UPDATE "users" SET "email" = lower("email")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "first_login_at"`);
  }
}
