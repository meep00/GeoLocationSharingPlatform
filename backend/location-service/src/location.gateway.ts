import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from '@nestjs/websockets';
import { JwtUserPayload } from '@geo/shared';
import { Logger } from '@nestjs/common';
import { verify } from 'jsonwebtoken';
import { Server, Socket } from 'socket.io';

interface GuideLocationPayload {
  tourId: string;
  lat: number;
  lng: number;
  sentAt?: string;
}

interface SubscribeTourPayload {
  tourId: string;
}

interface TourDetailsDto {
  id: string;
  guideId: string;
}

interface LocationUpdateDto {
  tourId: string;
  lat: number;
  lng: number;
  sentAt: string;
  guideId: string;
  isFallback: boolean;
}

interface SocketUserData {
  user?: JwtUserPayload;
  accessToken?: string;
  joinedTours: Set<string>;
}

type AuthenticatedSocket = Socket;

@WebSocketGateway({
  cors: { origin: '*' },
  pingTimeout: 20_000,
  pingInterval: 10_000
})
export class LocationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(LocationGateway.name);
  private readonly toursServiceUrl =
    process.env.TOURS_SERVICE_URL?.replace(/\/+$/, '') ?? 'http://localhost:3002';
  private readonly lastKnownByTour = new Map<string, LocationUpdateDto>();

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    const data = this.getClientData(client);
    const token = this.extractAccessToken(client);
    if (!token) {
      this.disconnectWithError(client, 'Missing access token');
      return;
    }

    const user = this.verifyAccessToken(token);
    if (!user) {
      this.disconnectWithError(client, 'Invalid access token');
      return;
    }

    data.user = user;
    data.accessToken = token;
    data.joinedTours = new Set<string>();
    client.emit('connection:ready', { userId: user.sub, role: user.role });
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    this.getClientData(client).joinedTours.clear();
  }

  @SubscribeMessage('tour:subscribe')
  async handleTourSubscribe(
    @MessageBody() payload: SubscribeTourPayload,
    @ConnectedSocket() client: AuthenticatedSocket
  ): Promise<void> {
    const data = this.getClientData(client);
    const user = data.user;
    const accessToken = data.accessToken;
    const tourId = payload?.tourId;

    if (!user || !accessToken) {
      client.emit('tour:error', { message: 'Authentication required' });
      return;
    }
    if (!tourId) {
      client.emit('tour:error', { message: 'tourId is required' });
      return;
    }

    const tour = await this.fetchTourForUser(tourId, user, accessToken);
    if (!tour) {
      client.emit('tour:error', { message: 'Tour access denied' });
      return;
    }

    const room = this.roomForTour(tourId);
    await client.join(room);
    data.joinedTours.add(tourId);
    client.emit('tour:subscribed', { tourId });
    this.emitLastKnownToClient(tourId, client);
  }

  @SubscribeMessage('tour:unsubscribe')
  async handleTourUnsubscribe(
    @MessageBody() payload: SubscribeTourPayload,
    @ConnectedSocket() client: AuthenticatedSocket
  ): Promise<void> {
    const tourId = payload?.tourId;
    if (!tourId) {
      return;
    }
    await client.leave(this.roomForTour(tourId));
    this.getClientData(client).joinedTours.delete(tourId);
    client.emit('tour:unsubscribed', { tourId });
  }

  @SubscribeMessage('tour:last-known:request')
  async handleLastKnownRequest(
    @MessageBody() payload: SubscribeTourPayload,
    @ConnectedSocket() client: AuthenticatedSocket
  ): Promise<void> {
    const data = this.getClientData(client);
    const user = data.user;
    const accessToken = data.accessToken;
    const tourId = payload?.tourId;
    if (!user || !accessToken || !tourId) {
      return;
    }
    const tour = await this.fetchTourForUser(tourId, user, accessToken);
    if (!tour) {
      client.emit('tour:error', { message: 'Tour access denied' });
      return;
    }
    this.emitLastKnownToClient(tourId, client);
  }

  @SubscribeMessage('guide:location')
  async handleGuideLocation(
    @MessageBody() payload: GuideLocationPayload,
    @ConnectedSocket() client: AuthenticatedSocket
  ): Promise<void> {
    const data = this.getClientData(client);
    const user = data.user;
    const accessToken = data.accessToken;
    if (!user || !accessToken) {
      client.emit('tour:error', { message: 'Authentication required' });
      return;
    }
    if (user.role !== 'guide') {
      client.emit('tour:error', { message: 'Only guide can publish location' });
      return;
    }
    if (!payload?.tourId) {
      client.emit('tour:error', { message: 'tourId is required' });
      return;
    }
    if (!this.isValidCoordinate(payload.lat, -90, 90)) {
      client.emit('tour:error', { message: 'lat must be between -90 and 90' });
      return;
    }
    if (!this.isValidCoordinate(payload.lng, -180, 180)) {
      client.emit('tour:error', { message: 'lng must be between -180 and 180' });
      return;
    }

    const tour = await this.fetchTourForUser(payload.tourId, user, accessToken);
    if (!tour || tour.guideId !== user.sub) {
      client.emit('tour:error', { message: 'Only assigned guide can publish for this tour' });
      return;
    }

    const room = this.roomForTour(payload.tourId);
    const update: LocationUpdateDto = {
      tourId: payload.tourId,
      lat: payload.lat,
      lng: payload.lng,
      sentAt: payload.sentAt ?? new Date().toISOString(),
      guideId: user.sub,
      isFallback: false
    };
    this.lastKnownByTour.set(payload.tourId, update);

    data.joinedTours.add(payload.tourId);
    await client.join(room);
    this.server.to(room).emit('guide:location:update', update);
  }

  private async fetchTourForUser(
    tourId: string,
    user: JwtUserPayload,
    accessToken: string
  ): Promise<TourDetailsDto | null> {
    try {
      const response = await fetch(`${this.toursServiceUrl}/tours/${tourId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'x-user-id': user.sub,
          'x-user-role': user.role
        }
      });
      if (response.status === 403 || response.status === 404) {
        return null;
      }
      if (!response.ok) {
        this.logger.warn(`Failed to verify tour access ${tourId}: ${response.status}`);
        return null;
      }
      const body = (await response.json()) as TourDetailsDto;
      return {
        id: body.id,
        guideId: body.guideId
      };
    } catch (error) {
      this.logger.error(`Tour access verification failed for ${tourId}`, error as Error);
      return null;
    }
  }

  private emitLastKnownToClient(tourId: string, client: AuthenticatedSocket): void {
    const lastKnown = this.lastKnownByTour.get(tourId);
    if (!lastKnown) {
      client.emit('guide:location:missing', { tourId });
      return;
    }
    client.emit('guide:location:update', {
      ...lastKnown,
      isFallback: true
    });
  }

  private extractAccessToken(client: AuthenticatedSocket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) {
      return authToken.trim();
    }

    const header = client.handshake.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice('Bearer '.length).trim();
    }
    return null;
  }

  private verifyAccessToken(token: string): JwtUserPayload | null {
    try {
      const payload = verify(
        token,
        process.env.JWT_SECRET ?? 'super-secret-change-me'
      ) as JwtUserPayload;
      if (!payload?.sub || !payload?.role || !payload?.email) {
        return null;
      }
      return payload;
    } catch {
      return null;
    }
  }

  private disconnectWithError(client: AuthenticatedSocket, message: string): void {
    client.emit('connection:error', { message });
    client.disconnect(true);
  }

  private roomForTour(tourId: string): string {
    return `tour:${tourId}`;
  }

  private isValidCoordinate(value: number, min: number, max: number): boolean {
    return Number.isFinite(value) && value >= min && value <= max;
  }

  private getClientData(client: AuthenticatedSocket): SocketUserData {
    const currentData = client.data as Partial<SocketUserData>;
    if (!currentData.joinedTours) {
      currentData.joinedTours = new Set<string>();
    }
    return currentData as SocketUserData;
  }
}
