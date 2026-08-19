import { z } from 'zod';

/**
 * Bid submission schema.
 * 
 * Rules:
 * - bidAmount = 0 → PASS (manager doesn't want this player)
 * - bidAmount > 0 → actual sealed bid
 * - bidAmount < 0 → INVALID
 * - Maximum 1 decimal place (0.1 Cr precision)
 * - If ALL managers submit 0 → player is UNSOLD
 */
export const submitBidSchema = z.object({
  bidAmount: z
    .number()
    .min(0, 'Bid cannot be negative')
    .refine(
      (val) => {
        const decimalPart = val.toString().split('.')[1];
        return !decimalPart || decimalPart.length <= 1;
      },
      { message: 'Bid can have at most 1 decimal place (0.1 Cr precision)' }
    ),
});

export type SubmitBidInput = z.infer<typeof submitBidSchema>;
