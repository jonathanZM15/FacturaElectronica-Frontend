/**
 * Valida RUC según formato oficial del SRI Ecuador
 * 
 * Formatos válidos:
 * 1. Personas naturales ecuatorianas y extranjeros residentes:
 *    - [Cédula 10 dígitos] + 001
 *    - Tercer dígito: 0-5
 * 
 * 2. Sociedades privadas y extranjeros no residentes (sin cédula):
 *    - [Código provincia (2)] + 9 + [Dígitos consecutivos (7)] + 001
 *    - Tercer dígito: 9
 * 
 * 3. Sociedades públicas:
 *    - [Código provincia (2)] + [6 o 9] + [Dígitos consecutivos] + 0001
 *    - Tercer dígito: 6 o 9
 */
export function validateRucEcuador(input: string): boolean {
  if (!input) return false;
  
  // Limpiar y validar solo dígitos
  const ruc = input.replace(/\D/g, '');
  
  // Debe tener exactamente 13 dígitos
  if (ruc.length !== 13) return false;
  
  // Validar código de provincia (01-24)
  const province = parseInt(ruc.substring(0, 2), 10);
  if (province < 1 || province > 24) return false;
  
  const thirdDigit = parseInt(ruc.charAt(2), 10);
  
  // Función para validar cédula (primeros 10 dígitos de persona natural)
  const validateCedula = (cedula: string): boolean => {
    if (cedula.length !== 10) return false;
    
    const tercerDigito = parseInt(cedula.charAt(2), 10);
    if (tercerDigito > 5) return false; // Persona natural: 0-5
    
    const coeff = [2, 1, 2, 1, 2, 1, 2, 1, 2];
    let sum = 0;
    
    for (let i = 0; i < 9; i++) {
      let v = parseInt(cedula.charAt(i), 10) * coeff[i];
      if (v >= 10) v -= 9;
      sum += v;
    }
    
    const mod = sum % 10;
    const check = mod === 0 ? 0 : 10 - mod;
    return check === parseInt(cedula.charAt(9), 10);
  };
  
  // Función para validar RUC de sociedad privada (tercer dígito = 9)
  const validatePrivateCompany = (r: string): boolean => {
    if (r.length !== 13) return false;
    
    // Tercer dígito debe ser 9
    if (r.charAt(2) !== '9') return false;
    
    // Los últimos 3 dígitos deben ser 001
    if (r.substring(10) !== '001') return false;
    
    const coeff = [4, 3, 2, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    
    for (let i = 0; i < 9; i++) {
      sum += parseInt(r.charAt(i), 10) * coeff[i];
    }
    
    const mod = sum % 11;
    const check = mod === 0 ? 0 : 11 - mod;
    
    // Si el dígito verificador es 10, el RUC es inválido
    if (check === 10) return false;
    
    return check === parseInt(r.charAt(9), 10);
  };
  
  // Función para validar RUC de sociedad pública (tercer dígito = 6 o 9)
  const validatePublicCompany = (r: string): boolean => {
    if (r.length !== 13) return false;
    
    // Tercer dígito debe ser 6 o 9
    const tercerDigito = r.charAt(2);
    if (tercerDigito !== '6' && tercerDigito !== '9') return false;
    
    // Los últimos 4 dígitos deben ser 0001
    if (r.substring(9) !== '0001') return false;
    
    const coeff = [3, 2, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    
    for (let i = 0; i < 8; i++) {
      sum += parseInt(r.charAt(i), 10) * coeff[i];
    }
    
    const mod = sum % 11;
    const check = mod === 0 ? 0 : 11 - mod;
    
    // Si el dígito verificador es 10, el RUC es inválido
    if (check === 10) return false;
    
    return check === parseInt(r.charAt(8), 10);
  };
  
  // Personas naturales ecuatorianas y extranjeros residentes (tercer dígito 0-5)
  if (thirdDigit >= 0 && thirdDigit <= 5) {
    // Los primeros 10 dígitos deben formar una cédula válida
    const cedula = ruc.substring(0, 10);
    if (!validateCedula(cedula)) return false;
    
    // Los últimos 3 dígitos deben ser 001
    return ruc.substring(10) === '001';
  }
  
  // Sociedades públicas (tercer dígito 6)
  if (thirdDigit === 6) {
    return validatePublicCompany(ruc);
  }
  
  // Sociedades privadas y extranjeros no residentes (tercer dígito 9)
  if (thirdDigit === 9) {
    // Verificar si es sociedad privada (termina en 001) o sociedad pública (termina en 0001)
    if (ruc.substring(10) === '001') {
      return validatePrivateCompany(ruc);
    } else if (ruc.substring(9) === '0001') {
      return validatePublicCompany(ruc);
    }
    return false;
  }
  
  // Tercer dígito no válido (7, 8 no están permitidos)
  return false;
}

/**
 * Obtiene el tipo de RUC según el formato
 */
export function getTipoRuc(ruc: string): string {
  if (!ruc || ruc.length !== 13) return 'Inválido';
  
  const thirdDigit = parseInt(ruc.charAt(2), 10);
  
  if (thirdDigit >= 0 && thirdDigit <= 5) {
    return 'Persona Natural';
  }
  
  if (thirdDigit === 6) {
    return 'Sociedad Pública';
  }
  
  if (thirdDigit === 9) {
    if (ruc.substring(10) === '001') {
      return 'Sociedad Privada';
    } else if (ruc.substring(9) === '0001') {
      return 'Sociedad Pública';
    }
  }
  
  return 'Inválido';
}
