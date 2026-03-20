import { AuthTokenDto, JwtUserPayload } from '@geo/shared';
import { HttpService } from '@nestjs/axios';
import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { JwtAuthGuard } from '../security/jwt-auth.guard';

interface LoginDto {
  email: string;
  password: string;
}

interface RegisterDto extends LoginDto {
  role?: 'guide' | 'tourist';
}

@Controller('auth')
export class AuthProxyController {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService
  ) {}

  @Post('register')
  async register(@Body() body: RegisterDto): Promise<AuthTokenDto> {
    const baseUrl = this.config.get<string>(
      'AUTH_SERVICE_URL',
      'http://localhost:3001'
    );
    const { data } = await firstValueFrom(
      this.http.post<AuthTokenDto>(`${baseUrl}/api/auth/register`, body)
    );
    return data;
  }

  @Post('login')
  async login(@Body() body: LoginDto): Promise<AuthTokenDto> {
    const baseUrl = this.config.get<string>(
      'AUTH_SERVICE_URL',
      'http://localhost:3001'
    );
    const { data } = await firstValueFrom(
      this.http.post<AuthTokenDto>(`${baseUrl}/api/auth/login`, body)
    );
    return data;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: { user: JwtUserPayload }): JwtUserPayload {
    return req.user;
  }
}
