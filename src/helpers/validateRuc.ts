/**
 * Valida identificación ecuatoriana (Cédula y RUC) según normativa oficial del SRI / Registro Civil
 * y en concordancia exacta con App\Services\EcuadorIdentificationValidator en el Backend.
 */

export function validateCedulaEcuador(input: string): boolean {
  if (!input) return false;
  const cedula = input.replace(/\D/g, '');
  if (cedula.length !== 10) return false;

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
  const ruc = input.replace(/\D/g, '');

  if (allowCedula && ruc.length === 10) {
    return validateCedulaEcuador(ruc);
  }

  if (ruc.length !== 13) return false;

  const province = parseInt(ruc.substring(0, 2), 10);
  if ((province < 1 || province > 24) && province !== 30) return false;

  const thirdDigit = parseInt(ruc.charAt(2), 10);

  // Persona natural (tercer dígito 0-5)
  if (thirdDigit >= 0 && thirdDigit <= 5) {
    if (!validateCedulaEcuador(ruc.substring(0, 10))) return false;
    return ruc.substring(10, 13) === '001';
  }

  // Sociedad pública (tercer dígito 6)
  if (thirdDigit === 6) {
    return validateRucSociedadPublica(ruc);
  }

  // Sociedad privada / Extranjeros sin cédula (tercer dígito 9)
  if (thirdDigit === 9) {
    return validateRucSociedadPrivada(ruc);
  }

  return false;
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
  const normalizedTipo = tipo.toUpperCase().trim();

  if (!cleanId) {
    return { valid: false, message: 'La identificación es requerida.' };
  }

  if (normalizedTipo === 'CONSUMIDOR_FINAL' || cleanId === '9999999999999') {
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
      return { valid: false, message: 'RUC no válido según las reglas del SRI.' };
    }
    return { valid: true };
  }

  if (normalizedTipo === 'PASAPORTE' || normalizedTipo === 'IDENTIFICACION_EXTERIOR') {
    if (cleanId.length > 13) {
      return { valid: false, message: 'Máximo 13 caracteres para esta identificación.' };
    }
    if (!/^[A-Za-z0-9._-]+$/.test(cleanId)) {
      return { valid: false, message: 'Caracteres no permitidos en el documento.' };
    }
    return { valid: true };
  }

  return { valid: false, message: `Tipo de identificación '${tipo}' no soportado.` };
}
