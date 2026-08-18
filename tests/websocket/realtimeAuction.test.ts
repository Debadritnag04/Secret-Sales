import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { buildApp } from '../../src/server.js';
import { defaultRoomService } from '../../src/services/RoomService.js';
import { FastifyInstance } from 'fastify';

describe('Real-Time WebSocket Auction Flow', () => {
  let app: FastifyInstance;
  let serverAddress: string;

  beforeAll(async () => {
    const built = await buildApp();
    app = built.app;
    await app.listen({ port: 0, host: '127.0.0.1' });
    const addressInfo = app.server.address() as any;
    serverAddress = `http://127.0.0.1:${addressInfo.port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should support full authentication, bidding secrecy, and auto-reveal over Socket.IO', async () => {
    // 1. Create room via service
    const created = await defaultRoomService.createRoom({
      auctionName: 'Socket Live Cup',
      hostName: 'HostPlayer',
      startingBudget: 200,
      maxParticipants: 12,
      minBid: 1,
      allowHostForceReveal: true,
    });

    const guest1 = await defaultRoomService.joinRoom(created.roomCode, {
      participantName: 'Guest 1',
      squadName: 'Kolkata Strikers',
    });

    // 2. Connect Host client
    const hostSocket: ClientSocket = Client(serverAddress, {
      auth: {
        roomCode: created.roomCode,
        participantId: created.participantId,
        sessionToken: created.sessionToken,
      },
    });

    // 3. Connect Guest client
    const guestSocket: ClientSocket = Client(serverAddress, {
      auth: {
        roomCode: created.roomCode,
        participantId: guest1.participantId,
        sessionToken: guest1.sessionToken,
      },
    });

    await new Promise<void>((resolve) => {
      let connectedCount = 0;
      const checkDone = () => {
        connectedCount++;
        if (connectedCount === 2) resolve();
      };
      hostSocket.on('connect', checkDone);
      guestSocket.on('connect', checkDone);
    });

    // 4. Host starts the auction
    const auctionStartedPromise = new Promise<any>((resolve) => {
      guestSocket.on('auction:started', (data) => resolve(data));
    });

    hostSocket.emit('auction:start');
    const startData = await auctionStartedPromise;
    expect(startData.round).toBe(1);
    expect(startData.player).toBeDefined();

    // 5. Sealed Bid Submissions: verify secrecy
    const bidProgressEvents: any[] = [];
    guestSocket.on('auction:bid_submitted', (data) => {
      bidProgressEvents.push(data);
    });

    // Host submits 50
    const hostAckPromise = new Promise<any>((resolve) => {
      hostSocket.emit('auction:submit_bid', { bidAmount: 50 }, (res: any) => resolve(res));
    });
    const hostAck = await hostAckPromise;
    expect(hostAck.status).toBe('accepted');

    // Wait a brief tick for broadcast
    await new Promise((r) => setTimeout(r, 50));
    expect(bidProgressEvents.length).toBe(1);
    expect(bidProgressEvents[0].submittedCount).toBe(1);
    expect(bidProgressEvents[0].totalParticipants).toBe(2);
    // Crucial: No bid amount leaked
    expect((bidProgressEvents[0] as any).bidAmount).toBeUndefined();
    expect((bidProgressEvents[0] as any).amount).toBeUndefined();

    // Guest submits 70 (which should trigger automatic reveal since 2/2 submitted)
    const revealPromise = new Promise<any>((resolve) => {
      guestSocket.on('auction:revealed', (revealData) => resolve(revealData));
    });

    const guestAckPromise = new Promise<any>((resolve) => {
      guestSocket.emit('auction:submit_bid', { bidAmount: 70 }, (res: any) => resolve(res));
    });
    const guestAck = await guestAckPromise;
    expect(guestAck.status).toBe('accepted');

    const revealResult = await revealPromise;
    expect(revealResult.winnerSquadName).toBe('Kolkata Strikers');
    expect(revealResult.winningBid).toBe(70);

    hostSocket.disconnect();
    guestSocket.disconnect();
  });
});
