import re

filepath = r"C:\Users\CompuStore\Desktop\dos sistemas\tesis\FacturaElectronica-Frontend\src\pages\NotaDebito\NotaDebito.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replacements
content = content.replace("NotaCreditoPage", "NotaDebitoPage")
content = content.replace("Nota de Crédito", "Nota de Débito")
content = content.replace("nota de crédito", "nota de débito")
content = content.replace("Detalles NC", "Detalles ND")
content = content.replace("TOTAL NC", "TOTAL ND")
content = content.replace("NC_", "ND_")
content = content.replace("emitirNotaCredito", "emitirNotaDebito")
content = content.replace("a Acreditar", "a Debitar")
content = content.replace("Acreditar", "Debitar")
content = content.replace("totalNC", "totalND")
content = content.replace("DetalleNC", "DetalleND")
content = content.replace("a acreditar", "a debitar")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("NotaDebito.tsx updated successfully.")
