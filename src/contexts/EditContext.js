import React, { createContext, useContext, useState } from 'react';

const EditContext = createContext();

export function EditProvider({ children }) {
  const [isLayoutUnlocked, setIsLayoutUnlocked] = useState(false);

  return (
    <EditContext.Provider value={{ isLayoutUnlocked, setIsLayoutUnlocked }}>
      {children}
    </EditContext.Provider>
  );
}

export function useEdit() {
  const context = useContext(EditContext);
  if (!context) {
    throw new Error('useEdit must be used within an EditProvider');
  }
  return context;
}
