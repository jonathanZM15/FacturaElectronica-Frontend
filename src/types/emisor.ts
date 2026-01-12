export interface Emisor {
  id?: number | string;
  ruc: string;
  razon_social: string;
  nombre_comercial?: string;
  direccion_matriz?: string;

  regimen_tributario?: 'GENERAL' | 'RIMPE_POPULAR' | 'RIMPE_EMPRENDEDOR' | 'MICRO_EMPRESA';
  obligado_contabilidad?: 'SI' | 'NO';
  contribuyente_especial?: 'SI' | 'NO';
  numero_resolucion_contribuyente_especial?: string;
  agente_retencion?: 'SI' | 'NO';
  numero_resolucion_agente_retencion?: string;
  tipo_persona?: 'NATURAL' | 'JURIDICA';
  codigo_artesano?: string;

  correo_remitente?: string;
  estado: 'ACTIVO' | 'DESACTIVADO';
  ambiente: 'PRODUCCION' | 'PRUEBAS';
  tipo_emision: 'NORMAL' | 'INDISPONIBILIDAD';

  logo_url?: string;
  // Campos adicionales usados en la tabla
  tipo_plan?: string;
  fecha_inicio_plan?: string;
  fecha_fin_plan?: string;
  cantidad_creados?: number;
  cantidad_restantes?: number;

  fecha_creacion?: string;
  fecha_actualizacion?: string;
  registrador?: string;
  ultimo_login?: string;
  ultimo_comprobante?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: number;
  updated_by?: number;
  created_by_name?: string;
  updated_by_name?: string;
  ruc_editable?: boolean;
  created_by_username?: string;
  // Relación con el creador para mostrar formato ROL – USERNAME – NOMBRES – APELLIDOS
  creator?: {
    id: number;
    role?: string;
    username?: string;
    email?: string;
    name?: string;
    nombres?: string;
    apellidos?: string;
  };
}