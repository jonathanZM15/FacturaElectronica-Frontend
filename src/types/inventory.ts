export enum TipoBodega {
    VENTA = 'VENTA',
    ALMACEN = 'ALMACEN',
    EXHIBICION = 'EXHIBICION',
    MERMAS = 'MERMAS',
    TRANSITO = 'TRANSITO'
}

export enum TipoProducto {
    FISICO = 'FISICO',
    SERVICIO = 'SERVICIO'
}

export enum TipoControlInventario {
    SIN_CONTROL = 'SIN_CONTROL',
    CANTIDAD = 'CANTIDAD',
    LOTE = 'LOTE',
    SERIE = 'SERIE'
}

export enum TipoEntrega {
    INMEDIATA = 'INMEDIATA',
    DESPACHO = 'DESPACHO'
}

export enum TipoBodegaSalida {
    VENTA = 'VENTA',
    ALMACEN = 'ALMACEN'
}

export interface Bodega {
    id: number;
    emisor_id: number;
    nombre: string;
    tipo: TipoBodega;
    creador?: {
        id: number;
        name: string;
    };
    created_at?: string;
    updated_at?: string;
}

export interface StockInicialLote {
    codigo_lote: string;
    cantidad_lote: number;
    fecha_vencimiento: string; // YYYY-MM-DD
    costo_unitario?: number;
}

export interface StockInicialSerie {
    numero_serie: string;
    costo_unitario?: number;
}

export interface StockInicialPayload {
    bodega_destino_id?: number;
    cantidad?: number;
    costo_unitario?: number;
    lotes?: StockInicialLote[];
    series?: StockInicialSerie[];
}

export interface Producto {
    id?: number;
    emisor_id?: number;
    codigo: string;
    codigo_auxiliar?: string;
    nombre: string;
    descripcion?: string;
    foto?: string;
    
    precio_1: number;
    precio_2?: number;
    precio_3?: number;
    precio_por_defecto: number;
    
    tipo_iva: string;
    impuesto_ice: boolean;
    porcentaje_ice?: number;
    irbpnr?: number;
    
    tipo: TipoProducto;
    tipo_control_inventario: TipoControlInventario;
    permite_venta: boolean;
    permite_compra: boolean;
    uso_interno: boolean;
    permite_exhibicion: boolean;
    categoria_id?: number;
    
    unidad_medida?: string;
    subsidio_unitario?: number;
    ubicacion_referencial?: string;
    
    seleccionable_venta_suspendida?: boolean;
    tipo_entrega?: TipoEntrega;
    tipo_bodega_salida?: TipoBodegaSalida;
    requiere_preparacion?: boolean;
    seleccion_avanzada_bodega_salida?: boolean;
    permite_devolucion?: boolean;
    tiempo_garantia_devolucion?: number;
    
    stock_inicial?: StockInicialPayload;
}

export enum TipoMovimientoInventario {
    INGRESO_INICIAL = 'INGRESO_INICIAL',
    TRANSFERENCIA_INTERNA = 'TRANSFERENCIA_INTERNA',
    AJUSTE_POSITIVO = 'AJUSTE_POSITIVO',
    AJUSTE_NEGATIVO = 'AJUSTE_NEGATIVO',
    MERMA = 'MERMA'
}

export interface MovimientoInventarioDetalle {
    id: number;
    movimiento_id: number;
    producto_id: number;
    cantidad: number;
    codigo_lote?: string;
    numero_serie?: string;
    costo_unitario?: number;
    created_at: string;
    producto?: Producto;
    movimiento?: MovimientoInventario;
}

export interface MovimientoInventario {
    id: number;
    emisor_id: number;
    bodega_origen_id?: number;
    bodega_destino_id?: number;
    tipo_movimiento: TipoMovimientoInventario;
    estado: string;
    observacion?: string;
    usuario_id?: number;
    created_at: string;
    origen?: Bodega;
    destino?: Bodega;
    detalles?: MovimientoInventarioDetalle[];
}

export enum BaseComparacionStock {
    FISICO = 'FISICO',
    DISPONIBLE = 'DISPONIBLE'
}

export interface StockParametro {
    id: number;
    producto_id: number;
    bodega_id: number;
    stock_minimo?: number;
    stock_maximo?: number;
    base_comparacion: BaseComparacionStock;
    activo: boolean;
    observacion?: string;
    stock_fisico: number;
    stock_disponible: number;
    stock_reservado: number;
    producto?: { id: number; nombre: string; codigo: string };
    bodega?: { id: number; nombre: string; tipo: TipoBodega };
}

export interface TransferenciaPayload {
    bodega_origen_id: number;
    bodega_destino_id: number;
    observacion?: string;
    detalles: { producto_id: number; cantidad: number }[];
}

export interface AjustePayload {
    bodega_id: number;
    tipo: 'AJUSTE_POSITIVO' | 'AJUSTE_NEGATIVO';
    observacion: string;
    detalles: { producto_id: number; cantidad: number }[];
}

export interface Categoria {
    id: number;
    emisor_id: number;
    nombre: string;
    descripcion?: string;
    estado?: boolean;
    color?: string;
    created_at: string;
    productos_count?: number;
}
