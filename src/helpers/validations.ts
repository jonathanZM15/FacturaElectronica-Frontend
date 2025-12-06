/**
 * Validaciones de datos para formularios
 */

/**
 * Valida una cédula ecuatoriana (10 dígitos)
 * Verifica el dígito verificador según el algoritmo oficial
 */
export const validateCedulaEcuatoriana = (cedula: string): { valid: boolean; error?: string } => {
  // Debe tener exactamente 10 dígitos
  if (!cedula || cedula.length !== 10) {
    return { valid: false, error: 'La cédula debe tener exactamente 10 dígitos' };
  }

  // Verificar que solo contenga números
  if (!/^\d{10}$/.test(cedula)) {
    return { valid: false, error: 'La cédula debe contener solo números' };
  }

  // Los dos primeros dígitos deben estar entre 01 y 24 (provincias válidas)
  const provincia = parseInt(cedula.substring(0, 2), 10);
  if (provincia < 1 || provincia > 24) {
    return { valid: false, error: 'Los dos primeros dígitos deben corresponder a una provincia válida (01-24)' };
  }

  // El tercer dígito debe ser menor a 6 (cédulas de personas naturales)
  const tercerDigito = parseInt(cedula.charAt(2), 10);
  if (tercerDigito >= 6) {
    return { valid: false, error: 'El tercer dígito debe ser menor a 6 (cédula de persona natural)' };
  }

  // Validación del dígito verificador (último dígito)
  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;

  for (let i = 0; i < 9; i++) {
    let valor = parseInt(cedula.charAt(i), 10) * coeficientes[i];
    if (valor >= 10) {
      valor -= 9;
    }
    suma += valor;
  }

  const digitoVerificador = parseInt(cedula.charAt(9), 10);
  const residuo = suma % 10;
  const resultado = residuo === 0 ? 0 : 10 - residuo;

  if (resultado !== digitoVerificador) {
    return { valid: false, error: 'Cédula inválida: el dígito verificador no es correcto' };
  }

  return { valid: true };
};

/**
 * Valida formato de email más estricto
 */
export const validateEmail = (email: string): { valid: boolean; error?: string } => {
  if (!email) {
    return { valid: false, error: 'El email es requerido' };
  }

  // Expresión regular más estricta para email
  const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Formato de email inválido' };
  }

  // Validaciones adicionales
  if (email.length > 255) {
    return { valid: false, error: 'El email es demasiado largo (máx. 255 caracteres)' };
  }

  // No permitir múltiples puntos consecutivos
  if (email.includes('..')) {
    return { valid: false, error: 'Email inválido: no se permiten puntos consecutivos' };
  }

  // Verificar que el dominio tenga al menos un punto
  const [, domain] = email.split('@');
  if (!domain || !domain.includes('.')) {
    return { valid: false, error: 'El dominio del email debe incluir un punto' };
  }

  return { valid: true };
};

/**
 * Valida username
 */
export const validateUsername = (username: string): { valid: boolean; error?: string } => {
  if (!username) {
    return { valid: false, error: 'El username es requerido' };
  }

  if (username.length < 4) {
    return { valid: false, error: 'El username debe tener al menos 4 caracteres' };
  }

  if (username.length > 50) {
    return { valid: false, error: 'El username es demasiado largo (máx. 50 caracteres)' };
  }

  // Solo permitir letras, números, guiones y guiones bajos
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return { valid: false, error: 'Solo se permiten letras, números, guiones y guiones bajos' };
  }

  return { valid: true };
};

/**
 * Valida nombres y apellidos
 */
export const validateNombre = (nombre: string, field: 'nombres' | 'apellidos'): { valid: boolean; error?: string } => {
  if (!nombre) {
    return { valid: false, error: `${field === 'nombres' ? 'Los nombres son' : 'Los apellidos son'} requeridos` };
  }

  if (nombre.length < 3) {
    return { valid: false, error: `${field === 'nombres' ? 'Los nombres deben' : 'Los apellidos deben'} tener al menos 3 caracteres` };
  }

  if (nombre.length > 100) {
    return { valid: false, error: `${field === 'nombres' ? 'Los nombres son' : 'Los apellidos son'} demasiado largos (máx. 100 caracteres)` };
  }

  // Solo permitir letras, espacios, guiones y apóstrofes
  if (!/^[a-záéíóúñA-ZÁÉÍÓÚÑ\s'-]+$/.test(nombre)) {
    return { valid: false, error: 'Solo se permiten caracteres alfabéticos, espacios, guiones y apóstrofes' };
  }

  return { valid: true };
};
