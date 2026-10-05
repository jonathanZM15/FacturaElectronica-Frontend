import api from './api';

export interface CompraDetalle {
  id: number;
  compra_id: number;
  producto_id?: number;
  codigo_principal?: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  descuento: number;
  precio_total_sin_impuesto: number;
  codigo_impuesto: string;
  codigo_porcentaje: string;
  tarifa: number;
  base_imponible: number;
  valor_impuesto: number;
}

export interface Compra {
  id: number;
  emisor_id: number;
  establecimiento_id?: number;
  proveedor_id?: number;
  tipo_ingreso: string;
  numero_comprobante?: string;
  fecha_emision: string;
  subtotal_0: number;
  subtotal_12: number;
  total_descuento: number;
  total_iva: number;
  importe_total: number;
  estado: string;
  proveedor?: {
    razon_social: string;
    identificacion: string;
  };
  detalles?: CompraDetalle[];
}

export const comprasApi = {
  list(emisorId: number | string, params?: { page?: number; search?: string; fecha_inicio?: string; fecha_fin?: string; tipo_ingreso?: string }) {
    return api.get(`/api/emisores/${emisorId}/compras`, { params });
  }
};
