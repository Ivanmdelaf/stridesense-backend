export type Sport = 'running' | 'cycling' | 'swimming' | 'strength' | 'other';

export interface Session {
  id: string;
  date: Date;
  durationMinutes: number;
  sport: Sport;
  distanceKm: number | null;
  avgHeartRate: number | null;
  cadenceSpm: number | null;
  notes: string | null;
  userId: string;
}
