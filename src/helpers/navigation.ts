/**
 * Utilidades de navegación entre entidades del sistema
 */

/**
 * Navega al detalle de un emisor
 */
export const navigateToEmisor = (emisorId: number | string) => {
  // TODO: Implementar navegación cuando se cree la página de detalle de emisor
  console.log('Navegar a emisor:', emisorId);
  // En el futuro: window.location.href = `/emisores/${emisorId}`;
  // O mejor con React Router: navigate(`/emisores/${emisorId}`);
};

/**
 * Navega al detalle de un establecimiento
 */
export const navigateToEstablecimiento = (
  emisorId: number | string,
  establecimientoId: number | string
) => {
  console.log('Navegar a establecimiento:', { emisorId, establecimientoId });
  // TODO: Implementar navegación
  // window.location.href = `/emisores/${emisorId}/establecimientos/${establecimientoId}`;
};

/**
 * Navega al detalle de un punto de emisión
 */
export const navigateToPuntoEmision = (
  emisorId: number | string,
  establecimientoId: number | string,
  puntoEmisionId: number | string
) => {
  console.log('Navegar a punto de emisión:', { emisorId, establecimientoId, puntoEmisionId });
  // TODO: Implementar navegación
  // window.location.href = `/emisores/${emisorId}/establecimientos/${establecimientoId}/puntos/${puntoEmisionId}`;
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
  codigoEst?: string,
  codigo?: string,
  nombre?: string
): string => {
  if (!codigo && !nombre) return '—';
  return `${codigoEst || '—'} – ${codigo || '—'} – ${nombre || '—'}`;
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
  if (!username) return '—';
  return `${(role || '').toUpperCase()} – ${username || ''} – ${nombres || ''} ${apellidos || ''}`.trim();
};

/**
 * Determina si se debe mostrar el usuario creador
 * No se muestra si el creador es Admin o Distribuidor
 */
export const shouldShowCreador = (creadorRole?: string): boolean => {
  if (!creadorRole) return false;
  const role = creadorRole.toLowerCase();
  return role !== 'administrador' && role !== 'distribuidor';
};
