import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Login from './pages/Login';
import PasswordRecovery from './pages/PasswordRecovery';
import Navbar from './pages/Navbar';
import CambiarPassword from './pages/cambiarPassword';
import { auth } from './services/api';
import { UserProvider, useUser } from './contexts/userContext';
import { NotificationProvider } from './contexts/NotificationContext';

// Wrapper para cambio de contraseña autenticado: llama al endpoint y luego hace logout
const ChangePasswordAuthed: React.FC = () => {
  const { logout } = useUser();
  const handleSubmit = async (newPassword: string) => {
    // Llamada al backend para cambiar contraseña usando la sesión/token en headers
    await auth.cambiarPassword('', newPassword);
    // Forzar cierre de sesión para que el usuario vuelva a ingresar con la nueva contraseña
    await logout();
  };
  return <CambiarPassword onSubmit={handleSubmit} />;
};

function App() {
  return (
    <BrowserRouter>
      <NotificationProvider>
      <UserProvider>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/PasswordRecovery" element={<PasswordRecovery/>} />
          <Route
            path="/Navbar"
            element={<ProtectedRoute><Navbar/></ProtectedRoute>}
          />
          {/* Ruta pública para cambio vía enlace (token en querystring) */}
          <Route
            path="/cambiarPassword"
            element={<CambiarPassword />}
          />
          {/* Ruta protegida para cambio desde perfil (usuario autenticado) */}
          <Route
            path="/profile/cambiarPassword"
            element={
              <ProtectedRoute>
                <ChangePasswordAuthed />
              </ProtectedRoute>
            }
          />
        </Routes>
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
