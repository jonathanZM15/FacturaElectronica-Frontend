import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Login from './pages/Login';
import CambiarPassword from './pages/cambiarPassword';
import PasswordRecovery from './pages/PasswordRecovery';
import Navbar from './pages/Navbar';
import { UserProvider, useUser } from './contexts/userContext';
import { NotificationProvider } from './contexts/NotificationContext';

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
