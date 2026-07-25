import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api/client';

export const predefinedAccents = [
  { name: 'Rosso', hex: '#ef4444' },
  { name: 'Arancione', hex: '#f97316' },
  { name: 'Giallo', hex: '#eab308' },
  { name: 'Giallo Cyber', hex: '#facc15' },
  { name: 'Smeraldo', hex: '#10b981' },
  { name: 'Azzurro', hex: '#0ea5e9' },
  { name: 'Blu CasaOS', hex: '#3b82f6' },
  { name: 'Viola', hex: '#8b5cf6' },
  { name: 'Rosa', hex: '#ec4899' },
];

export const predefinedBackgrounds = [
  { id: 'gray', name: 'Grigio Scuro', darkHex: '#1f2937', surfaceHex: '#374151' },
  { id: 'mediumgray', name: 'Grigio Medio', darkHex: '#374151', surfaceHex: '#4b5563' },
  { id: 'anthracite', name: 'Antracite', darkHex: '#18181b', surfaceHex: '#27272a' },
  { id: 'black', name: 'Total Black', darkHex: '#000000', surfaceHex: '#111111' },
  { id: 'navy', name: 'Blu Scuro', darkHex: '#020617', surfaceHex: '#0f172a' },
  { id: 'ocean', name: 'Verde Petrolio', darkHex: '#083344', surfaceHex: '#164e63' },
  { id: 'red', name: 'Rosso Scuro', darkHex: '#2a040d', surfaceHex: '#4c0519' },
];

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [accentColor, setAccentColor] = useState('#3b82f6');
  const [bgTheme, setBgTheme] = useState('gray');

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedAccent = await AsyncStorage.getItem('accentColor');
        const storedBg = await AsyncStorage.getItem('bgTheme');
        if (storedAccent) setAccentColor(storedAccent);
        if (storedBg) setBgTheme(storedBg);
        
        // Fetch dal server se siamo loggati (gestiamo in background in modo silente)
        const token = await AsyncStorage.getItem('token');
        if (token) {
          try {
            const res = await apiClient.get('/api/system/preferences');
            if (res.data) {
              if (res.data.accentColor) {
                setAccentColor(res.data.accentColor);
                await AsyncStorage.setItem('accentColor', res.data.accentColor);
              }
              if (res.data.bgTheme) {
                setBgTheme(res.data.bgTheme);
                await AsyncStorage.setItem('bgTheme', res.data.bgTheme);
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

  const changeTheme = async (newAccent, newBg) => {
    setAccentColor(newAccent);
    setBgTheme(newBg);
    await AsyncStorage.setItem('accentColor', newAccent);
    await AsyncStorage.setItem('bgTheme', newBg);
  };

  const getBackgroundColor = () => {
    const bg = predefinedBackgrounds.find(b => b.id === bgTheme);
    return bg ? bg.darkHex : '#1e1e1e';
  };

  const getSurfaceColor = () => {
    const bg = predefinedBackgrounds.find(b => b.id === bgTheme);
    return bg ? bg.surfaceHex : '#2a2a2a';
  };

  // Derive the active theme palette
  const colors = {
    background: getBackgroundColor(),
    surface: getSurfaceColor(),
    primary: accentColor,
    text: '#ffffff',
    textSecondary: '#aaaaaa',
    border: '#333333',
    success: '#4ade80',
    error: '#f87171',
  };

  return (
    <ThemeContext.Provider value={{ colors, accentColor, bgTheme, changeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
