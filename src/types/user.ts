// Establecimientos y Puntos de Emisión asociados
export interface Establecimiento {
  id: number | string;
  codigo: string;
  nombre: string;
  direccion?: string;
  estado?: string;
}

export interface PuntoEmision {
  id: number | string;
  establecimiento_id: number | string;
  codigo: string;
  nombre: string;
  estado?: string;
  establecimiento_codigo?: string;
}

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
  
  // Usuario creador - Formato: ROL – USERNAME – NOMBRES – APELLIDOS
  created_by_id?: number | string;
  created_by_role?: string;
  created_by_username?: string;
  created_by_nombres?: string;
  created_by_apellidos?: string;
  
  // Emisor asociado (para mostrar en listas)
  emisor_ruc?: string;
  emisor_razon_social?: string;
  emisor_estado?: string;
  
  // Datos completos de establecimientos y puntos
  establecimientos?: Establecimiento[];
  puntos_emision?: PuntoEmision[];
  
  created_at?: string;
  updated_at?: string;
}
