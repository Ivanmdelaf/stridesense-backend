import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Session } from '../../sessions/entities/session.entity';

export type RoleType = 'athlete' | 'coach' | 'admin';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  password: string;

  @Column({ type: 'varchar', default: 'athlete' })
  role: RoleType;

  @Column({ name: 'avatar_url', nullable: true, type: 'varchar' })
  avatarUrl: string | null;

  @OneToMany(() => Session, (session) => session.user)
  sessions: Session[];

  @CreateDateColumn({ name: 'created_at' })
  @Exclude()
  createdAt: Date;
}
