import React, { createContext, useState } from 'react';

export const VimModeContext = createContext();
export const DarkModeContext = createContext();

export const EditorToolbarProvider = ({ children }) => {
  const [isVimMode, toggleVimMode] = useState(false);
  const [isDarkMode, toggleDarkMode] = useState(true);

  return (
    <VimModeContext.Provider value={[isVimMode, toggleVimMode]}>
      <DarkModeContext.Provider value={[isDarkMode, toggleDarkMode]}>
        {' '}
        {children}
      </DarkModeContext.Provider>
    </VimModeContext.Provider>
  );
};
