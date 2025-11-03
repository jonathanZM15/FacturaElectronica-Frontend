// Interfaces compartidas del proyecto (frontend)
// Estas interfaces están pensadas para cubrir los modelos usados en autenticación,
// manejo de usuarios, notificaciones y respuestas de API. Comentarios en español
// para facilitar su uso en el código existente.

/**
 * Representa un usuario en el sistema
 */
export interface User {
  id?: number | string;
  username: string;
  email?: string;
  fullName?: string;
  role?: string;
  avatarUrl?: string;
  isActive?: boolean;
  createdAt?: string; // ISO date
  updatedAt?: string; // ISO date
}

/**
 * Credenciales utilizadas para iniciar sesión
 */
export interface AuthCredentials {
  username: string;
  password: string;
}

/**
 * Respuesta esperada al autenticarse
 */
export interface AuthResponse {
  token: string;
  refreshToken?: string;
  user: User;
  expiresIn?: number; // segundos
}

/**
 * Forma estándar de errores retornados por la API
 */
export interface ApiError {
  message: string;
  code?: number;
  // Validación u otros errores por campo
  errors?: Record<string, string[] | string>;
}

/**
 * Notificaciones que muestra la UI (según imágenes: éxito, error, info)
 */
export interface Notification {
  id?: string | number;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  visible?: boolean;
  // duración en ms (ej. 4000)
  duration?: number;
  // icono opcional (nombre de clase o url)
  icon?: string;
}

/**
 * Request para solicitar recuperación de contraseña
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * Payload para actualizar la contraseña (cambio desde enlace o desde panel)
 */
export interface PasswordUpdate {
  password: string;
  password_confirmation?: string;
  token?: string; // token de restablecimiento si aplica
}

/**
 * Tipo usado por el contexto de usuario (userContext)
 */
export interface UserContextType {
  user?: User | null;
  setUser?: (user: User | null) => void;
}

/**
 * Tipo usado por el contexto de autenticación (AuthContext)
 */
export interface AuthContextType {
  isAuthenticated: boolean;
  user?: User | null;
  login: (credentials: AuthCredentials) => Promise<AuthResponse | void>;
  logout: () => void;
  loading?: boolean;
  error?: ApiError | null;
}

/**
 * Respuesta paginada genérica de la API
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta?: {
    total?: number;
    per_page?: number;
    current_page?: number;
    last_page?: number;
  };
}

/**
 * Emisor (Company/Tenant) visible en la pantalla de Emisores
 * Incluye campos base y otros opcionales que el backend podría enviar
 */
export interface Emisor {
  id: number | string;
  ruc: string;
  razon_social: string;

  estado?: string;
  tipo_plan?: string;
  fecha_inicio_plan?: string;
  fecha_fin_plan?: string;
  cantidad_creados?: number;
  cantidad_restantes?: number;

  nombre_comercial?: string;
  direccion_matriz?: string;
  correo_remitente?: string;
  logo_url?: string;
  regimen_tributario?: string;

  obligado_contabilidad?: string; // "SI" | "NO"
  contribuyente_especial?: string; // "SI" | "NO"
  agente_retencion?: string; // "SI" | "NO"
  codigo_artesano?: string;
  tipo_persona?: string; // Natural | Jurídica
  ambiente?: string; // Producción | Pruebas
  tipo_emision?: string; // Normal | Indisponibilidad

  fecha_creacion?: string;
  fecha_actualizacion?: string;
  registrador?: string;
  ultimo_login?: string;
  ultimo_comprobante?: string;
}

// Export por defecto opcional (no obligatorio, se prefieren exports nombrados)
export default {
  // sólo para permitir importación rápida si alguien lo desea
};
