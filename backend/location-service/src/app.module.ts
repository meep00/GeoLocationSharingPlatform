import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { LocationGateway } from './location.gateway';

@Module({
  controllers: [HealthController],
  providers: [LocationGateway]
})
export class AppModule {}
