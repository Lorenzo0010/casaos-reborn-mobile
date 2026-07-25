import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, useWindowDimensions, PlatformColor, Switch } from 'react-native';
import { useTheme, predefinedThemes } from '../contexts/ThemeContext';
import { apiClient, logout } from '../api/client';
import { Palette, Trash2, Send, Save, RefreshCcw, LogOut } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

export default function AdvancedScreen() {
  const { colors, activeTheme, currentTheme, themeMode, changeTheme } = useTheme();
  const styles = createStyles(colors);
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const navigation = useNavigation();

  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [savingPrefs, setSavingPrefs] = useState(false);

  const [logs, setLogs] = useState('');
  const [logsLoading, setLogsLoading] = useState(true);

  useEffect(() => {
    fetchPreferences();
    fetchLogs();
  }, []);

  const fetchPreferences = async () => {
    try {
      const res = await apiClient.get('/api/system/preferences');
      if (res.data) {
        if (res.data.telegramToken) setTelegramToken(res.data.telegramToken);
        if (res.data.telegramChatId) setTelegramChatId(res.data.telegramChatId);
      }
    } catch (e) {
      console.error('Failed to load preferences', e);
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await apiClient.get('/api/system/logs');
      setLogs(res.data);
    } catch (e) {
      console.error(e);
      Alert.alert('Errore', 'Impossibile caricare i log');
    } finally {
      setLogsLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    setSavingPrefs(true);
    try {
      const res = await apiClient.get('/api/system/preferences');
      const prefs = res.data || {};
      
      await apiClient.post('/api/system/preferences', {
        ...prefs,
        telegramToken,
        telegramChatId,
        mobileTheme: activeTheme,
        themeMode
      });
      Alert.alert('Successo', 'Preferenze salvate correttamente');
    } catch (e) {
      Alert.alert('Errore', 'Impossibile salvare le preferenze');
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleThemeChange = (themeId) => {
    changeTheme(themeId, themeMode);
    // Salvataggio sul server in background
    apiClient.get('/api/system/preferences').then(res => {
      const prefs = res.data || {};
      apiClient.post('/api/system/preferences', {
        ...prefs,
        mobileTheme: themeId,
        themeMode
      }).catch(e => console.error(e));
    }).catch(e => console.error(e));
  };

  const handleModeChange = (mode) => {
    changeTheme(activeTheme, mode);
    apiClient.get('/api/system/preferences').then(res => {
      const prefs = res.data || {};
      apiClient.post('/api/system/preferences', {
        ...prefs,
        mobileTheme: activeTheme,
        themeMode: mode
      }).catch(e => console.error(e));
    }).catch(e => console.error(e));
  };

  const clearLogs = () => {
    Alert.alert('Svuota Log', 'Sei sicuro di voler svuotare i log di sistema?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Sì, Svuota', style: 'destructive', onPress: async () => {
        try {
          await apiClient.delete('/api/system/logs');
          setLogs('');
        } catch(e) {
          Alert.alert('Errore', 'Impossibile svuotare i log');
        }
      }}
    ]);
  };

  const handlePrune = (type, title, message) => {
    Alert.alert(title, message, [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Procedi', style: 'destructive', onPress: async () => {
        try {
          const res = await apiClient.post(`/api/docker/${type}/prune`);
          if (res.data.result?.SpaceReclaimed) {
            const space = (res.data.result.SpaceReclaimed / 1024 / 1024).toFixed(2);
            Alert.alert('Completato', `Spazio liberato: ${space} MB`);
          } else {
            Alert.alert('Completato', 'Operazione terminata con successo.');
          }
        } catch(e) {
          Alert.alert('Errore', `Impossibile eseguire la pulizia: ${e.response?.data?.error || e.message}`);
        }
      }}
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Vuoi davvero disconnetterti?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Sì, Esci', style: 'destructive', onPress: () => logout(navigation) },
    ]);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={isTablet ? styles.tabletGrid : null}>
          {/* Sezione Temi */}
          <View style={[styles.section, isTablet && styles.tabletCard]}>
            <View style={styles.sectionHeader}>
              <Palette color={colors.text} size={24} />
              <Text style={styles.sectionTitle}>Aspetto</Text>
            </View>

            <Text style={styles.label}>Modalità Tema</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {['system', 'light', 'dark'].map(mode => (
                <TouchableOpacity 
                  key={mode} 
                  style={[styles.modeBtn, themeMode === mode && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => handleModeChange(mode)}
                >
                  <Text style={[styles.modeText, themeMode === mode && { color: '#fff' }]}>
                    {mode === 'system' ? 'Auto' : mode === 'light' ? 'Chiaro' : 'Scuro'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={styles.label}>Tema Grafico</Text>
            <View style={styles.colorRow}>
              {predefinedThemes.map(theme => {
                const isMonet = theme.id === 'monet';
                let btnColor = theme.primary;
                if (isMonet) {
                  btnColor = (Platform.OS === 'android' && Platform.Version >= 31) 
                    ? PlatformColor('@android:color/system_accent1_500') 
                    : '#3b82f6';
                }
                
                return (
                  <TouchableOpacity 
                    key={theme.id} 
                    style={[
                      styles.colorCircle, 
                      { backgroundColor: btnColor }, 
                      activeTheme === theme.id && styles.colorSelected
                    ]}
                    onPress={() => handleThemeChange(theme.id)}
                  >
                    {isMonet && (
                      <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 18 }}>M</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

          </View>

          {/* Sezione Telegram */}
          <View style={[styles.section, isTablet && styles.tabletCard]}>
            <View style={styles.sectionHeader}>
              <Send color={colors.text} size={24} />
              <Text style={styles.sectionTitle}>Notifiche Telegram</Text>
            </View>
            
            <Text style={styles.label}>Bot Token</Text>
            <TextInput 
              style={styles.input}
              placeholder="Inserisci il token del bot"
              placeholderTextColor={colors.textSecondary}
              value={telegramToken}
              onChangeText={setTelegramToken}
              secureTextEntry
            />

            <Text style={styles.label}>Chat ID</Text>
            <TextInput 
              style={styles.input}
              placeholder="Inserisci l'ID della chat"
              placeholderTextColor={colors.textSecondary}
              value={telegramChatId}
              onChangeText={setTelegramChatId}
            />

            <TouchableOpacity style={styles.primaryBtn} onPress={handleSavePreferences} disabled={savingPrefs}>
              {savingPrefs ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Save color="#fff" size={20} style={{ marginRight: 8 }} />
                  <Text style={styles.primaryBtnText}>Salva Preferenze</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={isTablet ? styles.tabletGrid : null}>
          {/* Pulizia Docker */}
          <View style={[styles.section, isTablet && styles.tabletCard]}>
            <View style={styles.sectionHeader}>
              <Trash2 color={colors.text} size={24} />
              <Text style={styles.sectionTitle}>Pulizia Sistema (Docker Prune)</Text>
            </View>
          
          <TouchableOpacity style={styles.dangerBtn} onPress={() => handlePrune('images', 'Pulizia Immagini', 'Sei sicuro di voler eliminare tutte le immagini Docker non utilizzate?')}>
            <Text style={styles.dangerBtnText}>Pulisci Immagini Orfane</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dangerBtn} onPress={() => handlePrune('volumes', 'Pulizia Volumi', 'Sei sicuro di voler eliminare tutti i volumi non collegati a nessun container? (Potrebbe cancellare dati)')}>
            <Text style={styles.dangerBtnText}>Pulisci Volumi Orfani</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dangerBtn} onPress={() => handlePrune('networks', 'Pulizia Reti', 'Sei sicuro di voler eliminare tutte le reti Docker non utilizzate?')}>
            <Text style={styles.dangerBtnText}>Pulisci Reti Orfane</Text>
          </TouchableOpacity>
        </View>

          {/* Log di Sistema */}
          <View style={[styles.section, isTablet && styles.tabletCard]}>
            <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Log di Sistema</Text>
            <TouchableOpacity onPress={fetchLogs}>
              <RefreshCcw color={colors.primary} size={20} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.logContainer}>
            {logsLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <ScrollView nestedScrollEnabled style={{ maxHeight: 300 }}>
                {logs ? logs.split('\n').map((line, idx) => (
                  <Text key={idx} style={[styles.logText, line.includes('[ERROR]') && { color: colors.error }]}>
                    {line}
                  </Text>
                )) : <Text style={styles.logText}>Nessun log disponibile.</Text>}
              </ScrollView>
            )}
          </View>

            <TouchableOpacity style={[styles.dangerBtn, { marginTop: 12 }]} onPress={clearLogs}>
              <Text style={styles.dangerBtnText}>Svuota Log</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <TouchableOpacity style={[styles.dangerBtn, { marginBottom: 0, flexDirection: 'row', justifyContent: 'center' }]} onPress={handleLogout}>
            <LogOut color={colors.error} size={20} style={{ marginRight: 8 }} />
            <Text style={styles.dangerBtnText}>Disconnetti Account</Text>
          </TouchableOpacity>
        </View>
        
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  tabletGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  tabletCard: {
    flex: 1,
  },
  section: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
    flex: 1,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: colors.background,
    color: colors.text,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: colors.text,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  modeText: {
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dangerBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.error,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  dangerBtnText: {
    color: colors.error,
    fontSize: 16,
    fontWeight: 'bold',
  },
  logContainer: {
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    minHeight: 150,
  },
  logText: {
    color: colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    marginBottom: 4,
  },
});
