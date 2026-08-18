import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/server.js';
import { FastifyInstance } from 'fastify';

describe('REST API Endpoints', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const built = await buildApp();
    app = built.app;
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health should return status ok', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(body.version).toBe('1.0.0');
    expect(body.timestamp).toBeDefined();
  });

  it('POST /api/rooms should create a room and return roomCode and hostToken', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/rooms',
      payload: {
        auctionName: 'Championship Auction',
        hostName: 'Rit',
        startingBudget: 200,
        maxParticipants: 12,
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.roomId).toBeDefined();
    expect(body.roomCode).toBeDefined();
    expect(body.hostToken).toBeDefined();
    expect(body.participantId).toBeDefined();
    expect(body.sessionToken).toBeDefined();
  });

  it('POST /api/rooms/:roomCode/join should allow guest to join and return sessionToken', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/rooms',
      payload: {
        auctionName: 'Weekend Cup',
        hostName: 'HostUser',
        startingBudget: 200,
        maxParticipants: 12,
      },
    });
    const { roomCode } = JSON.parse(createRes.body);

    const joinRes = await app.inject({
      method: 'POST',
      url: `/api/rooms/${roomCode}/join`,
      payload: {
        participantName: 'Guest Player',
        squadName: 'Kolkata Knight FC',
      },
    });

    expect(joinRes.statusCode).toBe(200);
    const joinBody = JSON.parse(joinRes.body);
    expect(joinBody.participantId).toBeDefined();
    expect(joinBody.squadId).toBeDefined();
    expect(joinBody.sessionToken).toBeDefined();
  });

  it('GET /api/rooms/:roomCode should return sanitized room state', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/rooms',
      payload: {
        auctionName: 'State Cup',
        hostName: 'HostUser',
        startingBudget: 200,
        maxParticipants: 12,
      },
    });
    const { roomCode } = JSON.parse(createRes.body);

    const stateRes = await app.inject({
      method: 'GET',
      url: `/api/rooms/${roomCode}`,
    });

    expect(stateRes.statusCode).toBe(200);
    const stateBody = JSON.parse(stateRes.body);
    expect(stateBody.roomCode).toBe(roomCode);
    expect(stateBody.phase).toBe('LOBBY');
    expect(stateBody.participants.length).toBe(1);
    expect(stateBody.squads.length).toBe(1);
  });

  it('GET /api/rooms/:roomCode/players should return player catalog with filter support', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/rooms',
      payload: {
        auctionName: 'Player Query Cup',
        hostName: 'HostUser',
        startingBudget: 200,
        maxParticipants: 12,
      },
    });
    const { roomCode } = JSON.parse(createRes.body);

    const playersRes = await app.inject({
      method: 'GET',
      url: `/api/rooms/${roomCode}/players?position=ST`,
    });

    expect(playersRes.statusCode).toBe(200);
    const { players } = JSON.parse(playersRes.body);
    expect(Array.isArray(players)).toBe(true);
    expect(players.every((p: any) => p.position === 'ST')).toBe(true);
  });

  it('GET /api/rooms/:roomCode/results should return auction results structure', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/rooms',
      payload: {
        auctionName: 'Results Cup',
        hostName: 'HostUser',
        startingBudget: 200,
        maxParticipants: 12,
      },
    });
    const { roomCode } = JSON.parse(createRes.body);

    const resultsRes = await app.inject({
      method: 'GET',
      url: `/api/rooms/${roomCode}/results`,
    });

    expect(resultsRes.statusCode).toBe(200);
    const resultsBody = JSON.parse(resultsRes.body);
    expect(resultsBody.roomCode).toBe(roomCode);
    expect(Array.isArray(resultsBody.standings)).toBe(true);
    expect(Array.isArray(resultsBody.auditLogs)).toBe(true);
  });
});
