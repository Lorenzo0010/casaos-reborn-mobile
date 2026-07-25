import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, RefreshControl, Dimensions } from 'react-native';
import { Cpu, Activity, Server, Activity as ProcessIcon } from 'lucide-react-native';
import { apiClient } from '../api/client';
import { useTheme } from '../contexts/ThemeContext';

export default function WidgetDetailsScreen({ route }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const { type } = route.params || {}; // 'cpu' or 'ram'
  const [processes, setProcesses] = useState([]);
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setError(null);
      const res = await apiClient.get('/api/system/processes');
      // I dati arrivano già ordinati per CPU dal backend
      // Se l'utente ha cliccato su RAM, riordiniamo per RAM
      let pList = res.data.processes || [];
      let cList = res.data.containers || [];

      if (type === 'ram') {
        pList.sort((a, b) => b.mem - a.mem);
        cList.sort((a, b) => b.mem - a.mem);
      }

      setProcesses(pList);
      setContainers(cList);
    } catch (e) {
      console.error(e);
      setError('Impossibile recuperare i processi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // refresh every 5s
    return () => clearInterval(interval);
  }, [type]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [type]);

  const formatBytes = (bytes) => {
    if (!bytes || isNaN(bytes)) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading && !processes.length && !containers.length) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isCpu = type === 'cpu';

  return (
    <ScrollView 
      style={styles.container}
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

      {/* Containers List */}
      {containers.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Server color={colors.primary} size={20} />
            <Text style={styles.sectionTitle}>Container (Top 10)</Text>
          </View>
          
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 3 }]}>Nome</Text>
            {isCpu && <Text style={[styles.th, { flex: 1, textAlign: 'right', color: colors.primary }]}>CPU</Text>}
            {!isCpu && <Text style={[styles.th, { flex: 1.5, textAlign: 'right', color: colors.primary }]}>RAM</Text>}
          </View>

          {containers.map((c, idx) => (
            <View key={c.id || idx} style={styles.tableRow}>
              <Text style={[styles.td, styles.tdName, { flex: 3 }]} numberOfLines={1}>{c.name}</Text>
              {isCpu && (
                <Text style={[styles.td, { flex: 1, textAlign: 'right', fontWeight: 'bold', color: colors.primary }]}>
                  {c.cpu?.toFixed(1)}%
                </Text>
              )}
              {!isCpu && (
                <Text style={[styles.td, { flex: 1.5, textAlign: 'right', fontWeight: 'bold', color: colors.primary }]}>
                  {c.memBytes ? formatBytes(c.memBytes) : `${c.mem?.toFixed(1)}%`}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Processes List */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ProcessIcon color={colors.textSecondary} size={20} />
          <Text style={styles.sectionTitle}>Processi di Sistema (Top 30)</Text>
        </View>
        
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { flex: 3 }]}>Nome</Text>
          {isCpu && <Text style={[styles.th, { flex: 1, textAlign: 'right', color: colors.primary }]}>CPU</Text>}
          {!isCpu && <Text style={[styles.th, { flex: 1.5, textAlign: 'right', color: colors.primary }]}>RAM</Text>}
        </View>

        {processes.slice(0, 30).map((p, idx) => (
          <View key={p.pid || idx} style={styles.tableRow}>
            <View style={{ flex: 3, flexDirection: 'column' }}>
              <Text style={[styles.td, styles.tdName]} numberOfLines={1}>{p.name}</Text>
              <Text style={styles.tdSubtext}>PID: {p.pid} | {p.user}</Text>
            </View>
            {isCpu && (
              <Text style={[styles.td, { flex: 1, textAlign: 'right', fontWeight: 'bold', color: colors.primary }]}>
                {p.cpu?.toFixed(1)}%
              </Text>
            )}
            {!isCpu && (
              <Text style={[styles.td, { flex: 1.5, textAlign: 'right', fontWeight: 'bold', color: colors.primary }]}>
                {p.memBytes ? formatBytes(p.memBytes) : `${p.mem?.toFixed(1)}%`}
              </Text>
            )}
          </View>
        ))}
      </View>
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
  section: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 8,
    marginBottom: 8,
  },
  th: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  td: {
    color: colors.text,
    fontSize: 14,
  },
  tdName: {
    fontWeight: '500',
  },
  tdSubtext: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
});
