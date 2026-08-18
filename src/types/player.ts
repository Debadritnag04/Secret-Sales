export type Position = 'GK' | 'DEF' | 'MID' | 'WING' | 'ST';
export type PlayerStatus = 'available' | 'sold' | 'unsold';

export interface Player {
  id: string;
  name: string;
  rating: number;
  position: Position;
  club: string;
  nationality: string;
  photoUrl: string;
  basePrice: number;
  status?: PlayerStatus;
}
