export type UserRole = 'recruteur' | 'rh' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  status: 'actif' | 'inactif' | 'en_attente';
  createdAt?: string;
  lastActivity?: string;
}
