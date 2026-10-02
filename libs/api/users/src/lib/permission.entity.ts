import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('permissions')
export class Permission {
  /** For example `users:read`. */
  @PrimaryColumn()
  code!: string;

  @Column()
  description!: string;
}
