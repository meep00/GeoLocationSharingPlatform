import { AuthTokenDto, JwtUserPayload, UserRole } from '@geo/shared';
import {
  ConflictException,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcryptjs';
import { Repository } from 'typeorm';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UserEntity } from '../users/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    private readonly jwtService: JwtService
  ) {}

  async register(data: RegisterDto): Promise<AuthTokenDto> {
    const existingUser = await this.usersRepository.findOne({
      where: { email: data.email.toLowerCase() }
    });

    if (existingUser) {
      throw new ConflictException('Email is already in use');
    }

    const passwordHash = await hash(data.password, 10);
    const user = this.usersRepository.create({
      email: data.email.toLowerCase(),
      passwordHash,
      role: data.role ?? 'tourist'
    });

    const saved = await this.usersRepository.save(user);
    return this.issueToken(saved.id, saved.email, saved.role);
  }

  async login(data: LoginDto): Promise<AuthTokenDto> {
    const user = await this.usersRepository.findOne({
      where: { email: data.email.toLowerCase() }
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const validPassword = await compare(data.password, user.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueToken(user.id, user.email, user.role);
  }

  private issueToken(id: string, email: string, role: UserRole): AuthTokenDto {
    const payload: JwtUserPayload = {
      sub: id,
      email,
      role
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id,
        email,
        role
      }
    };
  }
}
