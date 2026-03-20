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

@Entity({ name: 'pois' })
export class PoiEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tour_id', type: 'uuid' })
  @Index()
  tourId!: string;

  @Column({ type: 'varchar', length: 120 })
  title!: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  description?: string;

  @Column({ type: 'double precision' })
  lat!: number;

  @Column({ type: 'double precision' })
  lng!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => TourEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tour_id' })
  tour!: TourEntity;
}
