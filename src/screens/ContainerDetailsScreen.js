import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, TouchableOpacity, Alert, RefreshControl, Linking } from 'react-native';
import { Image } from 'expo-image';
import { Settings, Play, Square, RotateCw, Globe, RefreshCcw, Github } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiClient } from '../api/client';
import { useTheme } from '../contexts/ThemeContext';
import { useAlert } from '../contexts/AlertContext';
import { SPACING, HEADER } from '../constants/layout';

const getContainerColor = (name) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 60%, 50%)`;
};

export default function ContainerDetailsScreen({ route, navigation }) {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();

  const { containerId, containerName } = route.params;
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [containerOverrides, setContainerOverrides] = useState({});

  const fetchPreferences = async () => {
    try {
      const res = await apiClient.get('/api/system/preferences');
      if (res.data.containerOverrides) setContainerOverrides(res.data.containerOverrides);
    } catch (e) {
      console.error('Error loading preferences', e);
    }
  };

  const fetchDetails = async () => {
    try {
      const res = await apiClient.get(`/api/docker/containers/${containerId}/inspect`);
      setDetails(res.data);
    } catch (e) {
      console.error(e);
      showAlert('Error', 'Cannot retrieve container details: ' + (e.response?.data?.error || e.message));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const stableId = details?.Name?.replace(/^\//, '') || containerId;
    const override = containerOverrides[stableId];
    const actualName = (override && override.displayName) || details?.Config?.Labels?.['casaos.reborn.name'] || containerName || 'Container Details';
    
    navigation.setOptions({
      title: actualName
    });
  }, [containerId, containerName, navigation, details, containerOverrides]);

  useFocusEffect(
    useCallback(() => {
      fetchPreferences();
      fetchDetails();
    }, [containerId])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPreferences();
    fetchDetails();
  }, [containerId]);

  const handleAction = async (action) => {
    setActionLoading(true);
    try {
      await apiClient.post(`/api/docker/containers/${containerId}/${action}`);
      await fetchDetails();
    } catch (e) {
      console.error(e);
      showAlert('Error', `Cannot execute ${action}: ` + (e.response?.data?.error || e.message));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top + HEADER.totalOffset }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!details) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.textSecondary }}>Details not found</Text>
      </View>
    );
  }

  const isRunning = details.State?.Running || false;
  const statusColor = isRunning ? colors.success : colors.error;

  const getContainerUrl = () => {
    if (!details) return null;
    const stableId = details.Name?.replace(/^\//, '') || containerId;
    const override = containerOverrides[stableId];
    
    const baseUrl = apiClient.defaults.baseURL || '';
    const hostname = baseUrl.replace(/^https?:\/\//, '').split(':')[0].split('/')[0];
    if (!hostname) return null;

    if (override && override.url) {
      if (override.url.startsWith('http')) return override.url;
      return `http://${hostname}:${override.url}`;
    }

    const labels = details.Config?.Labels || {};
    let port = labels['casaos.reborn.webport'] || labels['casaos.reborn.port'];
    
    if (!port && details.NetworkSettings?.Ports) {
      // Find the first mapped public port
      for (const [key, val] of Object.entries(details.NetworkSettings.Ports)) {
        if (val && val.length > 0) {
          port = val[0].HostPort;
          break;
        }
      }
    }
    
    if (port) {
      return `http://${hostname}:${port}`;
    }
    return null;
  };

  const webUrl = isRunning ? getContainerUrl() : null;

  const stableId = details.Name?.replace(/^\//, '') || containerId;
  const override = containerOverrides[stableId];
  let iconUrl = (override && override.icon) || (details.Config?.Labels && details.Config.Labels['casaos.reborn.icon']);
  
  if (iconUrl && typeof iconUrl === 'string') {
      iconUrl = iconUrl.trim();
      if (!iconUrl.startsWith('http') && !iconUrl.startsWith('data:')) {
          if (!iconUrl.startsWith('/')) iconUrl = '/' + iconUrl;
          iconUrl = `${apiClient.defaults.baseURL}${iconUrl}`;
      }
  }

  const initial = stableId.charAt(0).toUpperCase();
  const bgColor = getContainerColor(stableId);

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={{ 
        paddingHorizontal: SPACING.base, 
        paddingBottom: 120, 
        paddingTop: insets.top + HEADER.totalOffset 
      }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.headerCard}>
        {iconUrl ? (
          <Image 
            source={{ 
              uri: iconUrl,
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
            }} 
            style={{ width: 64, height: 64, borderRadius: 12, marginRight: 16 }} 
            contentFit="contain"
            transition={200}
          />
        ) : (
          <View style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
            <Text style={[{ color: 'white' }, typography.h1]}>{initial}</Text>
          </View>
        )}
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
            {(override && override.displayName) || details.Config?.Labels?.['casaos.reborn.name'] || stableId}
          </Text>
          <Text style={[styles.status, { color: statusColor }]}>
            {details.State?.Status?.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>General Info</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Image</Text>
          <Text style={styles.value} numberOfLines={1} ellipsizeMode="middle">{details.Config?.Image}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>ID</Text>
          <Text style={styles.value} numberOfLines={1} ellipsizeMode="tail">{details.Id?.substring(0, 12)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Created on</Text>
          <Text style={styles.value}>{new Date(details.Created).toLocaleString()}</Text>
        </View>
      </View>
      <View style={styles.actionRow}>
        {actionLoading ? (
          <ActivityIndicator color={colors.primary} size="small" />
        ) : (
          <View style={styles.actionGrid}>
            {isRunning ? (
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction('stop')}>
                <Square color={colors.error} size={24} fill={colors.error} />
                <Text style={[styles.actionText, { color: colors.error }]}>Stop</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction('start')}>
                <Play color={colors.success} size={24} fill={colors.success} />
                <Text style={[styles.actionText, { color: colors.success }]}>Start</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction('restart')}>
              <RotateCw color={colors.primary} size={24} />
              <Text style={styles.actionText}>Restart</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionBtn} 
              onPress={async () => {
                setActionLoading(true);
                try {
                  await apiClient.post(`/api/docker/containers/${containerId}/update`, { image: details.Config?.Image });
                  navigation.navigate('ContainersList');
                } catch (e) {
                  showAlert('Error', 'Cannot recreate container: ' + (e.response?.data?.error || e.message));
                } finally {
                  setActionLoading(false);
                }
              }}
            >
              <RefreshCcw color={colors.primary} size={24} />
              <Text style={styles.actionText}>Recreate</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionBtn} 
              onPress={() => {
                if (stableId === 'casaos-reborn') {
                  navigation.navigate('Updates', { screen: 'SystemContainerSettings' });
                } else {
                  navigation.navigate('ContainerSettings', { containerId, containerName, details });
                }
              }}
            >
              <Settings color={colors.primary} size={24} />
              <Text style={styles.actionText}>Settings</Text>
            </TouchableOpacity>

            {isRunning && webUrl && (
              <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openURL(webUrl).catch(() => showAlert('Error', 'Cannot open link'))}>
                <Globe color={colors.primary} size={24} />
                <Text style={styles.actionText}>Web</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={styles.actionBtn} 
              onPress={() => {
                const image = details.Config?.Image || '';
                const sourceUrl = details.Config?.Labels?.['org.opencontainers.image.source'] || details.Config?.Labels?.['org.opencontainers.image.url'];
                if (sourceUrl && sourceUrl.startsWith('http')) {
                  Linking.openURL(sourceUrl).catch(() => showAlert('Error', 'Cannot open link'));
                } else {
                  const imageBase = image.split(':')[0];
                  Linking.openURL(`https://github.com/search?q=${encodeURIComponent(imageBase)}&type=repositories`).catch(() => showAlert('Error', 'Cannot open link'));
                }
              }}
            >
              <Github color={colors.primary} size={24} />
              <Text style={styles.actionText}>Source</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

    </ScrollView>
  );
}

const createStyles = (colors, typography) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCard: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    marginBottom: 4,
  },
  status: {
    ...typography.body,
    color: colors.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
    minHeight: 50,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  actionBtn: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 100,
    marginBottom: 4,
  },
  actionText: {
    ...typography.bodyMedium,
    color: colors.text,
    marginTop: 8,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  value: {
    ...typography.bodyMedium,
    color: colors.text,
    flex: 2,
    textAlign: 'right',
  },
});
