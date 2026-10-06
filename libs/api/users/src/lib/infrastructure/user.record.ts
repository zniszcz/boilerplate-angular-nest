import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PermissionRecord } from './permission.record';

/** The `users` table. Mapped to the User aggregate by the repository. */
@Entity('users')
export class UserRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  /** Never loaded unless a query asks for it with addSelect. */
  @Column({ name: 'password_hash', select: false })
  passwordHash!: string;

  @ManyToMany(() => PermissionRecord)
  @JoinTable({
    name: 'user_permissions',
    joinColumn: { name: 'user_id' },
    inverseJoinColumn: { name: 'permission_code' },
  })
  permissions!: PermissionRecord[];

  /** Null until the user logs in for the first time. */
  @Column({ name: 'first_login_at', type: 'timestamptz', nullable: true })
  firstLoginAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
