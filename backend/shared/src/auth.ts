export type UserRole = 'guide' | 'tourist';

export interface JwtUserPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export interface AuthUserDto {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthTokenDto {
  accessToken: string;
  user: AuthUserDto;
}
