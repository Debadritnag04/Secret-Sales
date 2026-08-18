import { z } from 'zod';

export const submitBidSchema = z.object({
  bidAmount: z
    .number()
    .int('Bid amount must be an integer')
    .positive('Bid amount must be greater than 0'),
});

export type SubmitBidInput = z.infer<typeof submitBidSchema>;
