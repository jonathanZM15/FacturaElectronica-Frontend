import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import Login from './pages/Login';
import PasswordRecovery from './pages/PasswordRecovery';
import Navbar from './pages/Navbar';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta para el inicio de sesión */}
        <Route path="/" element={<Login />} /> 
        
        {/* Ruta para "Olvidé mi contraseña" */}
        <Route path="/PasswordRecovery" element={<PasswordRecovery/>} /> 

        {/* Ruta para "Olvidé mi contraseña" */}
        <Route path="/Navbar" element={<Navbar/>} /> 
      </Routes>
    </BrowserRouter>
  );
}

export default App;
