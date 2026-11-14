export const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function cartTotals(items: any[]) {
  let subtotal = 0;
  const groups: Record<string, { base: number; rate: number }> = {};
  for (const item of items) {
    const base = roundMoney(Number(item.precio_unitario) * Number(item.qty));
    if (!Number.isFinite(base)) throw new Error('Precio o cantidad inválidos.');
    subtotal += base;
    const key = String(item.impuesto?.id);
    groups[key] = groups[key] || { base: 0, rate: Number(item.impuesto?.valor_tarifa || 0) };
    groups[key].base += base;
  }
  const iva = roundMoney(Object.values(groups).reduce((sum, group) => sum + roundMoney(group.base * group.rate / 100), 0));
  return { subtotal: roundMoney(subtotal), iva, total: roundMoney(subtotal + iva) };
}
