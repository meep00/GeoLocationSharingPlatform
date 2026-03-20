import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query
} from '@nestjs/common';
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
import { ToursService } from './tours.service';
import { TourStatus } from './tour.entity';

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
  status!: TourStatus;
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
export class ToursController {
  constructor(private readonly toursService: ToursService) {}

  @Post()
  async create(
    @Body() dto: CreateTourDto,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-role') role?: string
  ): Promise<unknown> {
    if (role !== 'guide') {
      throw new ForbiddenException('Only guide can create tour');
    }
    if (!userId) {
      throw new ForbiddenException('Missing user context');
    }
    return this.toursService.create({
      name: dto.name,
      description: dto.description,
      guideId: userId
    });
  }

  @Get('mine')
  async mine(
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-role') role?: string
  ): Promise<unknown[]> {
    if (!userId || !role) {
      return [];
    }
    return this.toursService.findByUser({
      userId,
      role: role === 'guide' ? 'guide' : 'tourist'
    });
  }

  @Post('join')
  async joinByCode(
    @Body() dto: JoinByCodeDto,
    @Headers('x-user-id') userId?: string
  ): Promise<unknown> {
    if (!userId) {
      throw new ForbiddenException('Missing user context');
    }
    return this.toursService.joinByCode({
      joinCode: dto.joinCode,
      userId
    });
  }

  @Patch(':tourId/state')
  async changeState(
    @Param('tourId') tourId: string,
    @Body() dto: ChangeTourStateDto,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-role') role?: string
  ): Promise<unknown> {
    if (!tourId) {
      throw new BadRequestException('Tour id is required');
    }
    if (!userId) {
      throw new ForbiddenException('Missing user context');
    }
    if (role !== 'guide') {
      throw new ForbiddenException('Only guide can change tour state');
    }
    return this.toursService.changeState({
      tourId,
      status: dto.status,
      userId
    });
  }

  @Get(':tourId')
  async getTourInfo(
    @Param('tourId') tourId: string,
    @Headers('x-user-id') userId?: string
  ): Promise<unknown> {
    if (!tourId) {
      throw new BadRequestException('Tour id is required');
    }
    if (!userId) {
      throw new ForbiddenException('Missing user context');
    }
    return this.toursService.getTourInfo({ tourId, userId });
  }

  @Get(':tourId/participants')
  async getParticipants(
    @Param('tourId') tourId: string,
    @Headers('x-user-id') userId?: string
  ): Promise<unknown> {
    if (!tourId) {
      throw new BadRequestException('Tour id is required');
    }
    if (!userId) {
      throw new ForbiddenException('Missing user context');
    }
    return this.toursService.getParticipants({ tourId, userId });
  }

  @Get(':tourId/meeting-points')
  async listMeetingPoints(
    @Param('tourId') tourId: string,
    @Headers('x-user-id') userId?: string
  ): Promise<unknown> {
    if (!tourId) {
      throw new BadRequestException('Tour id is required');
    }
    if (!userId) {
      throw new ForbiddenException('Missing user context');
    }
    return this.toursService.listMeetingPoints({ tourId, userId });
  }

  @Post(':tourId/meeting-points')
  async createMeetingPoint(
    @Param('tourId') tourId: string,
    @Body() dto: CreateMeetingPointDto,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-role') role?: string
  ): Promise<unknown> {
    if (!tourId) {
      throw new BadRequestException('Tour id is required');
    }
    if (!userId) {
      throw new ForbiddenException('Missing user context');
    }
    if (role !== 'guide') {
      throw new ForbiddenException('Only guide can manage meeting points');
    }
    return this.toursService.createMeetingPoint({
      tourId,
      userId,
      name: dto.name,
      lat: dto.lat,
      lng: dto.lng,
      meetupTime: this.parseOptionalDate(dto.meetupTime),
      isCurrent: dto.isCurrent
    });
  }

  @Patch(':tourId/meeting-points/:meetingPointId')
  async updateMeetingPoint(
    @Param('tourId') tourId: string,
    @Param('meetingPointId') meetingPointId: string,
    @Body() dto: UpdateMeetingPointDto,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-role') role?: string
  ): Promise<unknown> {
    if (!tourId || !meetingPointId) {
      throw new BadRequestException('Tour id and meeting point id are required');
    }
    if (!userId) {
      throw new ForbiddenException('Missing user context');
    }
    if (role !== 'guide') {
      throw new ForbiddenException('Only guide can manage meeting points');
    }
    return this.toursService.updateMeetingPoint({
      tourId,
      meetingPointId,
      userId,
      name: dto.name,
      lat: dto.lat,
      lng: dto.lng,
      meetupTime: this.parseOptionalDate(dto.meetupTime),
      isCurrent: dto.isCurrent
    });
  }

  @Delete(':tourId/meeting-points/:meetingPointId')
  @HttpCode(HttpStatus.OK)
  async deleteMeetingPoint(
    @Param('tourId') tourId: string,
    @Param('meetingPointId') meetingPointId: string,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-role') role?: string
  ): Promise<unknown> {
    if (!tourId || !meetingPointId) {
      throw new BadRequestException('Tour id and meeting point id are required');
    }
    if (!userId) {
      throw new ForbiddenException('Missing user context');
    }
    if (role !== 'guide') {
      throw new ForbiddenException('Only guide can manage meeting points');
    }
    return this.toursService.deleteMeetingPoint({ tourId, meetingPointId, userId });
  }

  @Get(':tourId/pois')
  async listPois(
    @Param('tourId') tourId: string,
    @Headers('x-user-id') userId?: string
  ): Promise<unknown> {
    if (!tourId) {
      throw new BadRequestException('Tour id is required');
    }
    if (!userId) {
      throw new ForbiddenException('Missing user context');
    }
    return this.toursService.listPois({ tourId, userId });
  }

  @Post(':tourId/pois')
  async createPoi(
    @Param('tourId') tourId: string,
    @Body() dto: CreatePoiDto,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-role') role?: string
  ): Promise<unknown> {
    if (!tourId) {
      throw new BadRequestException('Tour id is required');
    }
    if (!userId) {
      throw new ForbiddenException('Missing user context');
    }
    if (role !== 'guide') {
      throw new ForbiddenException('Only guide can manage POI');
    }
    return this.toursService.createPoi({
      tourId,
      userId,
      title: dto.title,
      description: dto.description,
      lat: dto.lat,
      lng: dto.lng
    });
  }

  @Patch(':tourId/pois/:poiId')
  async updatePoi(
    @Param('tourId') tourId: string,
    @Param('poiId') poiId: string,
    @Body() dto: UpdatePoiDto,
    @Query('clearDescription') clearDescription?: string,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-role') role?: string
  ): Promise<unknown> {
    if (!tourId || !poiId) {
      throw new BadRequestException('Tour id and poi id are required');
    }
    if (!userId) {
      throw new ForbiddenException('Missing user context');
    }
    if (role !== 'guide') {
      throw new ForbiddenException('Only guide can manage POI');
    }
    return this.toursService.updatePoi({
      tourId,
      poiId,
      userId,
      title: dto.title,
      description: clearDescription === 'true' ? null : dto.description,
      lat: dto.lat,
      lng: dto.lng
    });
  }

  @Delete(':tourId/pois/:poiId')
  @HttpCode(HttpStatus.OK)
  async deletePoi(
    @Param('tourId') tourId: string,
    @Param('poiId') poiId: string,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-role') role?: string
  ): Promise<unknown> {
    if (!tourId || !poiId) {
      throw new BadRequestException('Tour id and poi id are required');
    }
    if (!userId) {
      throw new ForbiddenException('Missing user context');
    }
    if (role !== 'guide') {
      throw new ForbiddenException('Only guide can manage POI');
    }
    return this.toursService.deletePoi({ tourId, poiId, userId });
  }

  private parseOptionalDate(value?: string): Date | undefined {
    if (value === undefined) {
      return undefined;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid meetupTime date format');
    }
    return date;
  }
}
