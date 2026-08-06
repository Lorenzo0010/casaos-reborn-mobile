import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, useWindowDimensions, PlatformColor, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';

import { useTheme, predefinedThemes } from '../contexts/ThemeContext';
import { useAlert } from '../contexts/AlertContext';
import { apiClient, logout } from '../api/client';
import { Palette, Send, Save, RefreshCcw, LogOut, DownloadCloud, CloudSun, Settings } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEdit } from '../contexts/EditContext';
import { SPACING, HEADER, CARD, FADE, CONTENT, isTabletWidth } from '../constants/layout';

export default function AdvancedScreen() {
  const { isLayoutUnlocked, setIsLayoutUnlocked } = useEdit();
  const { colors, activeTheme, currentTheme, themeMode, changeTheme, typography, isDark } = useTheme();
  const { showAlert } = useAlert();
  const styles = createStyles(colors, typography);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = isTabletWidth(width);
  const navigation = useNavigation();

  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [weatherCity, setWeatherCity] = useState('Roma');
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [betaUpdates, setBetaUpdates] = useState(false);
  const [updateChannel, setUpdateChannel] = useState('stable');

  const [logs, setLogs] = useState('');
  const [logsLoading, setLogsLoading] = useState(true);

  useEffect(() => {
    fetchPreferences();
    fetchLogs();

    AsyncStorage.getItem('beta_updates').then(val => {
      setBetaUpdates(val === 'true');
    }).catch(e => console.error('Failed to load beta pref', e));
  }, []);

  const toggleBetaUpdates = async (value) => {
    if (value) {
      showAlert(
        'Warning',
        'Pre-releases are in active development and can become very unstable. They are not recommended for production use. Do you want to enable them anyway?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Yes, Enable',
            style: 'destructive',
            onPress: async () => {
              setBetaUpdates(true);
              try {
                await AsyncStorage.setItem('beta_updates', 'true');
              } catch (e) {
                console.error('Failed to save beta pref', e);
              }
            }
          }
        ]
      );
    } else {
      setBetaUpdates(false);
      try {
        await AsyncStorage.setItem('beta_updates', 'false');
      } catch (e) {
        console.error('Failed to save beta pref', e);
      }
    }
  };

  const fetchPreferences = async () => {
    try {
      const res = await apiClient.get('/api/system/preferences');
      if (res.data) {
        if (res.data.telegramToken) setTelegramToken(res.data.telegramToken);
        if (res.data.telegramChatId) setTelegramChatId(res.data.telegramChatId);
        if (res.data.weatherCity) setWeatherCity(res.data.weatherCity);
        if (res.data.updateChannel) setUpdateChannel(res.data.updateChannel);
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
      showAlert('Error', 'Cannot load logs');
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
        weatherCity,
        mobileTheme: activeTheme,
        themeMode
      });
      showAlert('Success', 'Preferences saved successfully');
    } catch (e) {
      showAlert('Error', 'Cannot save preferences');
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleThemeChange = (themeId) => {
    changeTheme(themeId, themeMode);
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

  const handleChannelChange = (channel) => {
    setUpdateChannel(channel);
    apiClient.get('/api/system/preferences').then(res => {
      const prefs = res.data || {};
      apiClient.post('/api/system/preferences', {
        ...prefs,
        updateChannel: channel
      }).catch(e => console.error(e));
    }).catch(e => console.error(e));
  };

  const clearLogs = () => {
    showAlert('Clear Logs', 'Are you sure you want to clear the system logs?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes, Clear', style: 'destructive', onPress: async () => {
          try {
            await apiClient.delete('/api/system/logs');
            setLogs('');
          } catch (e) {
            showAlert('Error', 'Cannot clear logs');
          }
        }
      }
    ]);
  };


  const handleLogout = () => {
    showAlert('Logout', 'Do you really want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes, Log Out', style: 'destructive', onPress: () => logout(navigation) },
    ]);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + HEADER.totalOffset }]}
        keyboardShouldPersistTaps="handled"
      >

        <View style={isTablet ? styles.tabletGrid : null}>
          <View style={[styles.section, isTablet && styles.tabletCard]}>
            <View style={styles.sectionHeader}>
              <Settings color={colors.text} size={24} />
              <Text style={styles.sectionTitle}>CasaOS System</Text>
            </View>
            <Text style={{ ...typography.caption, color: colors.textSecondary, marginBottom: 16 }}>
              Main container settings (Ports, Volumes, Environment, etc.)
            </Text>

            <Text style={styles.label}>Backend Update Channel</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
              <TouchableOpacity
                style={[styles.modeBtn, updateChannel === 'stable' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => handleChannelChange('stable')}
              >
                <Text style={[styles.modeText, updateChannel === 'stable' && { color: '#fff' }]}>Stable</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtn, updateChannel === 'dev' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => handleChannelChange('dev')}
              >
                <Text style={[styles.modeText, updateChannel === 'dev' && { color: '#fff' }]}>Dev</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Mobile App Updates</Text>
            <Text style={{ ...typography.caption, color: colors.textSecondary, marginBottom: 8 }}>
              Install pre-release updates (beta) that may contain bugs.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              <TouchableOpacity
                style={[styles.modeBtn, !betaUpdates && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => toggleBetaUpdates(false)}
              >
                <Text style={[styles.modeText, !betaUpdates && { color: '#fff' }]}>Stable</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtn, betaUpdates && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => toggleBetaUpdates(true)}
              >
                <Text style={[styles.modeText, betaUpdates && { color: '#fff' }]}>Beta</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('SystemContainerSettings')}>
              <Settings color="#fff" size={20} style={{ marginRight: 8 }} />
              <Text style={styles.primaryBtnText}>Configure System</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={isTablet ? styles.tabletGrid : null}>
          <View style={[styles.section, isTablet && styles.tabletCard]}>
            <View style={styles.sectionHeader}>
              <Palette color={colors.text} size={24} />
              <Text style={styles.sectionTitle}>Appearance</Text>
            </View>

            <Text style={styles.label}>Theme Mode</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {['system', 'light', 'dark'].map(mode => (
                <TouchableOpacity
                  key={mode}
                  style={[styles.modeBtn, themeMode === mode && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => handleModeChange(mode)}
                >
                  <Text style={[styles.modeText, themeMode === mode && { color: '#fff' }]}>
                    {mode === 'system' ? 'Auto' : mode === 'light' ? 'Light' : 'Dark'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Graphic Theme</Text>
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
                      {
                        backgroundColor: isDark ? theme.darkSurface : theme.lightSurface,
                        borderWidth: activeTheme === theme.id ? 2 : 1,
                        borderColor: activeTheme === theme.id ? colors.text : colors.border,
                      }
                    ]}
                    onPress={() => handleThemeChange(theme.id)}
                  >
                    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: btnColor, alignItems: 'center', justifyContent: 'center' }}>
                      {isMonet && (
                        <Text style={{ color: '#ffffff', fontSize: 12, fontFamily: 'Inter_700Bold' }}>M</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Sblocca Layout all'interno di Appearance */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24 }}>
              <View style={{ flex: 1, marginRight: 16 }}>
                <Text style={styles.label}>Unlock Layout Editing</Text>
                <Text style={{ ...typography.caption, color: colors.textSecondary }}>
                  Allows reordering of widgets and containers across the app. Changes are saved automatically.
                </Text>
              </View>
              <Switch
                value={isLayoutUnlocked}
                onValueChange={setIsLayoutUnlocked}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={Platform.OS === 'android' ? (isLayoutUnlocked ? '#ffffff' : '#f4f3f4') : ''}
              />
            </View>

          </View>

          {/* Sezione Telegram */}
          <View style={[styles.section, isTablet && styles.tabletCard]}>
            <View style={styles.sectionHeader}>
              <Send color={colors.text} size={24} />
              <Text style={styles.sectionTitle}>Telegram Notifications</Text>
            </View>

            <Text style={styles.label}>Bot Token</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter bot token"
              placeholderTextColor={colors.textSecondary}
              value={telegramToken}
              onChangeText={setTelegramToken}
              secureTextEntry
            />

            <Text style={styles.label}>Chat ID</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter chat ID"
              placeholderTextColor={colors.textSecondary}
              value={telegramChatId}
              onChangeText={setTelegramChatId}
            />

            <TouchableOpacity style={styles.primaryBtn} onPress={handleSavePreferences} disabled={savingPrefs}>
              {savingPrefs ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Send color="#fff" size={20} style={{ marginRight: 8 }} />
                  <Text style={styles.primaryBtnText}>Send Test</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={[styles.section, isTablet && styles.tabletCard]}>
            <View style={styles.sectionHeader}>
              <CloudSun color={colors.text} size={24} />
              <Text style={styles.sectionTitle}>Weather Settings</Text>
            </View>

            <Text style={styles.label}>City Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Rome, Milan, Naples"
              placeholderTextColor={colors.textSecondary}
              value={weatherCity}
              onChangeText={setWeatherCity}
            />

            <TouchableOpacity style={styles.primaryBtn} onPress={handleSavePreferences} disabled={savingPrefs}>
              {savingPrefs ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Save color="#fff" size={20} style={{ marginRight: 8 }} />
                  <Text style={styles.primaryBtnText}>Save Weather</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={isTablet ? styles.tabletGrid : null}>
          <View style={[styles.section, isTablet && styles.tabletCard]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>System Logs</Text>
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
                  )) : <Text style={styles.logText}>No logs available.</Text>}
                </ScrollView>
              )}
            </View>

            <TouchableOpacity style={[styles.dangerBtn, { marginTop: 12 }]} onPress={clearLogs}>
              <Text style={styles.dangerBtnText}>Clear Logs</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <TouchableOpacity style={[styles.dangerBtn, { marginBottom: 0, flexDirection: 'row', justifyContent: 'center' }]} onPress={handleLogout}>
            <LogOut color={colors.error} size={20} style={{ marginRight: 8 }} />
            <Text style={styles.dangerBtnText}>Disconnect Account</Text>
          </TouchableOpacity>
        </View>

        {/* Version Info */}
        <View style={{ alignItems: 'center', marginTop: 16, marginBottom: 24 }}>
          <Text style={{ ...typography.caption, color: colors.textSecondary }}>
            App Version: {Constants.expoConfig?.version || '1.0.0'} ({Constants.expoConfig?.extra?.buildType || 'Dev'})
          </Text>
        </View>

      </ScrollView>

    </KeyboardAvoidingView>
  );
}

const createStyles = (colors, typography) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: SPACING.base,
    paddingBottom: CONTENT.paddingBottom,
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
    padding: CARD.padding,
    borderRadius: CARD.borderRadius,
    marginBottom: CARD.gap,
    borderWidth: CARD.borderWidth,
    borderColor: colors.surfaceElevated === colors.surface ? colors.border : colors.surfaceElevated,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: CARD.shadowOpacity,
    shadowRadius: CARD.shadowRadius,
    elevation: CARD.elevation,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginLeft: 12,
    flex: 1,
  },
  label: {
    ...typography.body,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    ...typography.body,
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
    ...typography.body,
    fontFamily: 'Inter_700Bold',
    color: colors.textSecondary,
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
    ...typography.button,
    color: '#ffffff',
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
    ...typography.button,
    color: colors.error,
  },
  logContainer: {
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    minHeight: 150,
  },
  logText: {
    ...typography.caption,
    color: '#4ade80',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 4,
  },
});
