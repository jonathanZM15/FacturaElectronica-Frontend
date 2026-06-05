import React, { useState } from 'react';

interface Resultado {
  tipo: 'exito' | 'error';
  mensaje: string;
  data?: any;
}

const PruebaEmisionComprobante: React.FC = () => {
  const [firmaArchivo, setFirmaArchivo] = useState<File | null>(null);
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  const payloadPrueba = {
    emisor_id: 1,
    establecimiento_id: 1,
    punto_emision_id: 1,
    cliente: {
      tipo_identificacion: "07",
      identificacion: "9999999999999",
      razon_social: "CONSUMIDOR FINAL",
      direccion: "Ecuador",
      email: "cliente@email.com"
    },
    detalles: [
      {
        descripcion: "Licencia de Software Anual",
        cantidad: 1.000000,
        precio_unitario: 100.000000,
        descuento: 0.000000,
        impuesto: { tarifa: 15.00, tipo: "IVA" }
      }
    ]
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFirmaArchivo(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firmaArchivo || !password) {
      alert("Por favor, sube el archivo .p12 y escribe la contraseña.");
      return;
    }

    setLoading(true);
    setResultado(null);

    const formData = new FormData();
    formData.append('firma', firmaArchivo);
    formData.append('password', password);
    formData.append('payload', JSON.stringify(payloadPrueba));

    try {
      // Usa el servicio base de Axios si existe, o fetch
      const response = await fetch('http://localhost:8000/api/facturacion/emitir', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (response.ok || response.status === 202) {
        setResultado({ tipo: 'exito', mensaje: 'Petición enviada correctamente.', data });
      } else {
        setResultado({ tipo: 'error', mensaje: 'Error de validación del servidor.', data });
      }
    } catch (error) {
      console.error("Error al enviar petición:", error);
      setResultado({ tipo: 'error', mensaje: 'Error de conexión con el backend.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <div className="mb-6 border-b pb-4">
        <h2 className="text-2xl font-bold text-indigo-600">Prueba Emisión de Comprobante (SRI)</h2>
        <p className="text-gray-500 text-sm mt-1">Sube la firma y simula un envío real al ambiente de pruebas.</p>
      </div>
      <form onSubmit={handleSubmit} className="max-w-xl">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Archivo de Firma (.p12 o .pfx)</label>
          <input type="file" accept=".p12,.pfx" onChange={handleFileChange} className="block w-full text-sm border rounded-md" required />
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña de la Firma</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 border rounded-md" placeholder="Escribe la contraseña..." required />
        </div>
        <button type="submit" disabled={loading} className={`w-full py-2 px-4 rounded-md text-white font-medium ${loading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
          {loading ? 'Enviando a Cola...' : 'Emitir Factura de Prueba al SRI'}
        </button>
      </form>
      {resultado && (
        <div className={`mt-6 p-4 rounded-md ${resultado.tipo === 'exito' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <h3 className={`font-bold ${resultado.tipo === 'exito' ? 'text-green-800' : 'text-red-800'}`}>{resultado.mensaje}</h3>
          <pre className="mt-2 text-xs overflow-auto max-h-40 bg-white p-2 rounded border">{JSON.stringify(resultado.data, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};
export default PruebaEmisionComprobante;