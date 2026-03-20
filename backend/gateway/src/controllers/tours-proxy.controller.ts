import { JwtUserPayload } from '@geo/shared';
import { HttpService } from '@nestjs/axios';
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength
} from 'class-validator';
import { firstValueFrom } from 'rxjs';
import { JwtAuthGuard } from '../security/jwt-auth.guard';
import { Roles } from '../security/roles.decorator';
import { RolesGuard } from '../security/roles.guard';

class CreateTourDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

class JoinByCodeDto {
  @IsString()
  @MinLength(4)
  joinCode!: string;
}

class ChangeTourStateDto {
  @IsString()
  @IsIn(['planned', 'active', 'ended'])
  status!: 'planned' | 'active' | 'ended';
}

class CreateMeetingPointDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @IsOptional()
  @IsString()
  meetupTime?: string;

  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;
}

class UpdateMeetingPointDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @IsOptional()
  @IsString()
  meetupTime?: string;

  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;
}

class CreatePoiDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;
}

class UpdatePoiDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;
}

@Controller('tours')
export class ToursProxyController {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('guide')
  async createTour(
    @Req() req: { user: JwtUserPayload },
    @Body() body: CreateTourDto,
    @Headers('authorization') authorization?: string
  ): Promise<unknown> {
    const baseUrl = this.config.get<string>(
      'TOURS_SERVICE_URL',
      'http://localhost:3002'
    );
    const { data } = await firstValueFrom(
      this.http.post(`${baseUrl}/api/tours`, body, {
        headers: {
          authorization: authorization ?? '',
          'x-user-id': req.user.sub,
          'x-user-role': req.user.role
        }
      })
    );
    return data;
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  async myTours(
    @Req() req: { user: JwtUserPayload },
    @Headers('authorization') authorization?: string
  ): Promise<unknown> {
    const baseUrl = this.config.get<string>(
      'TOURS_SERVICE_URL',
      'http://localhost:3002'
    );
    const { data } = await firstValueFrom(
      this.http.get(`${baseUrl}/api/tours/mine`, {
        headers: {
          authorization: authorization ?? '',
          'x-user-id': req.user.sub,
          'x-user-role': req.user.role
        }
      })
    );
    return data;
  }

  @Post('join')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('tourist')
  async joinTourByCode(
    @Req() req: { user: JwtUserPayload },
    @Body() body: JoinByCodeDto,
    @Headers('authorization') authorization?: string
  ): Promise<unknown> {
    const baseUrl = this.config.get<string>(
      'TOURS_SERVICE_URL',
      'http://localhost:3002'
    );
    const { data } = await firstValueFrom(
      this.http.post(`${baseUrl}/api/tours/join`, body, {
        headers: {
          authorization: authorization ?? '',
          'x-user-id': req.user.sub,
          'x-user-role': req.user.role
        }
      })
    );
    return data;
  }

  @Patch(':tourId/state')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('guide')
  async changeTourState(
    @Req() req: { user: JwtUserPayload },
    @Param('tourId') tourId: string,
    @Body() body: ChangeTourStateDto,
    @Headers('authorization') authorization?: string
  ): Promise<unknown> {
    const baseUrl = this.config.get<string>(
      'TOURS_SERVICE_URL',
      'http://localhost:3002'
    );
    const { data } = await firstValueFrom(
      this.http.patch(`${baseUrl}/api/tours/${tourId}/state`, body, {
        headers: {
          authorization: authorization ?? '',
          'x-user-id': req.user.sub,
          'x-user-role': req.user.role
        }
      })
    );
    return data;
  }

  @Get(':tourId/participants')
  @UseGuards(JwtAuthGuard)
  async participants(
    @Req() req: { user: JwtUserPayload },
    @Param('tourId') tourId: string,
    @Headers('authorization') authorization?: string
  ): Promise<unknown> {
    const baseUrl = this.config.get<string>(
      'TOURS_SERVICE_URL',
      'http://localhost:3002'
    );
    const { data } = await firstValueFrom(
      this.http.get(`${baseUrl}/api/tours/${tourId}/participants`, {
        headers: {
          authorization: authorization ?? '',
          'x-user-id': req.user.sub,
          'x-user-role': req.user.role
        }
      })
    );
    return data;
  }

  @Get(':tourId')
  @UseGuards(JwtAuthGuard)
  async tourInfo(
    @Req() req: { user: JwtUserPayload },
    @Param('tourId') tourId: string,
    @Headers('authorization') authorization?: string
  ): Promise<unknown> {
    const baseUrl = this.config.get<string>(
      'TOURS_SERVICE_URL',
      'http://localhost:3002'
    );
    const { data } = await firstValueFrom(
      this.http.get(`${baseUrl}/api/tours/${tourId}`, {
        headers: {
          authorization: authorization ?? '',
          'x-user-id': req.user.sub,
          'x-user-role': req.user.role
        }
      })
    );
    return data;
  }

  @Get(':tourId/meeting-points')
  @UseGuards(JwtAuthGuard)
  async listMeetingPoints(
    @Req() req: { user: JwtUserPayload },
    @Param('tourId') tourId: string,
    @Headers('authorization') authorization?: string
  ): Promise<unknown> {
    const baseUrl = this.config.get<string>(
      'TOURS_SERVICE_URL',
      'http://localhost:3002'
    );
    const { data } = await firstValueFrom(
      this.http.get(`${baseUrl}/api/tours/${tourId}/meeting-points`, {
        headers: {
          authorization: authorization ?? '',
          'x-user-id': req.user.sub,
          'x-user-role': req.user.role
        }
      })
    );
    return data;
  }

  @Post(':tourId/meeting-points')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('guide')
  async createMeetingPoint(
    @Req() req: { user: JwtUserPayload },
    @Param('tourId') tourId: string,
    @Body() body: CreateMeetingPointDto,
    @Headers('authorization') authorization?: string
  ): Promise<unknown> {
    const baseUrl = this.config.get<string>(
      'TOURS_SERVICE_URL',
      'http://localhost:3002'
    );
    const { data } = await firstValueFrom(
      this.http.post(`${baseUrl}/api/tours/${tourId}/meeting-points`, body, {
        headers: {
          authorization: authorization ?? '',
          'x-user-id': req.user.sub,
          'x-user-role': req.user.role
        }
      })
    );
    return data;
  }

  @Patch(':tourId/meeting-points/:meetingPointId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('guide')
  async updateMeetingPoint(
    @Req() req: { user: JwtUserPayload },
    @Param('tourId') tourId: string,
    @Param('meetingPointId') meetingPointId: string,
    @Body() body: UpdateMeetingPointDto,
    @Headers('authorization') authorization?: string
  ): Promise<unknown> {
    const baseUrl = this.config.get<string>(
      'TOURS_SERVICE_URL',
      'http://localhost:3002'
    );
    const { data } = await firstValueFrom(
      this.http.patch(
        `${baseUrl}/api/tours/${tourId}/meeting-points/${meetingPointId}`,
        body,
        {
          headers: {
            authorization: authorization ?? '',
            'x-user-id': req.user.sub,
            'x-user-role': req.user.role
          }
        }
      )
    );
    return data;
  }

  @Delete(':tourId/meeting-points/:meetingPointId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('guide')
  @HttpCode(HttpStatus.OK)
  async deleteMeetingPoint(
    @Req() req: { user: JwtUserPayload },
    @Param('tourId') tourId: string,
    @Param('meetingPointId') meetingPointId: string,
    @Headers('authorization') authorization?: string
  ): Promise<unknown> {
    const baseUrl = this.config.get<string>(
      'TOURS_SERVICE_URL',
      'http://localhost:3002'
    );
    const { data } = await firstValueFrom(
      this.http.delete(
        `${baseUrl}/api/tours/${tourId}/meeting-points/${meetingPointId}`,
        {
          headers: {
            authorization: authorization ?? '',
            'x-user-id': req.user.sub,
            'x-user-role': req.user.role
          }
        }
      )
    );
    return data;
  }

  @Get(':tourId/pois')
  @UseGuards(JwtAuthGuard)
  async listPois(
    @Req() req: { user: JwtUserPayload },
    @Param('tourId') tourId: string,
    @Headers('authorization') authorization?: string
  ): Promise<unknown> {
    const baseUrl = this.config.get<string>(
      'TOURS_SERVICE_URL',
      'http://localhost:3002'
    );
    const { data } = await firstValueFrom(
      this.http.get(`${baseUrl}/api/tours/${tourId}/pois`, {
        headers: {
          authorization: authorization ?? '',
          'x-user-id': req.user.sub,
          'x-user-role': req.user.role
        }
      })
    );
    return data;
  }

  @Post(':tourId/pois')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('guide')
  async createPoi(
    @Req() req: { user: JwtUserPayload },
    @Param('tourId') tourId: string,
    @Body() body: CreatePoiDto,
    @Headers('authorization') authorization?: string
  ): Promise<unknown> {
    const baseUrl = this.config.get<string>(
      'TOURS_SERVICE_URL',
      'http://localhost:3002'
    );
    const { data } = await firstValueFrom(
      this.http.post(`${baseUrl}/api/tours/${tourId}/pois`, body, {
        headers: {
          authorization: authorization ?? '',
          'x-user-id': req.user.sub,
          'x-user-role': req.user.role
        }
      })
    );
    return data;
  }

  @Patch(':tourId/pois/:poiId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('guide')
  async updatePoi(
    @Req() req: { user: JwtUserPayload },
    @Param('tourId') tourId: string,
    @Param('poiId') poiId: string,
    @Body() body: UpdatePoiDto,
    @Query('clearDescription') clearDescription: string | undefined,
    @Headers('authorization') authorization?: string
  ): Promise<unknown> {
    const baseUrl = this.config.get<string>(
      'TOURS_SERVICE_URL',
      'http://localhost:3002'
    );
    const query = clearDescription === 'true' ? '?clearDescription=true' : '';
    const { data } = await firstValueFrom(
      this.http.patch(`${baseUrl}/api/tours/${tourId}/pois/${poiId}${query}`, body, {
        headers: {
          authorization: authorization ?? '',
          'x-user-id': req.user.sub,
          'x-user-role': req.user.role
        }
      })
    );
    return data;
  }

  @Delete(':tourId/pois/:poiId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('guide')
  @HttpCode(HttpStatus.OK)
  async deletePoi(
    @Req() req: { user: JwtUserPayload },
    @Param('tourId') tourId: string,
    @Param('poiId') poiId: string,
    @Headers('authorization') authorization?: string
  ): Promise<unknown> {
    const baseUrl = this.config.get<string>(
      'TOURS_SERVICE_URL',
      'http://localhost:3002'
    );
    const { data } = await firstValueFrom(
      this.http.delete(`${baseUrl}/api/tours/${tourId}/pois/${poiId}`, {
        headers: {
          authorization: authorization ?? '',
          'x-user-id': req.user.sub,
          'x-user-role': req.user.role
        }
      })
    );
    return data;
  }
}
