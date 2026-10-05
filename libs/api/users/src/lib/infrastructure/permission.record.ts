import { Column, Entity, PrimaryColumn } from 'typeorm';

/** The `permissions` table. */
@Entity('permissions')
export class PermissionRecord {
  /** For example `users:read`. */
  @PrimaryColumn()
  code!: string;

  @Column()
  description!: string;
}
