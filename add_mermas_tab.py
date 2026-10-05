import os
import re

file_path = r"C:\Users\CompuStore\Desktop\dos sistemas\tesis\FacturaElectronica-Frontend\src\pages\Inventario\MovimientosPage.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
content = content.replace(
    "import { ReacondicionarForm } from '../../components/inventory/ReacondicionarForm';",
    "import { ReacondicionarForm } from '../../components/inventory/ReacondicionarForm';\nimport { EnvioMermasForm } from '../../components/inventory/EnvioMermasForm';"
)

# Add state option
content = content.replace(
    "useState<'transferencia' | 'ajuste' | 'inicial' | 'reacondicionar'>('transferencia')",
    "useState<'transferencia' | 'ajuste' | 'inicial' | 'reacondicionar' | 'mermas'>('transferencia')"
)

# Add tab button
tab_btn = """
                        <button
                            onClick={() => setActiveTab('reacondicionar')}
                            style={{
                                padding: '12px 24px',
                                border: 'none',
                                background: activeTab === 'reacondicionar' ? 'white' : 'transparent',
                                color: activeTab === 'reacondicionar' ? '#ea580c' : '#64748b',
                                fontWeight: activeTab === 'reacondicionar' ? 600 : 500,
                                borderRadius: '10px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                boxShadow: activeTab === 'reacondicionar' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <span>🔧</span> Reacondicionar
                        </button>
                        <button
                            onClick={() => setActiveTab('mermas')}
                            style={{
                                padding: '12px 24px',
                                border: 'none',
                                background: activeTab === 'mermas' ? 'white' : 'transparent',
                                color: activeTab === 'mermas' ? '#dc2626' : '#64748b',
                                fontWeight: activeTab === 'mermas' ? 600 : 500,
                                borderRadius: '10px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                boxShadow: activeTab === 'mermas' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <span>🗑️</span> Envío a Mermas
                        </button>
"""
# Replace the original Reacondicionar button with BOTH
import re
content = re.sub(
    r"<button[^>]*onClick=\{\(\) => setActiveTab\('reacondicionar'\)\}[^>]*>.*?Reacondicionar\s*</button>",
    tab_btn.strip(),
    content,
    flags=re.DOTALL
)

# Add render component
render_comp = """
                        {activeTab === 'reacondicionar' && <ReacondicionarForm emisorId={emisorId} onSuccess={loadRecentKardex} />}
                        {activeTab === 'mermas' && <EnvioMermasForm emisorId={emisorId} onSuccess={loadRecentKardex} />}
"""
content = re.sub(
    r"\{activeTab === 'reacondicionar' && <ReacondicionarForm emisorId=\{emisorId\} onSuccess=\{loadRecentKardex\} />\}",
    render_comp.strip(),
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("MovimientosPage updated.")
