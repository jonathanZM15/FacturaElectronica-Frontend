/**
 * Utilidades de navegación entre entidades del sistema
 */

/**
 * Navega al detalle de un emisor
 */
export const navigateToEmisor = (emisorId: number | string) => {
  window.location.href = `/emisores/${emisorId}`;
};

/**
 * Navega al detalle de un establecimiento
 */
export const navigateToEstablecimiento = (
  emisorId: number | string,
  establecimientoId: number | string
) => {
  window.location.href = `/emisores/${emisorId}/establecimientos/${establecimientoId}`;
};

/**
 * Navega al detalle de un punto de emisión
 */
export const navigateToPuntoEmision = (
  emisorId: number | string,
  establecimientoId: number | string,
  puntoEmisionId: number | string
) => {
  window.location.href = `/emisores/${emisorId}/establecimientos/${establecimientoId}/puntos/${puntoEmisionId}`;
};

/**
 * Navega al detalle de un usuario
 */
export const navigateToUsuario = (usuarioId: number | string) => {
  console.log('Navegar a usuario:', usuarioId);
  // TODO: Implementar navegación
  // window.location.href = `/usuarios/${usuarioId}`;
};

/**
 * Abre el detalle de un usuario en modal
 */
export const openUsuarioDetail = (
  usuario: any,
  setSelectedUser: (user: any) => void,
  setOpenDetail: (open: boolean) => void
) => {
  setSelectedUser(usuario);
  setOpenDetail(true);
};

/**
 * Formatea información del emisor para mostrar
 */
export const formatEmisorInfo = (ruc?: string, razonSocial?: string): string => {
  if (!ruc && !razonSocial) return '—';
  return `${ruc || '—'} – ${razonSocial || '—'}`;
};

/**
 * Formatea información del establecimiento para mostrar
 */
export const formatEstablecimientoInfo = (codigo?: string, nombre?: string): string => {
  if (!codigo && !nombre) return '—';
  return `${codigo || '—'} – ${nombre || '—'}`;
};

/**
 * Formatea información del punto de emisión para mostrar
 */
export const formatPuntoEmisionInfo = (
  codigo?: string,
  nombre?: string
): string => {
  if (!codigo && !nombre) return '—';
  return `${codigo || '—'} – ${nombre || '—'}`;
};

/**
 * Formatea información del usuario creador
 */
export const formatCreadorInfo = (
  role?: string,
  username?: string,
  nombres?: string,
  apellidos?: string
): string => {
  // Solo mostrar el username del creador para evitar ruido visual
  return username || '—';
};

/**
 * Determina si se debe mostrar el usuario creador
 */
export const shouldShowCreador = (creadorRole?: string): boolean => {
  return !!creadorRole;
};
