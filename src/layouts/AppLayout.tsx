import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar/Navbar';
import './AppLayout.css';
import { useSidebar } from '../contexts/SidebarContext';

const AppLayout: React.FC = () => {
  const { menuOpen } = useSidebar();

  return (
    <>
      <Navbar />
      <main className={`app-content ${!menuOpen ? 'sidebar-closed' : ''}`}>
        <Outlet />
      </main>
    </>
  );
};

export default AppLayout;
