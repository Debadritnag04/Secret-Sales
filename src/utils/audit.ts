import { logger } from './logger.js';

export type AuditEventType =
  | 'ROOM_CREATED'
  | 'PARTICIPANT_JOINED'
  | 'PARTICIPANT_LEFT'
  | 'AUCTION_STARTED'
  | 'PLAYER_SELECTED'
  | 'BID_SUBMITTED'
  | 'FORCE_REVEAL'
  | 'REVEAL_COMPLETED'
  | 'TIE_BREAK'
  | 'PLAYER_SOLD'
  | 'BUDGET_UPDATED'
  | 'NEXT_PLAYER'
  | 'AUCTION_COMPLETED';

export interface AuditRecord {
  id: string;
  roomId: string;
  roomCode: string;
  eventType: AuditEventType;
  details: Record<string, any>;
  timestamp: number;
}

export class AuditService {
  private static auditLogs = new Map<string, AuditRecord[]>();

  static record(roomId: string, roomCode: string, eventType: AuditEventType, details: Record<string, any> = {}): AuditRecord {
    const record: AuditRecord = {
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      roomId,
      roomCode,
      eventType,
      details,
      timestamp: Date.now(),
    };

    let roomLogs = this.auditLogs.get(roomId);
    if (!roomLogs) {
      roomLogs = [];
      this.auditLogs.set(roomId, roomLogs);
    }
    roomLogs.push(record);

    logger.info(
      { roomId, roomCode, eventType, ...details },
      `[Audit] ${eventType} in room ${roomCode}`
    );

    return record;
  }

  static getLogsForRoom(roomId: string): AuditRecord[] {
    return this.auditLogs.get(roomId) || [];
  }

  static clearLogsForRoom(roomId: string): void {
    this.auditLogs.delete(roomId);
  }
}
