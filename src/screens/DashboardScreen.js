import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { apiClient } from '../api/client';
import { colors } from '../theme';

export default function DashboardScreen() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      setError(null);
      const res = await apiClient.get('/api/system/stats');
      setStats(res.data);
    } catch (e) {
      console.error(e);
      setError('Impossibile recuperare i dati dal server');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000); // 5 secondi
    return () => clearInterval(interval);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStats();
  }, []);

  if (loading && !stats) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const formatBytes = (bytes) => {
    if (bytes === undefined || isNaN(bytes)) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = bytes === 0 ? 0 : Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatCpu = (cpu) => {
    if (cpu === undefined || isNaN(cpu)) return '0.0';
    return parseFloat(cpu).toFixed(1);
  };

  const formatUptime = (seconds) => {
    if (!seconds) return '0h 0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <Text style={styles.header}>System Overview</Text>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {stats && (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>CPU Usage</Text>
            <Text style={styles.cardValue}>{formatCpu(stats.cpu?.load)}%</Text>
            {stats.cpu?.temperature && (
              <Text style={styles.cardSubtext}>{stats.cpu.temperature}°C - {stats.cpu.cores} Cores</Text>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>RAM Usage</Text>
            <Text style={styles.cardValue}>
              {formatBytes(stats.memory?.used)} / {formatBytes(stats.memory?.total)}
            </Text>
            <Text style={styles.cardSubtext}>{stats.memory?.percent}% Used</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Primary Disk</Text>
            <Text style={styles.cardValue}>
              {formatBytes(stats.disk?.used)} / {formatBytes(stats.disk?.total)}
            </Text>
            <Text style={styles.cardSubtext}>{stats.disk?.percent}% Used</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Network (Current)</Text>
            <Text style={styles.cardValue}>
              ↓ {formatBytes(stats.network?.rx_sec)}/s
            </Text>
            <Text style={styles.cardValue}>
              ↑ {formatBytes(stats.network?.tx_sec)}/s
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>OS Info</Text>
            <Text style={styles.cardSubtext}>{stats.os?.distro} {stats.os?.release}</Text>
            <Text style={styles.cardSubtext}>Uptime: {formatUptime(stats.os?.uptime)}</Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
  },
  errorBox: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  cardTitle: {
    color: colors.textSecondary,
    fontSize: 16,
    marginBottom: 8,
  },
  cardValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardSubtext: {
    color: colors.textSecondary,
    fontSize: 14,
  }
});
