import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { TourParticipantEntity } from './tour-participant.entity';

export type TourStatus = 'planned' | 'active' | 'ended';

@Entity({ name: 'tours' })
export class TourEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description?: string;

  @Column({ name: 'guide_id', type: 'uuid' })
  @Index()
  guideId!: string;

  @Column({ name: 'join_code', type: 'varchar', length: 12, unique: true })
  @Index()
  joinCode!: string;

  @Column({ type: 'varchar', length: 20, default: 'planned' })
  status!: TourStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => TourParticipantEntity, (participant) => participant.tour)
  participants!: TourParticipantEntity[];
}
