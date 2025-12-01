export interface User {
  id?: number | string;
  cedula?: string;
  nombres?: string;
  apellidos?: string;
  username?: string;
  email: string;
  password?: string;
  password_confirmation?: string;
  role: 'administrador' | 'distribuidor' | 'emisor' | 'gerente' | 'cajero';
  estado?: 'nuevo' | 'activo' | 'pendiente_verificacion' | 'suspendido' | 'retirado';
  emisor_id?: number | string; // Para Emisor, Gerente, Cajero
  establecimientos_ids?: (number | string)[]; // Para Gerente, Cajero
  puntos_emision_ids?: (number | string)[]; // Para Gerente, Cajero
  created_at?: string;
  updated_at?: string;
}
