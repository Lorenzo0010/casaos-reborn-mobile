import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme, Platform, PlatformColor } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api/client';

export const predefinedThemes = [
  { 
    id: 'monet', name: 'Monet (Auto)', 
    primary: 'monet', 
    darkBg: '#18181b', darkSurface: '#27272a', darkSurfaceElevated: '#3f3f46',
    lightBg: '#f8f9fb', lightSurface: '#ffffff', lightSurfaceElevated: '#f4f4f5'
  },
  { 
    id: 'navy', name: 'Oceano', 
    primary: '#3b82f6', 
    darkBg: '#0f172a', darkSurface: '#1e293b', darkSurfaceElevated: '#334155',
    lightBg: '#f8f9fb', lightSurface: '#ffffff', lightSurfaceElevated: '#f1f5f9'
  },
  { 
    id: 'forest', name: 'Smeraldo', 
    primary: '#10b981', 
    darkBg: '#111815', darkSurface: '#1b2621', darkSurfaceElevated: '#25352e',
    lightBg: '#f0fdf4', lightSurface: '#ffffff', lightSurfaceElevated: '#ecfdf5'
  },
  { 
    id: 'red', name: 'Rubino', 
    primary: '#f43f5e', 
    darkBg: '#1a1314', darkSurface: '#261b1d', darkSurfaceElevated: '#332427',
    lightBg: '#fff1f2', lightSurface: '#ffffff', lightSurfaceElevated: '#ffe4e6'
  },
  { 
    id: 'rust', name: 'Ambra', 
    primary: '#f59e0b', 
    darkBg: '#1a1613', darkSurface: '#26201b', darkSurfaceElevated: '#332b24',
    lightBg: '#fffbeb', lightSurface: '#ffffff', lightSurfaceElevated: '#fef3c7'
  },
  { 
    id: 'purple', name: 'Ametista', 
    primary: '#8b5cf6', 
    darkBg: '#15131a', darkSurface: '#1f1b26', darkSurfaceElevated: '#2a2433',
    lightBg: '#f5f3ff', lightSurface: '#ffffff', lightSurfaceElevated: '#ede9fe'
  },
  { 
    id: 'anthracite', name: 'Antracite', 
    primary: '#94a3b8', 
    darkBg: '#18181b', darkSurface: '#27272a', darkSurfaceElevated: '#3f3f46',
    lightBg: '#f8f9fb', lightSurface: '#ffffff', lightSurfaceElevated: '#f4f4f5'
  }
];

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [activeTheme, setActiveTheme] = useState('monet');
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
    if (currentTheme.id === 'monet' && Platform.OS === 'android' && Platform.Version >= 31) {
      return isDark ? PlatformColor('@android:color/system_neutral1_900') : PlatformColor('@android:color/system_neutral1_50');
    }
    return isDark ? currentTheme.darkBg : currentTheme.lightBg;
  };

  const getSurfaceColor = () => {
    if (currentTheme.id === 'monet' && Platform.OS === 'android' && Platform.Version >= 31) {
      return isDark ? PlatformColor('@android:color/system_neutral1_800') : PlatformColor('@android:color/system_neutral1_100');
    }
    return isDark ? currentTheme.darkSurface : currentTheme.lightSurface;
  };

  const getSurfaceElevatedColor = () => {
    if (currentTheme.id === 'monet' && Platform.OS === 'android' && Platform.Version >= 31) {
      return isDark ? PlatformColor('@android:color/system_neutral1_700') : PlatformColor('@android:color/system_neutral1_200');
    }
    return isDark ? currentTheme.darkSurfaceElevated : currentTheme.lightSurfaceElevated;
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
    backgroundSolid: isDark ? currentTheme.darkBg : currentTheme.lightBg,
    surface: getSurfaceColor(),
    surfaceSolid: isDark ? currentTheme.darkSurface : currentTheme.lightSurface,
    surfaceElevated: getSurfaceElevatedColor(),
    primary: getPrimaryColor(),
    text: isDark ? '#ffffff' : '#111827',
    textSecondary: isDark ? '#aaaaaa' : '#6b7280',
    border: isDark ? '#333333' : '#e5e7eb',
    shadow: '#000000',
    success: '#4ade80',
    error: '#f87171',
  };

  const typography = {
    h1: { fontFamily: 'Inter_700Bold', fontSize: 34 },
    h2: { fontFamily: 'Inter_700Bold', fontSize: 22 },
    h3: { fontFamily: 'Inter_600SemiBold', fontSize: 18 },
    subtitle: { fontFamily: 'Inter_500Medium', fontSize: 16 },
    body: { fontFamily: 'Inter_400Regular', fontSize: 14 },
    bodyMedium: { fontFamily: 'Inter_500Medium', fontSize: 14 },
    caption: { fontFamily: 'Inter_400Regular', fontSize: 12 },
    button: { fontFamily: 'Inter_600SemiBold', fontSize: 16 }
  };

  return (
    <ThemeContext.Provider value={{ colors, typography, activeTheme, currentTheme, themeMode, resolvedMode, isDark, changeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
