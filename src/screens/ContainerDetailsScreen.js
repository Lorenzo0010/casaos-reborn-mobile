import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { Settings, Play, Square, RotateCw } from 'lucide-react-native';
import { apiClient } from '../api/client';
import { colors } from '../theme';

export default function ContainerDetailsScreen({ route, navigation }) {
  const { containerId, containerName } = route.params;
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDetails = async () => {
    try {
      const res = await apiClient.get(`/api/docker/containers/${containerId}/inspect`);
      setDetails(res.data);
    } catch (e) {
      console.error(e);
      Alert.alert('Errore', 'Impossibile recuperare i dettagli del container: ' + (e.response?.data?.error || e.message));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    navigation.setOptions({
      title: containerName || 'Dettagli Container',
      headerRight: () => (
        <TouchableOpacity onPress={() => navigation.navigate('ContainerSettings', { containerId, containerName })} style={{ marginRight: 16 }}>
          <Settings color={colors.text} size={24} />
        </TouchableOpacity>
      )
    });
    fetchDetails();
  }, [containerId, containerName, navigation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDetails();
  }, [containerId]);

  const handleAction = async (action) => {
    setActionLoading(true);
    try {
      await apiClient.post(`/api/docker/containers/${containerId}/${action}`);
      await fetchDetails();
    } catch (e) {
      console.error(e);
      Alert.alert('Errore', `Impossibile eseguire ${action}: ` + (e.response?.data?.error || e.message));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!details) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.textSecondary }}>Dettagli non trovati</Text>
      </View>
    );
  }

  const isRunning = details.State?.Running || false;
  const statusColor = isRunning ? colors.success : colors.error;

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.headerCard}>
        <Text style={styles.title}>{details.Name?.replace(/^\//, '') || containerName}</Text>
        <Text style={[styles.status, { color: statusColor }]}>
          {details.State?.Status?.toUpperCase()}
        </Text>
      </View>

      <View style={styles.actionRow}>
        {actionLoading ? (
          <ActivityIndicator color={colors.primary} size="small" />
        ) : (
          <>
            {isRunning ? (
              <>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction('restart')}>
                  <RotateCw color={colors.primary} size={24} />
                  <Text style={styles.actionText}>Restart</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction('stop')}>
                  <Square color={colors.error} size={24} fill={colors.error} />
                  <Text style={[styles.actionText, { color: colors.error }]}>Stop</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction('start')}>
                <Play color={colors.success} size={24} fill={colors.success} />
                <Text style={[styles.actionText, { color: colors.success }]}>Start</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Info Generali</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Immagine</Text>
          <Text style={styles.value} numberOfLines={1} ellipsizeMode="middle">{details.Config?.Image}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>ID</Text>
          <Text style={styles.value} numberOfLines={1} ellipsizeMode="tail">{details.Id?.substring(0, 12)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Creato il</Text>
          <Text style={styles.value}>{new Date(details.Created).toLocaleString()}</Text>
        </View>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  status: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
    minHeight: 50,
  },
  actionBtn: {
    alignItems: 'center',
    marginHorizontal: 16,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    minWidth: 80,
  },
  actionText: {
    color: colors.primary,
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
    flex: 1,
  },
  value: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
});
