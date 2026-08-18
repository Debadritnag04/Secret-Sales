import crypto from 'crypto';

/**
 * Generates an uppercase 6-character alphanumeric room code
 */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // exclude ambiguous chars like 0, O, 1, I
  let code = '';
  for (let i = 0; i < 6; i++) {
    const randomIndex = crypto.randomInt(0, chars.length);
    code += chars[randomIndex];
  }
  return code;
}

/**
 * Generates a cryptographically secure random session token
 */
export function generateSecureToken(prefix = 'tok'): string {
  return `${prefix}_${crypto.randomBytes(24).toString('hex')}`;
}

/**
 * Generates a unique ID
 */
export function generateId(prefix = 'id'): string {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Cryptographically selects a winner from an array of tied squad IDs
 */
export function pickRandomTieBreakWinner(tiedSquadIds: string[]): string {
  if (!tiedSquadIds.length) {
    throw new Error('Cannot resolve tie with empty squad array');
  }
  if (tiedSquadIds.length === 1) {
    return tiedSquadIds[0];
  }
  const winnerIndex = crypto.randomInt(0, tiedSquadIds.length);
  return tiedSquadIds[winnerIndex];
}

/**
 * Cryptographically shuffles an array (Fisher-Yates with crypto.randomInt)
 */
export function secureShuffle<T>(array: T[]): T[] {
  const cloned = [...array];
  for (let i = cloned.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}
