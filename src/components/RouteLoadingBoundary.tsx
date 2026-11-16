import React, { Component, ReactNode, Suspense } from 'react';

class RouteErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return <div role="alert" style={{ padding: '24px' }}>
        <p>No se pudo cargar esta pantalla. Comprueba tu conexión e intenta nuevamente.</p>
        <button type="button" onClick={() => window.location.reload()}>Volver a cargar</button>
      </div>;
    }
    return this.props.children;
  }
}

export default function RouteLoadingBoundary({ children }: { children: ReactNode }) {
  return <RouteErrorBoundary>
    <Suspense fallback={<div role="status" aria-live="polite" style={{ padding: '24px' }}>Cargando pantalla...</div>}>
      {children}
    </Suspense>
  </RouteErrorBoundary>;
}
