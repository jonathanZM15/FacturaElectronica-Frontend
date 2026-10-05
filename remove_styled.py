import re

filepath = r"C:\Users\CompuStore\Desktop\dos sistemas\tesis\FacturaElectronica-Frontend\src\pages\GuiaRemision\GuiaRemision.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove imports
content = content.replace("import styled from 'styled-components';\n", "")
content = content.replace("import { jsPDF } from 'jspdf';\n", "")
content = content.replace("import 'jspdf-autotable';\n", "")

# Replace styled components with plain div/tags with inline styles
replacements = {
    "<PageContainer>": '<div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto", fontFamily: "Inter, -apple-system, sans-serif" }}>',
    "</PageContainer>": '</div>',
    "<PageHeader>": '<div style={{ marginBottom: "32px" }}>',
    "</PageHeader>": '</div>',
    "<h1>": '<h1 style={{ fontSize: "24px", color: "#1e293b", margin: "0 0 8px 0", fontWeight: 700 }}>',
    "<p>": '<p style={{ color: "#64748b", margin: 0, fontSize: "15px" }}>',
    "<FormGrid>": '<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "24px" }}>',
    "</FormGrid>": '</div>',
    "<FormGroup>": '<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>',
    "</FormGroup>": '</div>',
    "<label>": '<label style={{ fontSize: "14px", fontWeight: 600, color: "#475569" }}>',
    "<SectionTitle>": '<h3 style={{ fontSize: "16px", fontWeight: 600, color: "#1e293b", margin: "0 0 16px 0", paddingBottom: "12px", borderBottom: "1px solid #e2e8f0" }}>',
    "</SectionTitle>": '</h3>',
    "<GlassCard>": '<div style={{ background: "white", borderRadius: "16px", padding: "24px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", marginBottom: "24px", border: "1px solid #e2e8f0" }}>',
    "</GlassCard>": '</div>',
    "<PrimaryBtn": '<button style={{ background: "#3b82f6", color: "white", padding: "12px 24px", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: 600, cursor: "pointer" }}',
    "</PrimaryBtn>": '</button>',
    "<Table>": '<table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px" }}>',
    "</Table>": '</table>',
}

# Delete the definitions of styled components
styled_regex = re.compile(r"// Reusing styled components.*?(?=interface DetalleGR)", re.DOTALL)
content = styled_regex.sub("", content)

for old, new in replacements.items():
    content = content.replace(old, new)

# add simple styles to inputs/selects globally or inline (let's just rely on browser default for now or inline style for th/td)
content = content.replace("<th>", '<th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #e2e8f0", fontSize: "14px", fontWeight: 600, color: "#475569", background: "#f8fafc" }}>')
content = content.replace("<td>", '<td style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #e2e8f0", fontSize: "14px" }}>')
content = content.replace("<input", '<input style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", width: "100%", boxSizing: "border-box" }}')
content = content.replace("<select", '<select style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", width: "100%", boxSizing: "border-box" }}')

# Clean up double style props if they occurred inside table inputs
content = content.replace('width: "100%", boxSizing: "border-box" }} type="file"', 'width: "100%", boxSizing: "border-box" }} type="file"')


with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("File rewritten without styled-components.")
