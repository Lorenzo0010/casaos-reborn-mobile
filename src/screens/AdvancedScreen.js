import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { useTheme, predefinedAccents, predefinedBackgrounds } from '../contexts/ThemeContext';
import { apiClient } from '../api/client';
import { Palette, Trash2, Send, Save, RefreshCcw } from 'lucide-react-native';

export default function AdvancedScreen() {
  const { colors, accentColor, bgTheme, changeTheme } = useTheme();
  const styles = createStyles(colors);
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

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
        accentColor,
        bgTheme
      });
      Alert.alert('Successo', 'Preferenze salvate correttamente');
    } catch (e) {
      Alert.alert('Errore', 'Impossibile salvare le preferenze');
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleThemeChange = (type, val) => {
    if (type === 'accent') {
      changeTheme(val, bgTheme);
    } else {
      changeTheme(accentColor, val);
    }
    // Salvataggio sul server in background
    apiClient.get('/api/system/preferences').then(res => {
      const prefs = res.data || {};
      apiClient.post('/api/system/preferences', {
        ...prefs,
        accentColor: type === 'accent' ? val : accentColor,
        bgTheme: type === 'bg' ? val : bgTheme
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
            
            <Text style={styles.label}>Colore Principale (Accent)</Text>
            <View style={styles.colorRow}>
              {predefinedAccents.map(acc => (
                <TouchableOpacity 
                  key={acc.name} 
                  style={[styles.colorCircle, { backgroundColor: acc.hex }, accentColor === acc.hex && styles.colorSelected]}
                  onPress={() => handleThemeChange('accent', acc.hex)}
                />
              ))}
            </View>

            <Text style={[styles.label, { marginTop: 16 }]}>Tema Sfondo</Text>
            <View style={styles.colorRow}>
              {predefinedBackgrounds.map(bg => (
                <TouchableOpacity 
                  key={bg.id} 
                  style={[styles.colorCircle, { backgroundColor: bg.darkHex, borderWidth: 1, borderColor: '#444' }, bgTheme === bg.id && styles.colorSelected]}
                  onPress={() => handleThemeChange('bg', bg.id)}
                />
              ))}
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

        {/* Pulizia Docker */}
        <View style={styles.section}>
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
        <View style={styles.section}>
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
    paddingBottom: 40,
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
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: '#ffffff',
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
