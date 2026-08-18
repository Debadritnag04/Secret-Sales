import { z } from 'zod';

export const createRoomSchema = z.object({
  auctionName: z.string().min(2, 'Auction name must be at least 2 characters').max(100),
  hostName: z.string().min(1, 'Host name is required').max(50),
  startingBudget: z.number().positive('Starting budget must be greater than 0').default(200),
  maxParticipants: z
    .number()
    .int('Max participants must be an integer')
    .min(9, 'Room must support between 9 and 12 participants')
    .max(12, 'Room must support between 9 and 12 participants')
    .default(12),
  minBid: z.number().min(1, 'Minimum bid must be at least 1').default(1),
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
