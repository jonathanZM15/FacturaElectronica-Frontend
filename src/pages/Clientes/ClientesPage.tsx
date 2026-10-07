import React, { useState, useEffect, useMemo } from 'react';
import { useUser } from '../../contexts/userContext';
import { clientesService } from '../../services/api';
import { Cliente, ClienteFormData, TipoIdentificacion } from '../../types/cliente';

const ITEMS_PER_PAGE = 20;

// Validadores del SRI / Registro Civil en frontend para feedback visual en tiempo real
function validarCedulaEcuador(cedula: string): boolean {
  const digits = cedula.replace(/\D/g, '');
  if (digits.length !== 10) return false;
  const prov = parseInt(digits.substring(0, 2), 10);
  if ((prov < 1 || prov > 24) && prov !== 30) return false;
  const third = parseInt(digits.charAt(2), 10);
  if (third >= 6) return false;

  const coef = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let val = parseInt(digits.charAt(i), 10) * coef[i];
    if (val >= 10) val -= 9;
    sum += val;
  }
  const mod = sum % 10;
  const checkDigit = mod === 0 ? 0 : 10 - mod;
  return checkDigit === parseInt(digits.charAt(9), 10);
}

function validarRucEcuador(ruc: string): boolean {
  const digits = ruc.replace(/\D/g, '');
  if (digits.length !== 13) return false;
  const prov = parseInt(digits.substring(0, 2), 10);
  if ((prov < 1 || prov > 24) && prov !== 30) return false;

  const third = parseInt(digits.charAt(2), 10);

  // RUC Persona Natural
  if (third < 6) {
    if (!validarCedulaEcuador(digits.substring(0, 10))) return false;
    return digits.substring(10, 13) === '001';
  }

  // RUC Sociedad Privada / Extranjeros
  if (third === 9) {
    if (digits.substring(10, 13) !== '001') return false;
    const coef = [4, 3, 2, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(digits.charAt(i), 10) * coef[i];
    }
    const mod = sum % 11;
    const check = mod === 0 ? 0 : 11 - mod;
    return check === parseInt(digits.charAt(9), 10);
  }

  // RUC Sociedad Pública
  if (third === 6) {
    if (digits.substring(9, 13) !== '0001') return false;
    const coef = [3, 2, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 8; i++) {
      sum += parseInt(digits.charAt(i), 10) * coef[i];
    }
    const mod = sum % 11;
    const check = mod === 0 ? 0 : 11 - mod;
    return check === parseInt(digits.charAt(8), 10);
  }

  return false;
}

export default function ClientesPage() {
  const { user } = useUser();
  const emisorId = (user as any)?.emisor_id || 6;

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);

  // Alertas
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal Crear / Editar
  const [showModal, setShowModal] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [formData, setFormData] = useState<ClienteFormData>({
    tipo_identificacion: 'CEDULA',
    identificacion: '',
    razon_social: '',
    nombre_comercial: '',
    direccion: '',
    email: '',
    telefono: '',
  });
  const [modalErrors, setModalErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Modal Eliminar
  const [deletingCliente, setDeletingCliente] = useState<Cliente | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchClientes = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const params: Record<string, any> = { all: true };
      if (search.trim()) params.search = search.trim();
      if (tipoFilter) params.tipo_identificacion = tipoFilter;

      const res = await clientesService.list(emisorId, params);
      setClientes(res.data.data || []);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Error al cargar la lista de clientes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchClientes();
    }, 250);
    return () => clearTimeout(timer);
  }, [emisorId, search, tipoFilter]);

  // Paginación
  const totalPages = Math.max(1, Math.ceil(clientes.length / ITEMS_PER_PAGE));
  const paginatedClientes = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return clientes.slice(start, start + ITEMS_PER_PAGE);
  }, [clientes, currentPage]);

  const handleOpenCreate = () => {
    setEditingCliente(null);
    setFormData({
      tipo_identificacion: 'CEDULA',
      identificacion: '',
      razon_social: '',
      nombre_comercial: '',
      direccion: '',
      email: '',
      telefono: '',
    });
    setModalErrors({});
    setShowModal(true);
  };

  const handleOpenEdit = (cli: Cliente) => {
    setEditingCliente(cli);
    setFormData({
      tipo_identificacion: cli.tipo_identificacion,
      identificacion: cli.identificacion,
      razon_social: cli.razon_social,
      nombre_comercial: cli.nombre_comercial || '',
      direccion: cli.direccion || '',
      email: cli.email || '',
      telefono: cli.telefono || '',
    });
    setModalErrors({});
    setShowModal(true);
  };

  const handleTipoChange = (newTipo: TipoIdentificacion) => {
    let newId = formData.identificacion;
    if (newTipo === 'CONSUMIDOR_FINAL') {
      newId = '9999999999999';
    } else if (formData.identificacion === '9999999999999') {
      newId = '';
    }
    setFormData({ ...formData, tipo_identificacion: newTipo, identificacion: newId });
  };

  // Cálculo en vivo del estado de validación visual del documento
  const idStatus = useMemo(() => {
    const id = formData.identificacion.trim();
    if (!id) return null;

    if (formData.tipo_identificacion === 'CEDULA') {
      if (id.length < 10) return { valid: false, msg: `Faltan ${10 - id.length} dígitos` };
      if (id.length > 10) return { valid: false, msg: 'Cédula debe tener 10 dígitos' };
      const ok = validarCedulaEcuador(id);
      return { valid: ok, msg: ok ? '✓ Cédula ecuatoriana válida' : '✗ Dígito verificador no coincide' };
    }

    if (formData.tipo_identificacion === 'RUC') {
      if (id.length < 13) return { valid: false, msg: `Faltan ${13 - id.length} dígitos` };
      if (id.length > 13) return { valid: false, msg: 'RUC debe tener 13 dígitos' };
      const ok = validarRucEcuador(id);
      return { valid: ok, msg: ok ? '✓ RUC ecuatoriano válido' : '✗ RUC no cumple algoritmo del SRI' };
    }

    if (formData.tipo_identificacion === 'CONSUMIDOR_FINAL') {
      const ok = id === '9999999999999';
      return { valid: ok, msg: ok ? '✓ Consumidor Final estándar' : '✗ Debe ser 9999999999999' };
    }

    return null;
  }, [formData.identificacion, formData.tipo_identificacion]);

  const validateClientSide = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.razon_social.trim()) {
      errs.razon_social = 'La razón social o nombre completo es obligatorio.';
    }
    if (!formData.identificacion.trim()) {
      errs.identificacion = 'El número de identificación es obligatorio.';
    } else if (idStatus && !idStatus.valid) {
      errs.identificacion = idStatus.msg;
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs.email = 'Formato de correo electrónico inválido.';
    }

    setModalErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateClientSide()) return;

    try {
      setSaving(true);
      setModalErrors({});
      if (editingCliente) {
        await clientesService.update(emisorId, editingCliente.id, formData);
        setSuccessMsg('Cliente actualizado exitosamente.');
      } else {
        await clientesService.create(emisorId, formData);
        setSuccessMsg('Cliente creado exitosamente.');
      }
      setShowModal(false);
      fetchClientes();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error(err);
      if (err.response?.data?.errors) {
        const backendErrs: Record<string, string> = {};
        for (const [key, msgs] of Object.entries(err.response.data.errors as Record<string, string[]>)) {
          backendErrs[key] = Array.isArray(msgs) ? msgs[0] : String(msgs);
        }
        setModalErrors(backendErrs);
      } else {
        setErrorMsg(err.response?.data?.message || 'Error al guardar cliente.');
        setTimeout(() => setErrorMsg(''), 4000);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCliente) return;
    try {
      setDeleting(true);
      await clientesService.delete(emisorId, deletingCliente.id);
      setSuccessMsg('Cliente eliminado correctamente.');
      setDeletingCliente(null);
      fetchClientes();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Error al eliminar el cliente.');
      setTimeout(() => setErrorMsg(''), 5000);
      setDeletingCliente(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b', margin: 0 }}>Catálogo de Clientes</h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: '4px 0 0' }}>
            Administración de clientes para facturación electrónica (SRI) y ventas.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)',
          }}
        >
          + Nuevo Cliente
        </button>
      </div>

      {/* Alertas */}
      {successMsg && (
        <div style={{ padding: '12px 16px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', color: '#166534', marginBottom: '16px', fontSize: '14px' }}>
          ✓ {successMsg}
        </div>
      )}
      {errorMsg && (
        <div style={{ padding: '12px 16px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b', marginBottom: '16px', fontSize: '14px' }}>
          ⚠ {errorMsg}
        </div>
      )}

      {/* Filtros */}
      <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '20px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '240px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Búsqueda reactiva</label>
          <input
            type="text"
            placeholder="Buscar por cédula, RUC, razón social o correo..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
          />
        </div>
        <div style={{ width: '220px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Tipo de Identificación</label>
          <select
            value={tipoFilter}
            onChange={(e) => { setTipoFilter(e.target.value); setCurrentPage(1); }}
            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', background: '#fff' }}
          >
            <option value="">Todos los tipos</option>
            <option value="CEDULA">Cédula</option>
            <option value="RUC">RUC</option>
            <option value="CONSUMIDOR_FINAL">Consumidor Final</option>
            <option value="PASAPORTE">Pasaporte</option>
            <option value="IDENTIFICACION_EXTERIOR">Identificación Exterior</option>
            <option value="PLACA">Placa</option>
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '12px 16px' }}>Tipo ID</th>
              <th style={{ padding: '12px 16px' }}>Identificación</th>
              <th style={{ padding: '12px 16px' }}>Razón Social</th>
              <th style={{ padding: '12px 16px' }}>Email</th>
              <th style={{ padding: '12px 16px' }}>Teléfono</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  Cargando clientes...
                </td>
              </tr>
            ) : paginatedClientes.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  No se encontraron clientes registrados.
                </td>
              </tr>
            ) : (
              paginatedClientes.map((cli) => (
                <tr key={cli.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      background: cli.tipo_identificacion === 'RUC' ? '#e0e7ff' : cli.tipo_identificacion === 'CEDULA' ? '#ecfdf5' : '#f1f5f9',
                      color: cli.tipo_identificacion === 'RUC' ? '#3730a3' : cli.tipo_identificacion === 'CEDULA' ? '#065f46' : '#475569',
                    }}>
                      {cli.tipo_identificacion}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                    {cli.identificacion}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#334155' }}>{cli.razon_social}</div>
                    {cli.nombre_comercial && (
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>{cli.nombre_comercial}</div>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>
                    {cli.email || '—'}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>
                    {cli.telefono || '—'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleOpenEdit(cli)}
                      style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', fontWeight: 600, color: '#334155', cursor: 'pointer', marginRight: '6px' }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => setDeletingCliente(cli)}
                      style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', fontWeight: 600, color: '#dc2626', cursor: 'pointer' }}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Paginación */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', fontSize: '13px', color: '#64748b' }}>
            <span>Mostrando {paginatedClientes.length} de {clientes.length} clientes (20 por página)</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
              >
                Anterior
              </button>
              <span style={{ padding: '6px 12px', fontWeight: 600 }}>Página {currentPage} de {totalPages}</span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Crear / Editar */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '560px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>
                {editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            </div>

            <form onSubmit={handleSave} style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Tipo de Identificación *</label>
                  <select
                    value={formData.tipo_identificacion}
                    onChange={(e) => handleTipoChange(e.target.value as TipoIdentificacion)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#fff' }}
                  >
                    <option value="CEDULA">Cédula</option>
                    <option value="RUC">RUC</option>
                    <option value="CONSUMIDOR_FINAL">Consumidor Final</option>
                    <option value="PASAPORTE">Pasaporte</option>
                    <option value="IDENTIFICACION_EXTERIOR">Identificación Exterior</option>
                    <option value="PLACA">Placa</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Número de Identificación *</label>
                  <input
                    type="text"
                    value={formData.identificacion}
                    disabled={formData.tipo_identificacion === 'CONSUMIDOR_FINAL'}
                    onChange={(e) => setFormData({ ...formData, identificacion: e.target.value })}
                    placeholder={formData.tipo_identificacion === 'RUC' ? '13 dígitos (ej: 1710034065001)' : formData.tipo_identificacion === 'CEDULA' ? '10 dígitos (ej: 1710034065)' : 'Número de documento'}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: modalErrors.identificacion || (idStatus && !idStatus.valid) ? '1px solid #ef4444' : idStatus?.valid ? '1px solid #22c55e' : '1px solid #cbd5e1',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                  {idStatus && (
                    <div style={{ fontSize: '11px', fontWeight: 600, marginTop: '4px', color: idStatus.valid ? '#16a34a' : '#dc2626' }}>
                      {idStatus.msg}
                    </div>
                  )}
                  {modalErrors.identificacion && <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '2px' }}>{modalErrors.identificacion}</div>}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Razón Social / Nombres y Apellidos *</label>
                <input
                  type="text"
                  value={formData.razon_social}
                  onChange={(e) => setFormData({ ...formData, razon_social: e.target.value })}
                  placeholder="Ej: Juan Pérez o Empresa S.A."
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: modalErrors.razon_social ? '1px solid #ef4444' : '1px solid #cbd5e1', fontSize: '14px' }}
                />
                {modalErrors.razon_social && <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>{modalErrors.razon_social}</div>}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Nombre Comercial (opcional)</label>
                <input
                  type="text"
                  value={formData.nombre_comercial}
                  onChange={(e) => setFormData({ ...formData, nombre_comercial: e.target.value })}
                  placeholder="Nombre de fantasía o sucursal"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Email (para envío de factura)</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="cliente@ejemplo.com"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: modalErrors.email ? '1px solid #ef4444' : '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                  {modalErrors.email && <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>{modalErrors.email}</div>}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Teléfono / Celular</label>
                  <input
                    type="text"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    placeholder="0999999999"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Dirección</label>
                <input
                  type="text"
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  placeholder="Ciudad, Calle principal y secundaria"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', color: '#fff', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}
                >
                  {saving ? 'Guardando...' : editingCliente ? 'Guardar Cambios' : 'Crear Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminar */}
      {deletingCliente && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '420px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700, color: '#991b1b' }}>¿Eliminar Cliente?</h3>
            <p style={{ color: '#475569', fontSize: '14px', lineHeight: 1.5, margin: '0 0 20px' }}>
              ¿Estás seguro de que deseas eliminar a <strong>{deletingCliente.razon_social}</strong> ({deletingCliente.identificacion})?
              Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setDeletingCliente(null)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#dc2626', color: '#fff', fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer' }}
              >
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
