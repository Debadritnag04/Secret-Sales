import { Player } from './player.js';

export interface PlayerPurchase {
  player: Player;
  amount: number;
  round: number;
  timestamp: number;
}

export interface Squad {
  id: string;
  participantId: string;
  ownerName: string;
  squadName: string;
  budget: number;
  startingBudget: number;
  spent: number;
  isReady: boolean;
  roster: PlayerPurchase[];
}

export interface TeamPublicInfo {
  id: string;
  participantId: string;
  ownerName: string;
  squadName: string;
  budget: number;
  startingBudget: number;
  spent: number;
  isReady: boolean;
  roster: PlayerPurchase[];
  highestPurchase?: PlayerPurchase | null;
  cheapestPurchase?: PlayerPurchase | null;
  playerCount: number;
}
