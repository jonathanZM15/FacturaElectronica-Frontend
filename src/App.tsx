import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Login from './pages/Login';
import PasswordRecovery from './pages/PasswordRecovery';
import CambiarPassword from './pages/cambiarPassword';
import { auth } from './services/api';
import { UserProvider, useUser } from './contexts/userContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { SidebarProvider } from './contexts/SidebarContext';

import AppLayout from './layouts/AppLayout';
import Emisores from './pages/Emisores';
import Blank from './pages/Blank';

const ChangePasswordAuthed: React.FC = () => {
  const { logout } = useUser();
  const handleSubmit = async (newPassword: string) => {
    await auth.cambiarPassword('', newPassword);
    await logout();
  };
  return <CambiarPassword onSubmit={handleSubmit} />;
};

function App() {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <UserProvider>
          <SidebarProvider>
            <Routes>
              {/* Públicas */}
              <Route path="/" element={<Login />} />
              <Route path="/PasswordRecovery" element={<PasswordRecovery/>} />
              <Route path="/cambiarPassword" element={<CambiarPassword />} />

              {/* Protegidas con layout (Navbar + contenido dinámico) */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                {/* Ruta inicial autenticada */}
                <Route path="/emisores" element={<Emisores />} />
                {/* Compatibilidad: redirige /Navbar a /emisores */}
                <Route path="/Navbar" element={<Navigate to="/emisores" replace />} />

                {/* Secciones en blanco por ahora */}
                <Route path="/dashboard" element={<Blank />} />
                <Route path="/usuarios" element={<Blank />} />
                <Route path="/planes" element={<Blank />} />
                <Route path="/impuestos" element={<Blank />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </SidebarProvider>
        </UserProvider>
      </NotificationProvider>
    </BrowserRouter>
  );
}

export default App;

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useUser();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
};
