import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar/Navbar';
import './AppLayout.css';
import { useSidebar } from '../contexts/SidebarContext';
import RouteLoadingBoundary from '../components/RouteLoadingBoundary';

const AppLayout: React.FC = () => {
  const { menuOpen } = useSidebar();

  return (
    <>
      <Navbar />
      <main className={`app-content ${!menuOpen ? 'sidebar-closed' : ''}`}>
        <RouteLoadingBoundary><Outlet /></RouteLoadingBoundary>
      </main>
    </>
  );
};

export default AppLayout;
