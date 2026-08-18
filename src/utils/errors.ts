export type ErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'AUCTION_ALREADY_STARTED'
  | 'AUCTION_NOT_STARTED'
  | 'INVALID_SESSION'
  | 'NOT_HOST'
  | 'INVALID_PHASE'
  | 'BID_ALREADY_SUBMITTED'
  | 'BID_EXCEEDS_BUDGET'
  | 'BID_BELOW_MINIMUM'
  | 'PLAYER_UNAVAILABLE'
  | 'NO_PLAYERS_REMAINING'
  | 'REVEAL_ALREADY_COMPLETED'
  | 'NOT_ENOUGH_PARTICIPANTS'
  | 'TOO_MANY_PARTICIPANTS'
  | 'INVALID_STATE_TRANSITION'
  | 'SQUAD_NAME_TAKEN'
  | 'PARTICIPANT_NOT_FOUND'
  | 'SQUAD_NOT_FOUND'
  | 'NO_BIDS_SUBMITTED'
  | 'ROUND_LOCKED'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(code: ErrorCode, message: string, statusCode = 400, details?: any) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const createError = (code: ErrorCode, message: string, statusCode = 400, details?: any) => {
  return new AppError(code, message, statusCode, details);
};
