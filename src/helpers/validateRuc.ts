export function validateRucEcuador(input: string): boolean {
  if (!input) return false;
  const ruc = input.replace(/\D/g, '');
  const len = ruc.length;
  if (len < 10) return false;

  const third = parseInt(ruc.charAt(2), 10);
  if (!Number.isFinite(third)) return false;

  const validateCedula = (cedula: string) => {
    if (cedula.length !== 10) return false;
    if (!/^\d{10}$/.test(cedula)) return false;
    const province = parseInt(cedula.slice(0, 2), 10);
    if (province < 1 || province > 24) return false;
    const coeff = [2,1,2,1,2,1,2,1,2];
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

  const validatePrivate = (r: string) => {
    if (!/^\d{10,13}$/.test(r)) return false;
    const coeff = [4,3,2,7,6,5,4,3,2];
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(r.charAt(i), 10) * coeff[i];
    const mod = sum % 11;
    const check = mod === 0 ? 0 : 11 - mod;
    if (check === 10) return false;
    if (check !== parseInt(r.charAt(9), 10)) return false;
    if (r.length === 13) {
      const suffix = parseInt(r.slice(10, 13), 10);
      return suffix > 0;
    }
    return true;
  };

  const validatePublic = (r: string) => {
    if (!/^\d{9,13}$/.test(r)) return false;
    const coeff = [3,2,7,6,5,4,3,2];
    let sum = 0;
    for (let i = 0; i < 8; i++) sum += parseInt(r.charAt(i), 10) * coeff[i];
    const mod = sum % 11;
    const check = mod === 0 ? 0 : 11 - mod;
    if (check === 10) return false;
    if (check !== parseInt(r.charAt(8), 10)) return false;
    if (r.length === 13) {
      const suffix = parseInt(r.slice(9, 13), 10);
      return suffix > 0;
    }
    return true;
  };

  if (third >= 0 && third < 6) {
    const ced = ruc.slice(0, 10);
    if (!validateCedula(ced)) return false;
    if (len === 10) return true;
    if (len === 13) {
      const suffix = parseInt(ruc.slice(10, 13), 10);
      return suffix > 0;
    }
    return false;
  }

  if (third === 6) return validatePublic(ruc);
  if (third === 9) return validatePrivate(ruc);

  return false;
}
