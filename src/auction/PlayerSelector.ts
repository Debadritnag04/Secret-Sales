import { Player } from '../types/player.js';
import { secureShuffle } from '../utils/random.js';
import { logger } from '../utils/logger.js';

export class PlayerSelector {
  /**
   * Initializes a randomized queue of player IDs for the room using cryptographic shuffling.
   */
  static initializeSequence(players: Player[]): string[] {
    const available = players.filter((p) => (p.status || 'available') === 'available');
    const shuffled = secureShuffle(available);
    const sequence = shuffled.map((p) => p.id);
    logger.info({ playerCount: sequence.length }, `[PlayerSelector] Initialized player sequence with ${sequence.length} players`);
    return sequence;
  }

  /**
   * Selects the next player from the room's sequence.
   */
  static getNextPlayer(
    players: Player[],
    sequence: string[],
    currentIndex: number
  ): { player: Player | null; nextIndex: number } {
    if (currentIndex >= sequence.length) {
      return { player: null, nextIndex: currentIndex };
    }

    const nextPlayerId = sequence[currentIndex];
    const player = players.find((p) => p.id === nextPlayerId) || null;

    if (!player) {
      logger.warn({ nextPlayerId, currentIndex }, '[PlayerSelector] Player in sequence not found in pool');
      return { player: null, nextIndex: currentIndex + 1 };
    }

    return { player, nextIndex: currentIndex + 1 };
  }
}
