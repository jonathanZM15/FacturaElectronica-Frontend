/**
 * Checks identification format. A RUC format check does not establish SRI registration.
 * Corporate and foreign-person RUCs have no universal checksum requirement.
 */

export function validateCedulaEcuador(input: string): boolean {
  if (!input) return false;
  const cedula = input.trim();
  if (!/^[0-9]{10}$/.test(cedula)) return false;

  const province = parseInt(cedula.substring(0, 2), 10);
  if ((province < 1 || province > 24) && province !== 30) return false;

  const thirdDigit = parseInt(cedula.charAt(2), 10);
  if (thirdDigit >= 6) return false; // Persona natural: 0-5

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
}

export function validateRucSociedadPrivada(ruc: string): boolean {
  if (ruc.length !== 13) return false;
  if (ruc.charAt(2) !== '9') return false;
  if (ruc.substring(10, 13) !== '001') return false;

  const province = parseInt(ruc.substring(0, 2), 10);
  if ((province < 1 || province > 24) && province !== 30) return false;

  const coeff = [4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(ruc.charAt(i), 10) * coeff[i];
  }

  const mod = sum % 11;
  const check = mod === 0 ? 0 : 11 - mod;
  if (check === 10) return false;
  const checkDigit = check === 11 ? 0 : check;

  return checkDigit === parseInt(ruc.charAt(9), 10);
}

export function validateRucSociedadPublica(ruc: string): boolean {
  if (ruc.length !== 13) return false;
  if (ruc.charAt(2) !== '6') return false;
  if (ruc.substring(9, 13) !== '0001') return false;

  const province = parseInt(ruc.substring(0, 2), 10);
  if ((province < 1 || province > 24) && province !== 30) return false;

  const coeff = [3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += parseInt(ruc.charAt(i), 10) * coeff[i];
  }

  const mod = sum % 11;
  const check = mod === 0 ? 0 : 11 - mod;
  if (check === 10) return false;
  const checkDigit = check === 11 ? 0 : check;

  return checkDigit === parseInt(ruc.charAt(8), 10);
}

export function validateRucEcuador(input: string, allowCedula: boolean = false): boolean {
  if (!input) return false;
  const ruc = input.trim();

  if (allowCedula && ruc.length === 10) {
    return validateCedulaEcuador(ruc);
  }

  return /^[0-9]{13}$/.test(ruc) && ruc !== '0000000000000' && ruc !== '9999999999999';
}

export function normalizeClientIdentificationType(tipo: string): string {
  const value = tipo.toUpperCase().trim();
  return ({ '04': 'RUC', '05': 'CEDULA', '06': 'PASAPORTE', '07': 'CONSUMIDOR_FINAL', '08': 'IDENTIFICACION_EXTERIOR', EXTERIOR: 'IDENTIFICACION_EXTERIOR' } as Record<string, string>)[value] || value;
}

export function getTipoRuc(ruc: string): string {
  if (!ruc) return 'Inválido';
  const cleaned = ruc.replace(/\D/g, '');
  if (cleaned.length !== 13) return 'Inválido';

  const thirdDigit = parseInt(cleaned.charAt(2), 10);
  if (thirdDigit >= 0 && thirdDigit <= 5) {
    return 'Persona Natural';
  }
  if (thirdDigit === 6) {
    return 'Sociedad Pública';
  }
  if (thirdDigit === 9) {
    return 'Sociedad Privada';
  }
  return 'Inválido';
}

export function validateClientIdentification(
  tipo: string,
  id: string,
  totalVenta?: number
): { valid: boolean; message?: string } {
  const cleanId = id.trim();
  const normalizedTipo = normalizeClientIdentificationType(tipo);

  if (!cleanId) {
    return { valid: false, message: 'La identificación es requerida.' };
  }

  if (normalizedTipo === 'CONSUMIDOR_FINAL') {
    if (cleanId !== '9999999999999') {
      return { valid: false, message: 'Consumidor Final debe ser 9999999999999.' };
    }
    if (totalVenta !== undefined && totalVenta > 50.00) {
      return {
        valid: false,
        message: 'Por disposición del SRI, en facturas superiores a $50.00 no se admite Consumidor Final. Debe identificar al cliente.',
      };
    }
    return { valid: true };
  }

  if (normalizedTipo === 'CEDULA') {
    if (cleanId.length !== 10) {
      return { valid: false, message: `La cédula debe tener 10 dígitos (actual: ${cleanId.length}).` };
    }
    if (!validateCedulaEcuador(cleanId)) {
      return { valid: false, message: 'Cédula no válida según algoritmo del Registro Civil.' };
    }
    return { valid: true };
  }

  if (normalizedTipo === 'RUC') {
    if (cleanId.length !== 13) {
      return { valid: false, message: `El RUC debe tener 13 dígitos (actual: ${cleanId.length}).` };
    }
    if (!validateRucEcuador(cleanId)) {
      return { valid: false, message: 'El RUC debe contener 13 dígitos; la identificación de consumidor final no es un RUC.' };
    }
    return { valid: true };
  }

  if (normalizedTipo === 'PASAPORTE' || normalizedTipo === 'IDENTIFICACION_EXTERIOR') {
    if (cleanId.length > 20) {
      return { valid: false, message: 'Máximo 20 caracteres para esta identificación.' };
    }
    if (!/^[A-Za-z0-9._-]+$/.test(cleanId)) {
      return { valid: false, message: 'Caracteres no permitidos en el documento.' };
    }
    return { valid: true };
  }

  return { valid: false, message: `Tipo de identificación '${tipo}' no soportado.` };
}
