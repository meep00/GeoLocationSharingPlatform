import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { resolve } from 'path';
import { GuideLastLocationEntity } from './guide-last-location.entity';
import { HealthController } from './health.controller';
import { MeetingPointEntity } from './meeting-point.entity';
import { PoiEntity } from './poi.entity';
import { ToursController } from './tours.controller';
import { TourEntity } from './tour.entity';
import { TourParticipantEntity } from './tour-participant.entity';
import { ToursService } from './tours.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')]
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const postgresSsl =
          config.get<string>('POSTGRES_SSL', 'false') === 'true';

        return {
          type: 'postgres' as const,
          host: config.get<string>('POSTGRES_HOST', 'postgres'),
          port: Number(config.get<string>('POSTGRES_PORT', '5432')),
          username: config.get<string>('POSTGRES_USER', 'postgres'),
          password: config.get<string>('POSTGRES_PASSWORD', 'postgres'),
          database: config.get<string>('POSTGRES_DB', 'geoplatform'),
          entities: [TourEntity, TourParticipantEntity, MeetingPointEntity, PoiEntity, GuideLastLocationEntity],
          synchronize: true,
          ssl: postgresSsl ? { rejectUnauthorized: false } : false
        };
      }
    }),
    TypeOrmModule.forFeature([
      TourEntity,
      TourParticipantEntity,
      MeetingPointEntity,
      PoiEntity,
      GuideLastLocationEntity
    ])
  ],
  controllers: [HealthController, ToursController],
  providers: [ToursService]
})
export class AppModule {}
