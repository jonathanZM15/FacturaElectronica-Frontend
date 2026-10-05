import os
import re

frontend_path = r"C:\Users\CompuStore\Desktop\dos sistemas\tesis\FacturaElectronica-Frontend\src\pages"

def refactor_for_embed(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Make component accept isEmbedded
    content = re.sub(r'const (\w+)Page: React\.FC = \(\) => \{', r'const \1Page: React.FC<{isEmbedded?: boolean}> = ({ isEmbedded }) => {', content)
    
    # Only remove main padding if embedded
    content = content.replace("style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}", "style={isEmbedded ? { fontFamily: 'Inter, sans-serif' } : { padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}")
    
    # Hide the Title but keep the top right controls if embedded
    # Originally: 
    # <div>
    #   <h1 ...>Directorio de ...</h1>
    #   <p ...>Gestiona ...</p>
    # </div>
    # Let's hide this part if isEmbedded
    content = re.sub(
        r'<div>\s*<h1[^>]*>Directorio de [^<]+</h1>\s*<p[^>]*>Gestiona [^<]+</p>\s*</div>',
        r'<div style={{ display: isEmbedded ? "none" : "block" }}>\n          <h1 style={{ fontSize: "24px", margin: "0 0 8px 0", color: "#1e293b" }}>Directorio</h1>\n          <p style={{ margin: 0, color: "#64748b" }}>Gestión.</p>\n        </div>',
        content
    )

    # In case my previous powershell ruined the flex div, let's fix it
    content = content.replace("alignItems: 'center', display: isEmbedded ? 'none' : 'flex' }}", "alignItems: 'center' }}")
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

refactor_for_embed(os.path.join(frontend_path, "Clientes", "ClientesPage.tsx"))
refactor_for_embed(os.path.join(frontend_path, "Proveedores", "ProveedoresPage.tsx"))

print("Refactored for embed")
