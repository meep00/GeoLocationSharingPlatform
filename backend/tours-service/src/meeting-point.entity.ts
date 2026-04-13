import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { TourEntity } from './tour.entity';

@Entity({ name: 'meeting_points' })
@Index(['tourId', 'isCurrent'])
export class MeetingPointEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tour_id', type: 'uuid' })
  @Index()
  tourId!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'double precision' })
  lat!: number;

  @Column({ type: 'double precision' })
  lng!: number;

  @Column({ name: 'meetup_time', type: 'varchar', length: 64, nullable: true })
  meetupTime?: string;

  @Column({ name: 'is_current', type: 'boolean', default: false })
  isCurrent!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => TourEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tour_id' })
  tour!: TourEntity;
}
