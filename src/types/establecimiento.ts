export interface Establecimiento {
  id?: number;
  company_id?: number;
  codigo: string;
  estado: 'ABIERTO' | 'CERRADO';
  nombre: string;
  nombre_comercial?: string;
  direccion: string;
  correo?: string;
  telefono?: string;
  logo_path?: string;
  actividades_economicas?: string;
  fecha_inicio_actividades?: string | null;
  fecha_reinicio_actividades?: string | null;
  fecha_cierre_establecimiento?: string | null;
}
