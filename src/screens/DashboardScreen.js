import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, RefreshControl, Dimensions, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Cpu, HardDrive, Network, Server, ArrowDown, ArrowUp, Activity, Smartphone } from 'lucide-react-native';
import { apiClient } from '../api/client';
import { useTheme } from '../contexts/ThemeContext';

import { useNavigation } from '@react-navigation/native';

export default function DashboardScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const navigation = useNavigation();
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth >= 768;
  
  // Style calculations based on screen width
  const fullCardStyle = { width: '100%' };
  const cpuCardStyle = isTablet ? { width: (windowWidth - 32 - 32) / 3 } : { width: '100%' };
  const resourceCardStyle = isTablet ? { width: (windowWidth - 32 - 32) / 3 } : { width: (windowWidth - 32 - 16) / 2 };

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
    const interval = setInterval(fetchStats, 5000);
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
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    return `${h}h ${m}m`;
  };

  const ProgressBar = ({ percent, color }) => (
    <View style={styles.progressBarBg}>
      <View style={[styles.progressBarFill, { width: `${Math.min(100, Math.max(0, percent || 0))}%`, backgroundColor: color }]} />
    </View>
  );

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Dashboard</Text>
        <Text style={styles.subHeader}>Panoramica di sistema</Text>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {stats && (
        <View style={styles.grid}>
          {/* SYSTEM INFO Card (Full Width) */}
          <View style={[styles.card, fullCardStyle]}>
            <View style={[styles.cardHeaderFlex, { marginBottom: 0 }]}>
              <View style={styles.rowCentered}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(139, 92, 246, 0.2)' }]}>
                  <Server color="#8b5cf6" size={24} />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Sistema Operativo</Text>
                  <Text style={styles.systemText}>{stats.os?.distro} {stats.os?.release}</Text>
                </View>
              </View>
              <View style={styles.alignEnd}>
                <Text style={styles.cardFooterText}>Uptime</Text>
                <Text style={styles.systemText}>{formatUptime(stats.os?.uptime)}</Text>
              </View>
            </View>
          </View>

          {/* CPU Card */}
          <TouchableOpacity 
            style={[styles.card, cpuCardStyle]} 
            activeOpacity={0.7}
            onPress={() => navigation.navigate('WidgetDetails', { type: 'cpu', title: 'Dettagli Processore' })}
          >
            <View style={styles.cardHeaderFlex}>
              <View style={styles.rowCentered}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
                  <Cpu color="#3b82f6" size={24} />
                </View>
                <Text style={styles.cardTitle}>CPU</Text>
              </View>
              <View style={styles.alignEnd}>
                <Text style={styles.cardValue}>{formatCpu(stats.cpu?.load)}%</Text>
                {!!stats.cpu?.temperature && <Text style={styles.cardFooterText}>{stats.cpu.temperature}°C</Text>}
              </View>
            </View>
            <ProgressBar percent={stats.cpu?.load} color="#3b82f6" />
            <Text style={styles.cardFooterText}>{stats.cpu?.cores || 0} Core(s) attivi</Text>
          </TouchableOpacity>

          {/* RAM Card */}
          <TouchableOpacity 
            style={[styles.card, resourceCardStyle]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('WidgetDetails', { type: 'ram', title: 'Dettagli RAM' })}
          >
            <View style={styles.cardHeaderFlex}>
              <View style={styles.rowCentered}>
                <View style={[styles.iconBoxSmall, { backgroundColor: 'rgba(139, 92, 246, 0.2)' }]}>
                  <Activity color="#8b5cf6" size={20} />
                </View>
                <Text style={styles.cardTitle}>RAM</Text>
              </View>
              <Text style={styles.cardValue}>{stats.memory?.percent || 0}%</Text>
            </View>
            <ProgressBar percent={stats.memory?.percent} color="#8b5cf6" />
            <Text style={styles.cardFooterText}>{formatBytes(stats.memory?.used)} / {formatBytes(stats.memory?.total)}</Text>
          </TouchableOpacity>

          {/* DISK Card */}
          <View style={[styles.card, resourceCardStyle]}>
            <View style={styles.cardHeaderFlex}>
              <View style={styles.rowCentered}>
                <View style={[styles.iconBoxSmall, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                  <HardDrive color="#10b981" size={20} />
                </View>
                <Text style={styles.cardTitle}>Disco</Text>
              </View>
              <Text style={styles.cardValue}>{stats.disk?.percent || 0}%</Text>
            </View>
            <ProgressBar percent={stats.disk?.percent} color="#10b981" />
            <Text style={styles.cardFooterText}>{formatBytes(stats.disk?.used)} / {formatBytes(stats.disk?.total)}</Text>
          </View>

          {/* NETWORK Card */}
          <View style={[styles.card, fullCardStyle]}>
            <View style={styles.cardHeaderFlex}>
              <View style={styles.rowCentered}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                  <Network color="#f59e0b" size={24} />
                </View>
                <Text style={styles.cardTitle}>Traffico Rete</Text>
              </View>
            </View>
            <View style={styles.networkStats}>
              <View style={styles.networkCol}>
                <ArrowDown color="#10b981" size={20} />
                <View>
                  <Text style={styles.networkValue}>{formatBytes(stats.network?.rx_sec)}/s</Text>
                  <Text style={styles.cardFooterText}>Download</Text>
                </View>
              </View>
              <View style={styles.networkCol}>
                <ArrowUp color="#3b82f6" size={20} />
                <View>
                  <Text style={styles.networkValue}>{formatBytes(stats.network?.tx_sec)}/s</Text>
                  <Text style={styles.cardFooterText}>Upload</Text>
                </View>
              </View>
            </View>
          </View>

        </View>
      )}
    </ScrollView>
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
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContainer: {
    marginBottom: 20,
    marginTop: 8,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  subHeader: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 4,
  },
  errorBox: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeaderFlex: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rowCentered: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alignEnd: {
    alignItems: 'flex-end',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconBoxSmall: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardTitle: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  cardValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: 'bold',
  },
  cardFooterText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  networkStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 4,
  },
  networkCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  networkValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  systemText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
});
