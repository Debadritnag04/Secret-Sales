export interface SealedBid {
  participantId: string;
  squadId: string;
  squadName: string;
  amount: number;
  submittedAt: number;
}

export interface BidValidationResult {
  valid: boolean;
  code?: string;
  message?: string;
}

export interface BidSubmissionProgress {
  submittedCount: number;
  totalParticipants: number;
}
