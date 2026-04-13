import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'guide_last_locations' })
export class GuideLastLocationEntity {
  @PrimaryColumn({ name: 'tour_id', type: 'uuid' })
  tourId!: string;

  @Column({ name: 'guide_id', type: 'uuid' })
  guideId!: string;

  @Column({ type: 'double precision' })
  lat!: number;

  @Column({ type: 'double precision' })
  lng!: number;

  @Column({ name: 'sent_at', type: 'timestamp with time zone' })
  sentAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
