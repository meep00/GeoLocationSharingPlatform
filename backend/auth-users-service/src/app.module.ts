import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { resolve } from 'path';
import { HealthController } from './health.controller';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { UserEntity } from './users/user.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Workspace scripts may start this service from backend/auth-users-service,
      // so include both local and monorepo root .env files.
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
          entities: [UserEntity],
          synchronize: true,
          ssl: postgresSsl ? { rejectUnauthorized: false } : false
        };
      }
    }),
    TypeOrmModule.forFeature([UserEntity]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'super-secret-change-me'),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN', '1d')
        }
      })
    })
  ],
  controllers: [HealthController, AuthController],
  providers: [AuthService]
})
export class AppModule {}
