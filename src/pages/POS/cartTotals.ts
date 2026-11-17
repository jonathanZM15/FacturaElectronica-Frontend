import Decimal from 'decimal.js';

const Money = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
export const roundMoney = (value: number) => new Money(value).toDecimalPlaces(2).toNumber();
export function formatUnitPrice(value: number) {
  const [whole, fraction = ''] = new Money(value).toDecimalPlaces(6).toFixed().split('.');
  return `${whole}.${fraction.padEnd(2, '0')}`;
}

export function cartLineBase(item: any) {
  if (![item.precio_unitario, item.qty, item.descuento || 0].every(value => Number.isFinite(Number(value)))) throw new Error('Precio o cantidad inválidos.');
  const base = new Money(item.precio_unitario).times(item.qty).minus(item.descuento || 0).toDecimalPlaces(2);
  if (!base.isFinite() || base.isNegative()) throw new Error('Precio o cantidad inválidos.');
  return base;
}

export function cartTotals(items: any[]) {
  let subtotal = new Money(0);
  const groups: Record<string, { base: Decimal; rate: Decimal }> = {};
  for (const item of items) {
    const base = cartLineBase(item);
    subtotal = subtotal.plus(base);
    const key = String(item.impuesto?.id);
    groups[key] = groups[key] || { base: new Money(0), rate: new Money(item.impuesto?.valor_tarifa || 0) };
    groups[key].base = groups[key].base.plus(base);
  }
  const iva = Object.values(groups).reduce((sum, group) => sum.plus(group.base.times(group.rate).div(100).toDecimalPlaces(2)), new Money(0));
  return { subtotal: subtotal.toNumber(), iva: iva.toNumber(), total: subtotal.plus(iva).toNumber() };
}
