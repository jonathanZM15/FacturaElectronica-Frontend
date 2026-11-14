import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/v1.css';

export default function ModuloPendiente() {
  return <div className="v1-page"><h1>Módulo pendiente</h1><p>Esta funcionalidad pertenece a una entrega posterior. La primera versión habilita Inventario, Clientes y Facturas.</p><Link to="/emisores">Volver</Link></div>;
}
