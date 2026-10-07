export type TipoIdentificacion = 
  | 'RUC' 
  | 'CEDULA' 
  | 'PASAPORTE' 
  | 'CONSUMIDOR_FINAL' 
  | 'IDENTIFICACION_EXTERIOR' 
  | 'PLACA';

export interface Cliente {
  id: number;
  emisor_id: number;
  tipo_identificacion: TipoIdentificacion;
  identificacion: string;
  razon_social: string;
  nombre_comercial?: string | null;
  direccion?: string | null;
  email?: string | null;
  telefono?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ClienteFormData {
  tipo_identificacion: TipoIdentificacion;
  identificacion: string;
  razon_social: string;
  nombre_comercial?: string;
  direccion?: string;
  email?: string;
  telefono?: string;
}
