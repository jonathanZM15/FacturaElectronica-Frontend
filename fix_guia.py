import re

filepath = r"C:\Users\CompuStore\Desktop\dos sistemas\tesis\FacturaElectronica-Frontend\src\pages\GuiaRemision\GuiaRemision.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix imports
if "import { emisoresApi }" not in content:
    content = content.replace("import api from '../../services/api';", 
                              "import api from '../../services/api';\nimport { emisoresApi } from '../../services/emisoresApi';\nimport { establecimientosApi } from '../../services/establecimientosApi';\nimport { puntosEmisionApi } from '../../services/puntosEmisionApi';")

# Replace logic
old_logic = """  useEffect(() => {
    cargarEmisores();
  }, []);

  const cargarEmisores = async () => {
    try {
      const res = await api.get('/api/emisores');
      setEmisores(res.data);
      if (res.data.length > 0) setEmisorId(res.data[0].id.toString());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!emisorId) return;
    const emisor = emisores.find(e => e.id.toString() === emisorId);
    if (emisor?.establecimientos) {
      setEstablecimientos(emisor.establecimientos);
      if (emisor.establecimientos.length > 0) {
        setEstabId(emisor.establecimientos[0].id.toString());
      }
    }
  }, [emisorId, emisores]);

  useEffect(() => {
    if (!estabId) return;
    const estab = establecimientos.find(e => e.id.toString() === estabId);
    if (estab?.puntos_emision) {
      setPuntos(estab.puntos_emision);
      if (estab.puntos_emision.length > 0) {
        setPuntoId(estab.puntos_emision[0].id.toString());
      }
    }
  }, [estabId, establecimientos]);"""

new_logic = """  useEffect(() => {
    emisoresApi.list().then(r => {
      const data = r.data?.data ?? r.data ?? [];
      setEmisores(data);
      if (data.length > 0) setEmisorId(data[0].id.toString());
    });
  }, []);

  useEffect(() => {
    if (!emisorId) return;
    establecimientosApi.list(Number(emisorId)).then(r => {
      const data = r.data?.data ?? r.data ?? [];
      setEstablecimientos(data);
      if (data.length > 0) setEstabId(data[0].id.toString());
    });
  }, [emisorId]);

  useEffect(() => {
    if (!estabId) return;
    puntosEmisionApi.list(Number(estabId)).then(r => {
      const data = r.data?.data ?? r.data ?? [];
      setPuntos(data);
      if (data.length > 0) setPuntoId(data[0].id.toString());
    });
  }, [estabId]);"""

content = content.replace(old_logic, new_logic)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("File fixed.")
