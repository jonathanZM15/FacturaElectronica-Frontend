import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function StockSelection({ emisorId, bodegaId, item, onChange }: { emisorId: string | number; bodegaId: string; item: any; onChange: (changes: any) => void }) {
  const serial = item.tipo_control_inventario === 'SERIE';
  const [rows, setRows] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!bodegaId) { setRows([]); return; }
    let active = true;
    const params = { producto_id: item.id, bodega_id: bodegaId, page, ...(serial ? { estado: 'DISPONIBLE', numero_serie: query } : { numero_lote: query, solo_con_stock: true }) };
    api.get(`/api/emisores/${emisorId}/existencias/${serial ? 'series' : 'lotes'}`, { params }).then(res => {
      if (active) { setRows(res.data.data || []); setLastPage(res.data.last_page || 1); setError(''); }
    }).catch(() => { if (active) setError('No se pudo consultar el inventario detallado.'); });
    return () => { active = false; };
  }, [emisorId, bodegaId, item.id, serial, page, query]);
  if (!bodegaId) return <p>Selecciona una bodega para elegir {serial ? 'series' : 'lotes'}.</p>;
  return <div className="v1-stock-selection">
    <strong>{serial ? 'Seleccionar series disponibles' : 'Elegir cantidades por lote'}</strong>
    <div className="v1-actions"><input aria-label={`Buscar ${serial ? 'serie' : 'lote'} de ${item.nombre}`} value={search} onChange={e => setSearch(e.target.value)} /><button type="button" onClick={() => { setPage(1); setQuery(search); }}>Buscar</button></div>
    {error && <p role="alert">{error}</p>}
    {rows.map(row => {
      const name = serial ? row.numero_serie : row.lote?.numero_lote;
      if (serial) return <label key={row.id}><input type="checkbox" checked={(item.series || []).some((s: any) => s.numero_serie === name)} onChange={e => {
        const selected = e.target.checked ? [...(item.series || []), { numero_serie: name }] : (item.series || []).filter((s: any) => s.numero_serie !== name);
        onChange({ series: selected, qty: selected.length });
      }} /> {name}</label>;
      return <label key={row.id}>{name} — Disponible {Number(row.stock_disponible)}<input aria-label={`Cantidad lote ${name}`} type="number" min="0" max={Number(row.stock_disponible)} step="0.000001" value={(item.lotes || []).find((l: any) => l.numero_lote === name)?.cantidad || ''} onChange={e => {
        const quantity = Math.max(0, Number(e.target.value));
        const selected = [...(item.lotes || []).filter((l: any) => l.numero_lote !== name), ...(quantity > 0 ? [{ numero_lote: name, cantidad: quantity }] : [])];
        onChange({ lotes: selected, qty: selected.reduce((sum: number, lot: any) => sum + lot.cantidad, 0) });
      }} /></label>;
    })}
    {!rows.length && !error && <p>Sin existencias disponibles para esta selección.</p>}
    <div className="v1-actions"><button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</button><span>{page} / {lastPage}</span><button disabled={page >= lastPage} onClick={() => setPage(p => p + 1)}>Siguiente</button></div>
  </div>;
}
