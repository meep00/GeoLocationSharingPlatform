import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique
} from 'typeorm';
import { TourEntity } from './tour.entity';

@Entity({ name: 'tour_participants' })
@Unique(['tourId', 'userId'])
export class TourParticipantEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tour_id', type: 'uuid' })
  @Index()
  tourId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId!: string;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt!: Date;

  @ManyToOne(() => TourEntity, (tour) => tour.participants, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'tour_id' })
  tour!: TourEntity;
}
