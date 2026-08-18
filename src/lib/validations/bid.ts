import { z } from 'zod';

export const createBidSchema = (minBid: number, maxBudget: number) => {
  return z
    .number()
    .min(minBid, `Minimum bid is ${minBid} Cr`)
    .max(maxBudget, 'Bid exceeds remaining budget.');
};
