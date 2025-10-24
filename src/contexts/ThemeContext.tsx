import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Theme } from '../types';

interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  customTheme: Theme | null;
  setCustomTheme: (theme: Theme | null) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

const defaultThemes: Theme[] = [
  {
    name: 'Default Light',
    colors: {
      primary: '#3b82f6',
      secondary: '#64748b',
      background: '#ffffff',
      foreground: '#0f172a',
      accent: '#f1f5f9',
    },
  },
  {
    name: 'Default Dark',
    colors: {
      primary: '#60a5fa',
      secondary: '#94a3b8',
      background: '#0f172a',
      foreground: '#f8fafc',
      accent: '#1e293b',
    },
  },
  {
    name: 'Purple',
    colors: {
      primary: '#8b5cf6',
      secondary: '#a78bfa',
      background: '#ffffff',
      foreground: '#1e1b4b',
      accent: '#f3e8ff',
    },
  },
  {
    name: 'Green',
    colors: {
      primary: '#10b981',
      secondary: '#34d399',
      background: '#ffffff',
      foreground: '#064e3b',
      accent: '#ecfdf5',
    },
  },
  {
    name: 'Orange',
    colors: {
      primary: '#f59e0b',
      secondary: '#fbbf24',
      background: '#ffffff',
      foreground: '#78350f',
      accent: '#fffbeb',
    },
  },
];

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');
  const [customTheme, setCustomTheme] = useState<Theme | null>(null);

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    const savedCustomTheme = localStorage.getItem('customTheme');
    
    if (savedTheme) {
      setThemeState(savedTheme);
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setThemeState(prefersDark ? 'dark' : 'light');
    }

    if (savedCustomTheme) {
      try {
        setCustomTheme(JSON.parse(savedCustomTheme));
      } catch (error) {
        console.error('Error parsing custom theme:', error);
      }
    }
  }, []);

  useEffect(() => {
    // Apply theme to document
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    // Apply custom theme colors
    if (customTheme) {
      const root = document.documentElement;
      root.style.setProperty('--primary', customTheme.colors.primary);
      root.style.setProperty('--secondary', customTheme.colors.secondary);
      root.style.setProperty('--background', customTheme.colors.background);
      root.style.setProperty('--foreground', customTheme.colors.foreground);
      root.style.setProperty('--accent', customTheme.colors.accent);
      localStorage.setItem('customTheme', JSON.stringify(customTheme));
    } else {
      // Reset to default colors
      const root = document.documentElement;
      root.style.removeProperty('--primary');
      root.style.removeProperty('--secondary');
      root.style.removeProperty('--background');
      root.style.removeProperty('--foreground');
      root.style.removeProperty('--accent');
      localStorage.removeItem('customTheme');
    }
  }, [customTheme]);

  const toggleTheme = () => {
    setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  };

  const setTheme = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
  };

  const value: ThemeContextType = {
    theme,
    toggleTheme,
    setTheme,
    customTheme,
    setCustomTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export { defaultThemes };
