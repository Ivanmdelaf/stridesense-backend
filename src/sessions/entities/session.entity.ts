import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { User } from '../../auth/entities/user.entity';

export type Sport = 'running' | 'cycling' | 'swimming' | 'strength' | 'other';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ name: 'duration_minutes', type: 'int' })
  durationMinutes: number;

  @Column({ type: 'varchar' })
  sport: Sport;

  @Column({ name: 'distance_km', type: 'float', nullable: true })
  distanceKm: number | null;

  @Column({ name: 'avg_heart_rate', type: 'int', nullable: true })
  avgHeartRate: number | null;

  @Column({ name: 'cadence_spm', type: 'int', nullable: true })
  cadenceSpm: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ManyToOne(() => User, (user) => user.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  @Exclude()
  user: User;

  @Column({ name: 'user_id' })
  @Exclude()
  userId: string;
}
