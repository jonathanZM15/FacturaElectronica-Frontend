import React, { createContext, useContext, useState } from 'react';

type SidebarContextType = {
  menuOpen: boolean;
  toggleMenu: () => void;
  setMenuOpen: (open: boolean) => void;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [menuOpen, setMenuOpen] = useState(true);

  const toggleMenu = () => setMenuOpen((prev) => !prev);

  return (
    <SidebarContext.Provider value={{ menuOpen, toggleMenu, setMenuOpen }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider');
  }
  return context;
};
