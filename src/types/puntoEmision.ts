export interface PuntoEmision {
  id?: number;
  establecimiento_id?: number;
  company_id?: number;
  codigo: string;
  estado: 'ACTIVO' | 'DESACTIVADO';
  nombre: string;
  secuencial_factura: number;
  secuencial_liquidacion_compra: number;
  secuencial_nota_credito: number;
  secuencial_nota_debito: number;
  secuencial_guia_remision: number;
  secuencial_retencion: number;
  secuencial_proforma: number;
}
