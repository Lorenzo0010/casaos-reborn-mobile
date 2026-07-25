import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme, Platform, PlatformColor } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api/client';

export const predefinedThemes = [
  { 
    id: 'navy', name: 'Oceano', 
    primary: '#3b82f6', 
    darkBg: '#020617', darkSurface: '#0f172a',
    lightBg: '#f8f9fb', lightSurface: '#ffffff'
  },
  { 
    id: 'forest', name: 'Smeraldo', 
    primary: '#10b981', 
    darkBg: '#022c22', darkSurface: '#064e3b',
    lightBg: '#f0fdf4', lightSurface: '#ffffff'
  },
  { 
    id: 'red', name: 'Rubino', 
    primary: '#f43f5e', 
    darkBg: '#2a040d', darkSurface: '#4c0519',
    lightBg: '#fff1f2', lightSurface: '#ffffff'
  },
  { 
    id: 'rust', name: 'Ambra', 
    primary: '#f59e0b', 
    darkBg: '#451a03', darkSurface: '#78350f',
    lightBg: '#fffbeb', lightSurface: '#ffffff'
  },
  { 
    id: 'purple', name: 'Ametista', 
    primary: '#8b5cf6', 
    darkBg: '#2e1065', darkSurface: '#4c1d95',
    lightBg: '#f5f3ff', lightSurface: '#ffffff'
  },
  { 
    id: 'anthracite', name: 'Antracite', 
    primary: '#94a3b8', 
    darkBg: '#18181b', darkSurface: '#27272a',
    lightBg: '#f8f9fb', lightSurface: '#ffffff'
  },
  { 
    id: 'monet', name: 'Monet (Auto)', 
    primary: 'monet', 
    darkBg: '#18181b', darkSurface: '#27272a',
    lightBg: '#f8f9fb', lightSurface: '#ffffff'
  }
];

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [activeTheme, setActiveTheme] = useState('navy');
  const [themeMode, setThemeMode] = useState('system');
  const colorScheme = useColorScheme();

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem('activeTheme');
        const storedMode = await AsyncStorage.getItem('themeMode');
        if (storedTheme) setActiveTheme(storedTheme);
        if (storedMode) setThemeMode(storedMode);
        
        // Fetch dal server se siamo loggati (gestiamo in background in modo silente)
        const token = await AsyncStorage.getItem('token');
        if (token) {
          try {
            const res = await apiClient.get('/api/system/preferences');
            if (res.data) {
              // Backward compatibility check
              if (res.data.mobileTheme) {
                setActiveTheme(res.data.mobileTheme);
                await AsyncStorage.setItem('activeTheme', res.data.mobileTheme);
              }
              if (res.data.themeMode) {
                setThemeMode(res.data.themeMode);
                await AsyncStorage.setItem('themeMode', res.data.themeMode);
              }
            }
          } catch(e) { } // ignoriamo errori di rete silenti
        }
      } catch (e) {
        console.error('Failed to load theme preferences', e);
      }
    };
    loadTheme();
  }, []);

  const changeTheme = async (newThemeId, newMode = themeMode) => {
    setActiveTheme(newThemeId);
    setThemeMode(newMode);
    await AsyncStorage.setItem('activeTheme', newThemeId);
    await AsyncStorage.setItem('themeMode', newMode);
  };



  const resolvedMode = themeMode === 'system' ? (colorScheme || 'dark') : themeMode;
  const isDark = resolvedMode === 'dark';

  const currentTheme = predefinedThemes.find(t => t.id === activeTheme) || predefinedThemes[0];

  const getBackgroundColor = () => {
    return isDark ? currentTheme.darkBg : currentTheme.lightBg;
  };

  const getSurfaceColor = () => {
    return isDark ? currentTheme.darkSurface : currentTheme.lightSurface;
  };

  const getPrimaryColor = () => {
    if (currentTheme.primary === 'monet') {
      if (Platform.OS === 'android' && Platform.Version >= 31) {
        return PlatformColor('@android:color/system_accent1_500');
      }
      return '#3b82f6'; // Fallback se non supportato
    }
    return currentTheme.primary;
  };

  // Derive the active theme palette
  const colors = {
    background: getBackgroundColor(),
    surface: getSurfaceColor(),
    primary: getPrimaryColor(),
    text: isDark ? '#ffffff' : '#111827',
    textSecondary: isDark ? '#aaaaaa' : '#6b7280',
    border: isDark ? '#333333' : '#e5e7eb',
    success: '#4ade80',
    error: '#f87171',
  };

  return (
    <ThemeContext.Provider value={{ colors, activeTheme, currentTheme, themeMode, resolvedMode, isDark, changeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
