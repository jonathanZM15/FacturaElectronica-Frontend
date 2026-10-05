import api from './api';
import { Bodega, Producto, MotivoMovimiento } from '../types/inventory';

const BASE_INVENTORY_URL = '/api/emisores';

// Cache en memoria para evitar llamadas redundantes al cambiar de pestaña
let bodegasCache: Record<string, { data: Bodega[]; timestamp: number }> = {};
let productosCache: Record<string, { data: Producto[]; timestamp: number }> = {};
let motivosCache: Record<string, { data: MotivoMovimiento[]; timestamp: number }> = {};
const CACHE_TTL = 30000; // 30 segundos

export const invalidateInventoryCache = (emisorId?: string | number) => {
    if (emisorId) {
        const key = String(emisorId);
        delete bodegasCache[key];
        delete productosCache[key];
        Object.keys(motivosCache).forEach(k => {
            if (k.startsWith(`${key}_`)) delete motivosCache[k];
        });
    } else {
        bodegasCache = {};
        productosCache = {};
        motivosCache = {};
    }
};

export const getBodegas = async (emisorId: string | number, forceRefresh = false): Promise<Bodega[]> => {
    const key = String(emisorId);
    const now = Date.now();
    if (!forceRefresh && bodegasCache[key] && (now - bodegasCache[key].timestamp < CACHE_TTL)) {
        return bodegasCache[key].data;
    }
    const response = await api.get(`${BASE_INVENTORY_URL}/${emisorId}/bodegas`);
    const d = response.data;
    const result = Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []);
    bodegasCache[key] = { data: result, timestamp: now };
    return result;
};

export const createBodega = async (emisorId: string | number, data: Partial<Bodega>): Promise<Bodega> => {
    invalidateInventoryCache(emisorId);
    const response = await api.post(`${BASE_INVENTORY_URL}/${emisorId}/bodegas`, data);
    return response.data.data;
};

export const updateBodega = async (emisorId: string | number, id: number | string, data: Partial<Bodega>): Promise<Bodega> => {
    invalidateInventoryCache(emisorId);
    const response = await api.put(`${BASE_INVENTORY_URL}/${emisorId}/bodegas/${id}`, data);
    return response.data.data;
};

export const deleteBodega = async (emisorId: string | number, id: number | string) => {
    invalidateInventoryCache(emisorId);
    const response = await api.delete(`${BASE_INVENTORY_URL}/${emisorId}/bodegas/${id}`);
    return response.data;
};

export const getProductos = async (emisorId: string | number, forceRefresh = false): Promise<Producto[]> => {
    const key = String(emisorId);
    const now = Date.now();
    if (!forceRefresh && productosCache[key] && (now - productosCache[key].timestamp < CACHE_TTL)) {
        return productosCache[key].data;
    }
    const response = await api.get(`${BASE_INVENTORY_URL}/${emisorId}/productos`);
    const d = response.data;
    const result = Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []);
    productosCache[key] = { data: result, timestamp: now };
    return result;
};

export const createProducto = async (emisorId: string | number, data: Partial<Producto>): Promise<Producto> => {
    const response = await api.post(`${BASE_INVENTORY_URL}/${emisorId}/productos`, data);
    return response.data.data;
};

export const getStockDisponible = async (emisorId: string | number, productoId: string | number) => {
    const response = await api.get(`${BASE_INVENTORY_URL}/${emisorId}/productos/${productoId}/stock-disponible`);
    return response.data;
};

export const transferirStock = async (emisorId: string | number, payload: any) => {
    const response = await api.post(`${BASE_INVENTORY_URL}/${emisorId}/movimientos/transferir`, payload);
    return response.data;
};

export const ajustarStock = async (emisorId: string | number, payload: any) => {
    const response = await api.post(`${BASE_INVENTORY_URL}/${emisorId}/movimientos/ajustar`, payload);
    return response.data;
};

export const inventarioInicial = async (emisorId: string | number, payload: any) => {
    const response = await api.post(`${BASE_INVENTORY_URL}/${emisorId}/movimientos/inventario-inicial`, payload);
    return response.data;
};

export const reacondicionarStock = async (emisorId: string | number, payload: any) => {
    const response = await api.post(`${BASE_INVENTORY_URL}/${emisorId}/movimientos/reacondicionar`, payload);
    return response.data;
};

export const despacharSucursal = async (emisorId: string | number, payload: any) => {
    const response = await api.post(`${BASE_INVENTORY_URL}/${emisorId}/movimientos/despachar-sucursal`, payload);
    return response.data;
};

export const getDespachos = async (emisorId: string | number, page: number = 1, filters?: any) => {
    const params = { page, ...filters };
    const response = await api.get(`${BASE_INVENTORY_URL}/${emisorId}/movimientos/despachar-sucursal`, { params });
    return response.data;
};

export const getDespachoDetail = async (emisorId: string | number, movimientoId: number | string) => {
    const response = await api.get(`${BASE_INVENTORY_URL}/${emisorId}/movimientos/despachar-sucursal/${movimientoId}`);
    return response.data;
};

export const descargarSucursal = async (emisorId: string | number, movimientoId: number | string, observacion: string) => {
    const response = await api.post(`${BASE_INVENTORY_URL}/${emisorId}/movimientos/despachar-sucursal/${movimientoId}/descargar`, { observacion });
    return response.data;
};

export const recibirSucursal = async (emisorId: string | number, movimientoId: number | string, payload: any) => {
    const response = await api.post(`${BASE_INVENTORY_URL}/${emisorId}/movimientos/despachar-sucursal/${movimientoId}/recibir`, payload);
    return response.data;
};

export const getKardex = async (emisorId: string | number, page: number = 1, filters?: any) => {
    const params = { page, ...filters };
    const response = await api.get(`${BASE_INVENTORY_URL}/${emisorId}/movimientos/kardex`, { params });
    return response.data;
};

export const getExistenciasConsolidado = async (emisorId: string | number, params?: any) => {
    const response = await api.get(`${BASE_INVENTORY_URL}/${emisorId}/existencias`, { params });
    return response.data;
};

export const getStockEnBodega = async (emisorId: string | number, bodegaId: string | number, productoId: string | number): Promise<number> => {
    if (!bodegaId || !productoId) return 0;
    try {
        const response = await api.get(`${BASE_INVENTORY_URL}/${emisorId}/existencias`, {
            params: { bodega_id: bodegaId, producto_id: productoId, solo_con_stock: 0 }
        });
        const d = response.data?.data || response.data || [];
        if (Array.isArray(d) && d.length > 0) {
            return parseFloat(d[0].stock_disponible ?? d[0].stock_fisico ?? 0);
        }
        return 0;
    } catch {
        return 0;
    }
};

export const getExistenciasLotes = async (emisorId: string | number, params?: any) => {
    const response = await api.get(`${BASE_INVENTORY_URL}/${emisorId}/existencias/lotes`, { params });
    return response.data;
};

export const getExistenciasSeries = async (emisorId: string | number, params?: any) => {
    const response = await api.get(`${BASE_INVENTORY_URL}/${emisorId}/existencias/series`, { params });
    return response.data;
};

export const getCategorias = async (emisorId: string | number) => {
    const response = await api.get(`${BASE_INVENTORY_URL}/${emisorId}/categorias`);
    const d = response.data;
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.data)) return d.data;
    return [];
};

export const createCategoria = async (emisorId: string | number, data: { nombre: string; descripcion?: string; estado?: boolean; color?: string }) => {
    const response = await api.post(`${BASE_INVENTORY_URL}/${emisorId}/categorias`, data);
    return response.data.data;
};

export const updateCategoria = async (emisorId: string | number, id: number, data: { nombre: string; descripcion?: string; estado?: boolean; color?: string }) => {
    const response = await api.put(`${BASE_INVENTORY_URL}/${emisorId}/categorias/${id}`, data);
    return response.data.data;
};

export const deleteCategoria = async (emisorId: string | number, id: number) => {
    const response = await api.delete(`${BASE_INVENTORY_URL}/${emisorId}/categorias/${id}`);
    return response.data;
};

export const getStockParametros = async (emisorId: string | number) => {
    const response = await api.get(`${BASE_INVENTORY_URL}/${emisorId}/stock-parametros`);
    const d = response.data;
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.data)) return d.data;
    return [];
};

export const saveStockParametro = async (emisorId: string | number, data: any) => {
    const response = await api.post(`${BASE_INVENTORY_URL}/${emisorId}/stock-parametros`, data);
    return response.data.data;
};

export const deleteStockParametro = async (emisorId: string | number, id: number) => {
    const response = await api.delete(`${BASE_INVENTORY_URL}/${emisorId}/stock-parametros/${id}`);
    return response.data;
};

export const updateProducto = async (emisorId: string | number, id: number | string, data: Partial<Producto>): Promise<Producto> => {
    const response = await api.put(`${BASE_INVENTORY_URL}/${emisorId}/productos/${id}`, data);
    return response.data.data;
};

export const deleteProducto = async (emisorId: string | number, id: number | string) => {
    const response = await api.delete(`${BASE_INVENTORY_URL}/${emisorId}/productos/${id}`);
    return response.data;
};

export const getMotivosMovimiento = async (emisorId: string | number, tipoMovimiento?: string, forceRefresh = false): Promise<MotivoMovimiento[]> => {
    const key = `${emisorId}_${tipoMovimiento || 'ALL'}`;
    const now = Date.now();
    if (!forceRefresh && motivosCache[key] && (now - motivosCache[key].timestamp < CACHE_TTL)) {
        return motivosCache[key].data;
    }
    const params = tipoMovimiento ? { tipo_movimiento: tipoMovimiento } : {};
    const response = await api.get(`${BASE_INVENTORY_URL}/${emisorId}/motivos-movimiento`, { params });
    const d = response.data;
    const result = Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []);
    motivosCache[key] = { data: result, timestamp: now };
    return result;
};

export const enviarMermas = async (emisorId: string | number, payload: any) => {
    const response = await api.post(`${BASE_INVENTORY_URL}/${emisorId}/movimientos/mermas`, payload);
    return response.data;
};
