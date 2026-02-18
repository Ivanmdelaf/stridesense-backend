export type RoleType = 'athlete' | 'coach' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: RoleType;
  avatarUrl: string | null;
  createdAt: Date;
}
