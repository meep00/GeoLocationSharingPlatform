import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { DataSource, In, Repository } from 'typeorm';
import { GuideLastLocationEntity } from './guide-last-location.entity';
import { MeetingPointEntity } from './meeting-point.entity';
import { PoiEntity } from './poi.entity';
import { TourParticipantEntity } from './tour-participant.entity';
import { TourEntity, TourStatus } from './tour.entity';

type UserRole = 'guide' | 'tourist';

interface CreateTourInput {
  name: string;
  description?: string;
  guideId: string;
}

interface FindToursByUserInput {
  userId: string;
  role: UserRole;
}

interface JoinByCodeInput {
  joinCode: string;
  userId: string;
}

interface ChangeTourStateInput {
  tourId: string;
  status: TourStatus;
  userId: string;
}

interface GetTourInfoInput {
  tourId: string;
  userId: string;
}

interface CreateMeetingPointInput {
  tourId: string;
  userId: string;
  name: string;
  lat: number;
  lng: number;
  meetupTime?: string;
  isCurrent?: boolean;
}

interface UpdateMeetingPointInput {
  tourId: string;
  meetingPointId: string;
  userId: string;
  name?: string;
  lat?: number;
  lng?: number;
  meetupTime?: string | null;
  isCurrent?: boolean;
}

interface DeleteMeetingPointInput {
  tourId: string;
  meetingPointId: string;
  userId: string;
}

interface ListMeetingPointsInput {
  tourId: string;
  userId: string;
}

interface CreatePoiInput {
  tourId: string;
  userId: string;
  title: string;
  description?: string;
  lat: number;
  lng: number;
}

interface UpdatePoiInput {
  tourId: string;
  poiId: string;
  userId: string;
  title?: string;
  description?: string | null;
  lat?: number;
  lng?: number;
}

interface DeletePoiInput {
  tourId: string;
  poiId: string;
  userId: string;
}

interface TourResponse {
  id: string;
  name: string;
  description?: string;
  guideId: string;
  joinCode: string;
  status: TourStatus;
  createdAt: Date;
  updatedAt: Date;
}

interface TourParticipantResponse {
  userId: string;
  joinedAt: Date;
}

interface TourInfoResponse extends TourResponse {
  participants: TourParticipantResponse[];
  currentMeetingPoint?: MeetingPointResponse;
  meetingPoints: MeetingPointResponse[];
  pois: PoiResponse[];
}

interface MeetingPointResponse {
  id: string;
  tourId: string;
  name: string;
  lat: number;
  lng: number;
  meetupTime?: string;
  isCurrent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface PoiResponse {
  id: string;
  tourId: string;
  title: string;
  description?: string;
  lat: number;
  lng: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ToursService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(TourEntity)
    private readonly toursRepository: Repository<TourEntity>,
    @InjectRepository(TourParticipantEntity)
    private readonly participantsRepository: Repository<TourParticipantEntity>,
    @InjectRepository(MeetingPointEntity)
    private readonly meetingPointsRepository: Repository<MeetingPointEntity>,
    @InjectRepository(PoiEntity)
    private readonly poisRepository: Repository<PoiEntity>,
    @InjectRepository(GuideLastLocationEntity)
    private readonly guideLocationRepository: Repository<GuideLastLocationEntity>
  ) {}

  async create(input: CreateTourInput): Promise<TourResponse> {
    const joinCode = await this.generateUniqueJoinCode();
    const createdTour = this.toursRepository.create({
      name: input.name,
      description: input.description?.trim() || undefined,
      guideId: input.guideId,
      joinCode,
      status: 'planned'
    });
    const savedTour = await this.toursRepository.save(createdTour);
    return this.toTourResponse(savedTour);
  }

  async findByUser(input: FindToursByUserInput): Promise<TourResponse[]> {
    if (input.role === 'guide') {
      const guidedTours = await this.toursRepository.find({
        where: { guideId: input.userId },
        order: { createdAt: 'DESC' }
      });
      return guidedTours.map((tour) => this.toTourResponse(tour));
    }

    const participantRows = await this.participantsRepository.find({
      where: { userId: input.userId },
      order: { joinedAt: 'DESC' }
    });
    if (participantRows.length === 0) {
      return [];
    }

    const tours = await this.toursRepository.find({
      where: { id: In(participantRows.map((row) => row.tourId)) }
    });
    const toursById = new Map(tours.map((tour) => [tour.id, tour]));
    return participantRows
      .map((row) => toursById.get(row.tourId))
      .filter((tour): tour is TourEntity => Boolean(tour))
      .map((tour) => this.toTourResponse(tour));
  }

  async joinByCode(input: JoinByCodeInput): Promise<TourInfoResponse> {
    const normalizedCode = input.joinCode.trim().toUpperCase();
    if (!normalizedCode) {
      throw new BadRequestException('Join code is required');
    }

    const tour = await this.toursRepository.findOne({
      where: { joinCode: normalizedCode }
    });
    if (!tour) {
      throw new NotFoundException('Tour not found for provided code');
    }
    if (tour.status === 'ended') {
      throw new BadRequestException('Tour already ended');
    }
    if (tour.guideId === input.userId) {
      throw new ConflictException('Guide cannot join own tour as participant');
    }

    const existingParticipant = await this.participantsRepository.findOne({
      where: { tourId: tour.id, userId: input.userId }
    });
    if (existingParticipant) {
      throw new ConflictException('User already joined this tour');
    }

    const participant = this.participantsRepository.create({
      tourId: tour.id,
      userId: input.userId
    });
    await this.participantsRepository.save(participant);

    return this.getTourInfo({ tourId: tour.id, userId: input.userId });
  }

  async changeState(input: ChangeTourStateInput): Promise<TourResponse> {
    const tour = await this.toursRepository.findOne({ where: { id: input.tourId } });
    if (!tour) {
      throw new NotFoundException('Tour not found');
    }
    if (tour.guideId !== input.userId) {
      throw new ForbiddenException('Only assigned guide can change tour state');
    }
    tour.status = input.status;
    const updatedTour = await this.toursRepository.save(tour);
    return this.toTourResponse(updatedTour);
  }

  async getTourInfo(input: GetTourInfoInput): Promise<TourInfoResponse> {
    const tour = await this.toursRepository.findOne({ where: { id: input.tourId } });
    if (!tour) {
      throw new NotFoundException('Tour not found');
    }

    if (tour.guideId !== input.userId) {
      const participant = await this.participantsRepository.findOne({
        where: { tourId: tour.id, userId: input.userId }
      });
      if (!participant) {
        throw new ForbiddenException('Tour access denied');
      }
    }

    const participants = await this.participantsRepository.find({
      where: { tourId: tour.id },
      order: { joinedAt: 'ASC' }
    });
    const [meetingPoints, pois] = await Promise.all([
      this.meetingPointsRepository.find({
        where: { tourId: tour.id },
        order: { createdAt: 'ASC' }
      }),
      this.poisRepository.find({
        where: { tourId: tour.id },
        order: { createdAt: 'ASC' }
      })
    ]);
    const meetingPointResponses = meetingPoints.map((meetingPoint) =>
      this.toMeetingPointResponse(meetingPoint)
    );
    return {
      ...this.toTourResponse(tour),
      participants: participants.map((participant) => ({
        userId: participant.userId,
        joinedAt: participant.joinedAt
      })),
      currentMeetingPoint: meetingPointResponses.find((meetingPoint) => meetingPoint.isCurrent),
      meetingPoints: meetingPointResponses,
      pois: pois.map((poi) => this.toPoiResponse(poi))
    };
  }

  async getParticipants(input: GetTourInfoInput): Promise<TourParticipantResponse[]> {
    const tourInfo = await this.getTourInfo(input);
    return tourInfo.participants;
  }

  async listMeetingPoints(input: ListMeetingPointsInput): Promise<MeetingPointResponse[]> {
    await this.ensureTourAccessibleByUser(input.tourId, input.userId);
    const meetingPoints = await this.meetingPointsRepository.find({
      where: { tourId: input.tourId },
      order: { createdAt: 'ASC' }
    });
    return meetingPoints.map((meetingPoint) => this.toMeetingPointResponse(meetingPoint));
  }

  async createMeetingPoint(input: CreateMeetingPointInput): Promise<MeetingPointResponse> {
    await this.ensureGuideAssignedToTour(input.tourId, input.userId);
    const shouldBeCurrent = input.isCurrent ?? false;

    return this.dataSource.transaction(async (manager) => {
      if (shouldBeCurrent) {
        await manager
          .getRepository(MeetingPointEntity)
          .createQueryBuilder()
          .update(MeetingPointEntity)
          .set({ isCurrent: false })
          .where('tour_id = :tourId', { tourId: input.tourId })
          .execute();
      }

      const meetingPoint = manager.getRepository(MeetingPointEntity).create({
        tourId: input.tourId,
        name: input.name.trim(),
        lat: input.lat,
        lng: input.lng,
        meetupTime: input.meetupTime,
        isCurrent: shouldBeCurrent
      });
      const savedMeetingPoint = await manager.getRepository(MeetingPointEntity).save(meetingPoint);
      return this.toMeetingPointResponse(savedMeetingPoint);
    });
  }

  async updateMeetingPoint(input: UpdateMeetingPointInput): Promise<MeetingPointResponse> {
    await this.ensureGuideAssignedToTour(input.tourId, input.userId);
    const meetingPoint = await this.meetingPointsRepository.findOne({
      where: { id: input.meetingPointId, tourId: input.tourId }
    });
    if (!meetingPoint) {
      throw new NotFoundException('Meeting point not found');
    }

    return this.dataSource.transaction(async (manager) => {
      if (input.name !== undefined) {
        meetingPoint.name = input.name.trim();
      }
      if (input.lat !== undefined) {
        meetingPoint.lat = input.lat;
      }
      if (input.lng !== undefined) {
        meetingPoint.lng = input.lng;
      }
      if (input.meetupTime !== undefined) {
        meetingPoint.meetupTime = input.meetupTime || undefined;
      }
      if (input.isCurrent !== undefined) {
        if (input.isCurrent) {
          await manager
            .getRepository(MeetingPointEntity)
            .createQueryBuilder()
            .update(MeetingPointEntity)
            .set({ isCurrent: false })
            .where('tour_id = :tourId', { tourId: input.tourId })
            .execute();
        }
        meetingPoint.isCurrent = input.isCurrent;
      }

      const savedMeetingPoint = await manager.getRepository(MeetingPointEntity).save(meetingPoint);
      return this.toMeetingPointResponse(savedMeetingPoint);
    });
  }

  async deleteMeetingPoint(input: DeleteMeetingPointInput): Promise<{ deleted: true }> {
    await this.ensureGuideAssignedToTour(input.tourId, input.userId);
    const meetingPoint = await this.meetingPointsRepository.findOne({
      where: { id: input.meetingPointId, tourId: input.tourId }
    });
    if (!meetingPoint) {
      throw new NotFoundException('Meeting point not found');
    }
    const wasCurrent = meetingPoint.isCurrent;
    await this.meetingPointsRepository.delete({ id: input.meetingPointId });

    if (wasCurrent) {
      const latest = await this.meetingPointsRepository.findOne({
        where: { tourId: input.tourId },
        order: { createdAt: 'DESC' }
      });
      if (latest) {
        latest.isCurrent = true;
        await this.meetingPointsRepository.save(latest);
      }
    }

    return { deleted: true };
  }

  async listPois(input: ListMeetingPointsInput): Promise<PoiResponse[]> {
    await this.ensureTourAccessibleByUser(input.tourId, input.userId);
    const pois = await this.poisRepository.find({
      where: { tourId: input.tourId },
      order: { createdAt: 'ASC' }
    });
    return pois.map((poi) => this.toPoiResponse(poi));
  }

  async createPoi(input: CreatePoiInput): Promise<PoiResponse> {
    await this.ensureGuideAssignedToTour(input.tourId, input.userId);
    const poi = this.poisRepository.create({
      tourId: input.tourId,
      title: input.title.trim(),
      description: input.description?.trim() || undefined,
      lat: input.lat,
      lng: input.lng
    });
    const savedPoi = await this.poisRepository.save(poi);
    return this.toPoiResponse(savedPoi);
  }

  async updatePoi(input: UpdatePoiInput): Promise<PoiResponse> {
    await this.ensureGuideAssignedToTour(input.tourId, input.userId);
    const poi = await this.poisRepository.findOne({
      where: { id: input.poiId, tourId: input.tourId }
    });
    if (!poi) {
      throw new NotFoundException('POI not found');
    }

    if (input.title !== undefined) {
      poi.title = input.title.trim();
    }
    if (input.description !== undefined) {
      poi.description = input.description?.trim() || undefined;
    }
    if (input.lat !== undefined) {
      poi.lat = input.lat;
    }
    if (input.lng !== undefined) {
      poi.lng = input.lng;
    }

    const savedPoi = await this.poisRepository.save(poi);
    return this.toPoiResponse(savedPoi);
  }

  async deletePoi(input: DeletePoiInput): Promise<{ deleted: true }> {
    await this.ensureGuideAssignedToTour(input.tourId, input.userId);
    const poi = await this.poisRepository.findOne({
      where: { id: input.poiId, tourId: input.tourId }
    });
    if (!poi) {
      throw new NotFoundException('POI not found');
    }
    await this.poisRepository.delete({ id: input.poiId });
    return { deleted: true };
  }

  async upsertGuideLocation(
    tourId: string,
    data: { guideId: string; lat: number; lng: number; sentAt: string }
  ): Promise<{ ok: true }> {
    await this.guideLocationRepository.upsert(
      {
        tourId,
        guideId: data.guideId,
        lat: data.lat,
        lng: data.lng,
        sentAt: new Date(data.sentAt)
      },
      ['tourId']
    );
    return { ok: true };
  }

  async getGuideLocation(
    tourId: string
  ): Promise<{ tourId: string; guideId: string; lat: number; lng: number; sentAt: string } | null> {
    const record = await this.guideLocationRepository.findOne({ where: { tourId } });
    if (!record) return null;
    return {
      tourId: record.tourId,
      guideId: record.guideId,
      lat: record.lat,
      lng: record.lng,
      sentAt: record.sentAt.toISOString()
    };
  }

  private toTourResponse(tour: TourEntity): TourResponse {
    return {
      id: tour.id,
      name: tour.name,
      description: tour.description,
      guideId: tour.guideId,
      joinCode: tour.joinCode,
      status: tour.status,
      createdAt: tour.createdAt,
      updatedAt: tour.updatedAt
    };
  }

  private toMeetingPointResponse(meetingPoint: MeetingPointEntity): MeetingPointResponse {
    return {
      id: meetingPoint.id,
      tourId: meetingPoint.tourId,
      name: meetingPoint.name,
      lat: meetingPoint.lat,
      lng: meetingPoint.lng,
      meetupTime: meetingPoint.meetupTime,
      isCurrent: meetingPoint.isCurrent,
      createdAt: meetingPoint.createdAt,
      updatedAt: meetingPoint.updatedAt
    };
  }

  private toPoiResponse(poi: PoiEntity): PoiResponse {
    return {
      id: poi.id,
      tourId: poi.tourId,
      title: poi.title,
      description: poi.description,
      lat: poi.lat,
      lng: poi.lng,
      createdAt: poi.createdAt,
      updatedAt: poi.updatedAt
    };
  }

  private async ensureGuideAssignedToTour(tourId: string, userId: string): Promise<TourEntity> {
    const tour = await this.toursRepository.findOne({ where: { id: tourId } });
    if (!tour) {
      throw new NotFoundException('Tour not found');
    }
    if (tour.guideId !== userId) {
      throw new ForbiddenException('Only assigned guide can manage map features');
    }
    return tour;
  }

  private async ensureTourAccessibleByUser(tourId: string, userId: string): Promise<TourEntity> {
    const tour = await this.toursRepository.findOne({ where: { id: tourId } });
    if (!tour) {
      throw new NotFoundException('Tour not found');
    }
    if (tour.guideId === userId) {
      return tour;
    }
    const participant = await this.participantsRepository.findOne({
      where: { tourId, userId }
    });
    if (!participant) {
      throw new ForbiddenException('Tour access denied');
    }
    return tour;
  }

  private async generateUniqueJoinCode(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = randomBytes(4).toString('hex').toUpperCase();
      const exists = await this.toursRepository.exists({
        where: { joinCode: candidate }
      });
      if (!exists) {
        return candidate;
      }
    }
    throw new ConflictException('Unable to generate unique join code');
  }
}
