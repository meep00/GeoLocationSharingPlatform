import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { HealthController } from './health.controller';
import { AuthProxyController } from './controllers/auth-proxy.controller';
import { ToursProxyController } from './controllers/tours-proxy.controller';
import { JwtStrategy } from './security/jwt.strategy';
import { RolesGuard } from './security/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    HttpModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'super-secret-change-me')
      })
    })
  ],
  controllers: [HealthController, AuthProxyController, ToursProxyController],
  providers: [JwtStrategy, RolesGuard]
})
export class AppModule {}
