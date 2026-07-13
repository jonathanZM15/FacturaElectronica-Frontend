import React, { useEffect, useRef, useState } from 'react';
import { facturacion } from '../../services/api';

interface Resultado {
  tipo: 'exito' | 'error';
  mensaje: string;
  data?: any;
}

const PruebaEmisionComprobante: React.FC = () => {
  const [firmaArchivo, setFirmaArchivo] = useState<File | null>(null);
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [comprobanteId, setComprobanteId] = useState<number | null>(null);
  const [consultaId, setConsultaId] = useState<string>('');
  const [consultaLoading, setConsultaLoading] = useState<boolean>(false);
  const [consultaResultado, setConsultaResultado] = useState<Resultado | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const pollerRef = useRef<number | null>(null);

  const payloadPrueba = {
    emisor_id: 1,
    establecimiento_id: 1,
    punto_emision_id: 1,
    cliente: {
      tipo_identificacion: "CONSUMIDOR_FINAL",
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

    const claveNormalizada = password.trim();

    const formData = new FormData();
    formData.append('firma', firmaArchivo, firmaArchivo.name);
    formData.append('password', claveNormalizada);
    formData.append('payload', JSON.stringify(payloadPrueba));

    console.debug('[P12] Enviando certificado al backend:', {
      nombre: firmaArchivo.name,
      tamanio: firmaArchivo.size,
      tipo: firmaArchivo.type,
      longitudClave: claveNormalizada.length,
    });

    try {
      const response = await facturacion.emitir(formData);
      setResultado({ tipo: 'exito', mensaje: 'Petición enviada correctamente.', data: response.data });
      setComprobanteId(response.data?.comprobante_id ?? null);
    } catch (error) {
      console.error("Error al enviar petición:", error);
      const axiosError = error as any;
      const backendMessage = axiosError?.response?.data?.message || axiosError?.response?.data?.error || 'Error de conexión con el backend.';
      const backendErrors = axiosError?.response?.data?.errors;

      setResultado({
        tipo: 'error',
        mensaje: backendMessage,
        data: backendErrors || axiosError?.response?.data || null,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConsultar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const id = Number(consultaId);
    if (!id || id <= 0) {
      setConsultaResultado({ tipo: 'error', mensaje: 'Ingresa un ID de comprobante valido.' });
      return;
    }

    setConsultaLoading(true);
    setConsultaResultado(null);

    try {
      const response = await facturacion.estado(id);
      setConsultaResultado({
        tipo: 'exito',
        mensaje: `Estado SRI: ${response.data?.estado_sri ?? 'DESCONOCIDO'}`,
        data: response.data,
      });
    } catch (error) {
      const axiosError = error as any;
      const backendMessage = axiosError?.response?.data?.message || axiosError?.response?.data?.error || 'No se pudo consultar el comprobante.';
      const backendErrors = axiosError?.response?.data?.errors;

      setConsultaResultado({
        tipo: 'error',
        mensaje: backendMessage,
        data: backendErrors || axiosError?.response?.data || null,
      });
    } finally {
      setConsultaLoading(false);
    }
  };

  useEffect(() => {
    if (!comprobanteId) {
      return;
    }

    let stopped = false;

    const fetchEstado = async () => {
      try {
        const response = await facturacion.estado(comprobanteId);
        if (stopped) {
          return;
        }

        setResultado({
          tipo: 'exito',
          mensaje: `Estado SRI: ${response.data?.estado_sri ?? 'DESCONOCIDO'}`,
          data: response.data,
        });

        if (['AUTORIZADO', 'NO_AUTORIZADO', 'DEVUELTA', 'ERROR_FIRMA', 'ERROR_SISTEMA'].includes(response.data?.estado_sri)) {
          if (pollerRef.current) {
            window.clearInterval(pollerRef.current);
            pollerRef.current = null;
          }
        }
      } catch (error) {
        if (!stopped) {
          setResultado((current) => current ?? { tipo: 'error', mensaje: 'No se pudo consultar el estado.' });
        }
      }
    };

    fetchEstado();
    pollerRef.current = window.setInterval(fetchEstado, 4000);

    return () => {
      stopped = true;
      if (pollerRef.current) {
        window.clearInterval(pollerRef.current);
        pollerRef.current = null;
      }
    };
  }, [comprobanteId]);

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

      <div className="mt-8 border-t pt-6 max-w-xl">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Consulta rápida de comprobante</h3>
        <p className="text-sm text-gray-500 mb-4">Ingresa el ID de un comprobante ya creado para ver si quedó en BORRADOR, RECIBIDA, AUTORIZADO, DEVUELTA u otro estado.</p>
        <form onSubmit={handleConsultar} className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">ID del comprobante</label>
            <input
              type="number"
              min="1"
              value={consultaId}
              onChange={(e) => setConsultaId(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Ej: 11"
            />
          </div>
          <button
            type="submit"
            disabled={consultaLoading}
            className={`px-4 py-2 rounded-md text-white font-medium ${consultaLoading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-gray-800 hover:bg-gray-900'}`}
          >
            {consultaLoading ? 'Consultando...' : 'Consultar estado'}
          </button>
        </form>
      </div>

      {consultaResultado && (
        <div className={`mt-6 p-4 rounded-md ${consultaResultado.tipo === 'exito' ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
          <h3 className={`font-bold ${consultaResultado.tipo === 'exito' ? 'text-blue-800' : 'text-red-800'}`}>{consultaResultado.mensaje}</h3>
          <pre className="mt-2 text-xs overflow-auto max-h-40 bg-white p-2 rounded border">{JSON.stringify(consultaResultado.data, null, 2)}</pre>
        </div>
      )}

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