import { Squad } from '../types/team.js';
import { createError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export class BudgetManager {
  /**
   * Validates if a squad has enough budget for a bid amount
   */
  static validateBudget(squad: Squad, amount: number): boolean {
    return squad.budget >= amount && amount > 0;
  }

  /**
   * Deducts the winning bid amount from squad budget server-side.
   * Guarantees budget never drops below zero.
   */
  static deductWinningBid(squad: Squad, amount: number): { budget: number; spent: number } {
    if (amount > squad.budget) {
      throw createError(
        'BID_EXCEEDS_BUDGET',
        `Winning bid (${amount}) exceeds squad remaining budget (${squad.budget})`
      );
    }

    squad.budget -= amount;
    squad.spent += amount;

    logger.info(
      { squadId: squad.id, squadName: squad.squadName, deducted: amount, remainingBudget: squad.budget, totalSpent: squad.spent },
      `[BudgetManager] Deducted ${amount} from squad ${squad.squadName}`
    );

    return {
      budget: squad.budget,
      spent: squad.spent,
    };
  }
}
