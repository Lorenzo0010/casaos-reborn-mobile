import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, RefreshControl, Dimensions, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Cpu, HardDrive, Network, Server, ArrowDown, ArrowUp, Activity } from 'lucide-react-native';
import { apiClient } from '../api/client';
import { useTheme } from '../contexts/ThemeContext';

import { useNavigation } from '@react-navigation/native';

const WidgetCard = ({ title, icon, color, style, onPress, mainValue, percent, subLeft, subRight }) => {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  
  const CardComponent = onPress ? TouchableOpacity : View;

  return (
    <CardComponent 
      style={[styles.card, style]} 
      onPress={onPress} 
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.cardHeaderFlex}>
        <View style={styles.rowCentered}>
          <View style={[styles.iconBox, { backgroundColor: `${color}33` }]}>
            {icon}
          </View>
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
        <Text style={styles.cardValue}>{mainValue}</Text>
      </View>

      {percent !== undefined && (
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${Math.min(100, Math.max(0, percent))}%`, backgroundColor: color }]} />
        </View>
      )}

      {percent === undefined && <View style={styles.spacer} />}

      <View style={styles.footerRow}>
        {subLeft}
        {subRight}
      </View>
    </CardComponent>
  );
};
export default function DashboardScreen() {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);

  const navigation = useNavigation();
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth >= 768;

  const fullCardStyle = { width: '100%' };
  const cpuCardStyle = isTablet ? { flex: 1, minWidth: '30%' } : { width: '100%' };
  const resourceCardStyle = isTablet ? { flex: 1, minWidth: '30%' } : { width: '100%' };

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
    if (cpu === undefined || isNaN(cpu)) return '0';
    return Math.round(cpu).toString();
  };

  const formatUptime = (seconds) => {
    if (!seconds) return '0h 0m';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}g ${h}h`;
    return `${h}h ${m}m`;
  };


  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >


        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {stats && (
          <View style={styles.grid}>
            {/* SYSTEM INFO Card (Full Width) */}
            <WidgetCard
              title="Sistema"
              icon={<Server color="#8b5cf6" size={20} />}
              color="#8b5cf6"
              style={fullCardStyle}
              mainValue={formatUptime(stats.os?.uptime)}
              subLeft={<Text style={styles.cardFooterText}>{stats.os?.distro} {stats.os?.release}</Text>}
              subRight={<Text style={styles.cardFooterText}>Uptime</Text>}
            />

            {/* CPU Card */}
            <WidgetCard
              title="CPU"
              icon={<Cpu color="#3b82f6" size={20} />}
              color="#3b82f6"
              style={cpuCardStyle}
              onPress={() => navigation.navigate('WidgetDetails', { type: 'cpu', title: 'Dettagli Processore' })}
              mainValue={`${formatCpu(stats.cpu?.load)}% ${stats.cpu?.temperature ? `| ${Math.round(stats.cpu.temperature)}°C` : ''}`}
              percent={stats.cpu?.load}
              subLeft={<Text style={styles.cardFooterText}>{stats.cpu?.cores || 0} Core</Text>}
              subRight={<Text style={styles.cardFooterText}>Attivi</Text>}
            />

            {/* RAM Card */}
            <WidgetCard
              title="RAM"
              icon={<Activity color="#8b5cf6" size={20} />}
              color="#8b5cf6"
              style={resourceCardStyle}
              onPress={() => navigation.navigate('WidgetDetails', { type: 'ram', title: 'Dettagli RAM' })}
              mainValue={`${Math.round(stats.memory?.percent || 0)}%`}
              percent={stats.memory?.percent}
              subLeft={<Text style={styles.cardFooterText}>{formatBytes(stats.memory?.used)}</Text>}
              subRight={<Text style={styles.cardFooterText}>{formatBytes(stats.memory?.total)}</Text>}
            />

            {/* DISK Card */}
            <WidgetCard
              title="Disco"
              icon={<HardDrive color="#10b981" size={20} />}
              color="#10b981"
              style={resourceCardStyle}
              mainValue={`${Math.round(stats.disk?.percent || 0)}%`}
              percent={stats.disk?.percent}
              subLeft={<Text style={styles.cardFooterText}>{formatBytes(stats.disk?.used)}</Text>}
              subRight={<Text style={styles.cardFooterText}>{formatBytes(stats.disk?.total)}</Text>}
            />

            {/* NETWORK Card */}
            <WidgetCard
              title="Rete"
              icon={<Network color="#f59e0b" size={20} />}
              color="#f59e0b"
              style={fullCardStyle}
              mainValue="In Tempo Reale"
              subLeft={
                <View style={styles.networkCol}>
                  <ArrowDown color="#10b981" size={16} />
                  <Text style={styles.networkValue}>{formatBytes(stats.network?.rx_sec)}/s</Text>
                </View>
              }
              subRight={
                <View style={styles.networkCol}>
                  <ArrowUp color="#3b82f6" size={16} />
                  <Text style={styles.networkValue}>{formatBytes(stats.network?.tx_sec)}/s</Text>
                </View>
              }
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors, typography) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  subHeader: {
    ...typography.subtitle,
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
    ...typography.bodyMedium,
    color: colors.error,
    textAlign: 'center',
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
  },
  rowCentered: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.textSecondary,
  },
  cardValue: {
    ...typography.h3,
    color: colors.text,
  },
  spacer: {
    height: 12,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 12,
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardFooterText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  networkCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  networkValue: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textSecondary,
  },
});
