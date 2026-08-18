import { z } from 'zod';

export const updateTeamNameSchema = z.object({
  squadName: z.string().min(1, 'Squad name is required').max(50),
});

export const playerQuerySchema = z.object({
  status: z.enum(['available', 'sold', 'unsold', 'all']).optional(),
  position: z.enum(['GK', 'DEF', 'MID', 'WING', 'ST']).optional(),
  search: z.string().optional(),
  minRating: z.coerce.number().optional(),
});

export type UpdateTeamNameInput = z.infer<typeof updateTeamNameSchema>;
export type PlayerQueryInput = z.infer<typeof playerQuerySchema>;
