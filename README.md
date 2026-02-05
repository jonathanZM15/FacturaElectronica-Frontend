# 🧾 Factura Electrónica - Frontend

Interfaz de usuario moderna para el sistema de facturación electrónica **Máximo Facturas**, desarrollada con React 19 y TypeScript.

## 📋 Descripción

Aplicación web SPA (Single Page Application) que proporciona una interfaz intuitiva y responsiva para:

- 🔐 Inicio de sesión y gestión de sesiones
- 👥 Administración de usuarios con diferentes roles
- 🏢 Gestión de emisores y puntos de emisión
- 📄 Emisión y consulta de facturas electrónicas
- 💰 Gestión de retenciones
- 📧 Verificación de email y cambio de contraseña
- 📊 Dashboard con estadísticas

## 🛠️ Tecnologías

- **React** ^19.2.0
- **TypeScript** ^4.9.5
- **React Router DOM** ^6.30.1 (Navegación)
- **Axios** ^1.12.2 (Cliente HTTP)
- **CSS3** con diseño moderno (Glass morphism, animaciones)

## 📦 Requisitos Previos

- Node.js >= 16.x
- NPM >= 8.x

## 🚀 Instalación

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/jonathanZM15/FacturaElectronica-Frontend.git
   cd FacturaElectronica-Frontend
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar la URL del API**
   
   Crear archivo `.env` en la raíz del proyecto:
   ```env
   REACT_APP_API_URL=http://localhost:8000/api
   ```

4. **Iniciar en modo desarrollo**
   ```bash
   npm start
   ```

La aplicación estará disponible en `http://localhost:3000`

## 📁 Estructura del Proyecto

```
src/
├── components/       # Componentes reutilizables
│   ├── Navbar/
│   ├── Sidebar/
│   └── ...
├── pages/            # Páginas/Vistas principales
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── Usuarios.tsx
│   ├── Facturas.tsx
│   ├── Retenciones.tsx
│   ├── VerifyEmail.tsx
│   └── ...
├── services/         # Servicios de API
│   └── api.ts
├── context/          # Context API (Estado global)
├── hooks/            # Custom Hooks
├── types/            # Definiciones TypeScript
├── App.tsx           # Componente principal
└── index.tsx         # Punto de entrada
```

## 🎨 Características de UI/UX

- ✨ Diseño moderno con efecto Glass morphism
- 📱 Totalmente responsivo (Mobile-first)
- 🌙 Interfaz limpia y profesional
- ⚡ Animaciones sutiles y transiciones suaves
- 🔔 Sistema de notificaciones toast
- 👁️ Toggle para mostrar/ocultar contraseñas
- ✅ Validación de formularios en tiempo real

## 📜 Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm start` | Inicia el servidor de desarrollo |
| `npm run build` | Genera build de producción |
| `npm test` | Ejecuta los tests |
| `npm run eject` | Expone la configuración de CRA |

## 🔧 Build para Producción

```bash
npm run build
```

Los archivos optimizados se generarán en la carpeta `build/`.

## 🔗 Conexión con Backend

Este frontend se conecta con el API REST de Laravel:
- **Repositorio Backend**: [FacturaElectronica-Backend](https://github.com/jonathanZM15/FacturaElectronica-Backend)

Asegúrate de que el backend esté corriendo antes de usar el frontend.

## 🔐 Flujo de Autenticación

1. Usuario ingresa credenciales en Login
2. Backend valida y retorna token (Sanctum)
3. Token se almacena en localStorage
4. Todas las peticiones incluyen el token
5. Rutas protegidas según rol de usuario

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

## 👥 Autores

Desarrollado para **Máximo Facturas**
