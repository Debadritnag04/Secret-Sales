import { z } from 'zod';

export const createRoomSchema = z.object({
  auctionName: z.string().min(2, 'Auction name must be at least 2 characters').max(100),
  hostName: z.string().min(1, 'Host name is required').max(50),
  squadName: z.string().min(1, 'Squad name is required').max(50).optional(),
  startingBudget: z
    .number()
    .positive('Starting budget must be greater than 0')
    .max(9999.9, 'Starting budget cannot exceed 9999.9')
    .refine(
      (val) => {
        const decimalPart = val.toString().split('.')[1];
        return !decimalPart || decimalPart.length <= 1;
      },
      { message: 'Starting budget can have at most 1 decimal place' }
    )
    .default(200),
  maxParticipants: z
    .number()
    .int('Max participants must be an integer')
    .min(1, 'Room must support at least 1 participant')
    .max(12, 'Room must support at most 12 participants')
    .default(12),
  minBid: z
    .number()
    .min(0.1, 'Minimum bid must be at least 0.1')
    .refine(
      (val) => {
        const decimalPart = val.toString().split('.')[1];
        return !decimalPart || decimalPart.length <= 1;
      },
      { message: 'Minimum bid can have at most 1 decimal place' }
    )
    .default(1),
  allowHostForceReveal: z.boolean().default(true),
});

export const joinRoomSchema = z.object({
  participantName: z.string().min(1, 'Participant name is required').max(50),
  squadName: z.string().min(1, 'Squad name is required').max(50),
});

export const roomCodeParamSchema = z.object({
  roomCode: z.string().min(4).max(10),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type JoinRoomInput = z.infer<typeof joinRoomSchema>;
