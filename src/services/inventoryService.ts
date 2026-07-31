import api from './api';
import { Bodega, Producto } from '../types/inventory';

const BASE_INVENTORY_URL = '/api/emisores';

export const getBodegas = async (emisorId: string | number): Promise<Bodega[]> => {
    const response = await api.get(`${BASE_INVENTORY_URL}/${emisorId}/bodegas`);
    return response.data.data;
};

export const createBodega = async (emisorId: string | number, data: Partial<Bodega>): Promise<Bodega> => {
    const response = await api.post(`${BASE_INVENTORY_URL}/${emisorId}/bodegas`, data);
    return response.data.data;
};

export const updateBodega = async (emisorId: string | number, id: number | string, data: Partial<Bodega>): Promise<Bodega> => {
    const response = await api.put(`${BASE_INVENTORY_URL}/${emisorId}/bodegas/${id}`, data);
    return response.data.data;
};

export const deleteBodega = async (emisorId: string | number, id: number | string) => {
    const response = await api.delete(`${BASE_INVENTORY_URL}/${emisorId}/bodegas/${id}`);
    return response.data;
};

export const getProductos = async (emisorId: string | number): Promise<Producto[]> => {
    const response = await api.get(`${BASE_INVENTORY_URL}/${emisorId}/productos`);
    return response.data.data;
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
    return response.data.data;
};

export const ajustarStock = async (emisorId: string | number, payload: any) => {
    const response = await api.post(`${BASE_INVENTORY_URL}/${emisorId}/movimientos/ajustar`, payload);
    return response.data.data;
};

export const getKardex = async (emisorId: string | number, page: number = 1, filters?: any) => {
    const params = { page, ...filters };
    const response = await api.get(`${BASE_INVENTORY_URL}/${emisorId}/movimientos/kardex`, { params });
    return response.data;
};

export const getCategorias = async (emisorId: string | number) => {
    const response = await api.get(`${BASE_INVENTORY_URL}/${emisorId}/categorias`);
    return response.data.data;
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
    return response.data.data;
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
