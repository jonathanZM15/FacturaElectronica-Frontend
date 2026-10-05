import os

file_path = r"C:\Users\CompuStore\Desktop\dos sistemas\tesis\FacturaElectronica-Frontend\src\components\inventory\EnvioMermasForm.tsx"
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports and Component Name
content = content.replace("ReacondicionarForm", "EnvioMermasForm")
content = content.replace("reacondicionarStock", "enviarMermas")

# 2. Texts
content = content.replace("Reacondicionamiento desde Mermas (MOV-12)", "Envío a Mermas (MOV-11)")
content = content.replace("Permite rescatar inventario desde la bodega de mermas/daños hacia una bodega operativa.", "Permite trasladar inventario dañado, caducado o no apto desde una bodega operativa hacia la bodega de mermas.")
content = content.replace("Bodega Origen (Mermas)", "Bodega Origen (Operativa)")
content = content.replace("Bodega Destino (Operativa)", "Bodega Destino (Mermas)")

content = content.replace("const bodegasMermas = bodegas.filter(b => b.tipo === TipoBodega.MERMAS);", "const bodegasMermas = bodegas.filter(b => b.tipo === TipoBodega.MERMAS);")
content = content.replace("const bodegasOperativas = bodegas.filter(b => [TipoBodega.VENTA, TipoBodega.ALMACEN, TipoBodega.EXHIBICION].includes(b.tipo));", "const bodegasOperativas = bodegas.filter(b => [TipoBodega.VENTA, TipoBodega.ALMACEN, TipoBodega.EXHIBICION].includes(b.tipo));")

# 3. Swap the dropdown arrays for Origen and Destino
content = content.replace("bodegasMermas.map(b", "TEMP_BODEGAS.map(b")
content = content.replace("bodegasOperativas.map(b", "bodegasMermas.map(b")
content = content.replace("TEMP_BODEGAS.map(b", "bodegasOperativas.map(b")

content = content.replace("Confirmar Reacondicionamiento", "Confirmar Envío a Mermas")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("EnvioMermasForm adapted!")
