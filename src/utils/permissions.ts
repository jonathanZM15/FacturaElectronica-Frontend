import { User } from '../types/user';

/** The backend is authoritative; missing permissions grant no action. */
export const can = (user: User | null, permission: string): boolean =>
  user?.permisos?.[permission] === true;
