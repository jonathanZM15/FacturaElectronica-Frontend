import re

file_path = r"C:\Users\CompuStore\Desktop\dos sistemas\tesis\FacturaElectronica-Frontend\src\components\inventory\EnvioMermasForm.tsx"
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the first select (origenId)
content = content.replace(
    "<option value=\"\">{loadingData ? '⏳ Cargando bodegas...' : 'Seleccione bodega de mermas...'}</option>",
    "<option value=\"\">{loadingData ? '⏳ Cargando bodegas...' : 'Seleccione bodega origen...'}</option>",
    1
)

content = content.replace(
    """                            {!loadingData && bodegasMermas.length === 0 && (
                                <div style={{ fontSize: '0.8rem', color: '#dc2626', marginTop: '4px' }}>
                                    No hay bodegas de tipo MERMAS configuradas para este emisor.
                                </div>
                            )}""",
    ""
)

# Fix the second select (destinoId)
content = content.replace(
    "<option value=\"\">{loadingData ? '⏳ Cargando bodegas...' : 'Seleccione bodega de destino apta...'}</option>",
    "<option value=\"\">{loadingData ? '⏳ Cargando bodegas...' : 'Seleccione bodega de mermas...'}</option>"
)

content = content.replace(
    """                            <select 
                                required 
                                disabled={loadingData}
                                value={destinoId} 
                                onChange={e => setDestinoId(Number(e.target.value) || '')} 
                                style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '0.95rem', outline: 'none', backgroundColor: loadingData ? '#f1f5f9' : 'white', color: '#0f172a', cursor: loadingData ? 'wait' : 'pointer' }}
                            >
                                <option value="">{loadingData ? '⏳ Cargando bodegas...' : 'Seleccione bodega de mermas...'}</option>
                                {!loadingData && bodegasNormales.map(b => (
                                    <option key={b.id} value={b.id}>{b.nombre} ({b.tipo})</option>
                                ))}
                            </select>""",
    """                            <select 
                                required 
                                disabled={loadingData}
                                value={destinoId} 
                                onChange={e => setDestinoId(Number(e.target.value) || '')} 
                                style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '0.95rem', outline: 'none', backgroundColor: loadingData ? '#f1f5f9' : 'white', color: '#0f172a', cursor: loadingData ? 'wait' : 'pointer' }}
                            >
                                <option value="">{loadingData ? '⏳ Cargando bodegas...' : 'Seleccione bodega de mermas...'}</option>
                                {!loadingData && bodegasMermas.map(b => (
                                    <option key={b.id} value={b.id}>{b.nombre} ({b.tipo})</option>
                                ))}
                            </select>
                            {!loadingData && bodegasMermas.length === 0 && (
                                <div style={{ fontSize: '0.8rem', color: '#dc2626', marginTop: '4px' }}>
                                    No hay bodegas de tipo MERMAS configuradas para este emisor.
                                </div>
                            )}"""
)

# Fix MotivoSelect
content = content.replace("MOV_12_REACONDICIONAMIENTO_MERMAS", "MOV_11_ENVIO_MERMAS")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed EnvioMermasForm")
