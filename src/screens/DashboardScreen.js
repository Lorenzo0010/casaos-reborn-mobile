import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator } from 'react-native';
import { apiClient } from '../api/client';

export default function DashboardScreen() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await apiClient.get('/api/system/stats');
        setStats(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>System Overview</Text>
      {stats && (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>CPU Usage</Text>
            <Text style={styles.cardValue}>{stats.cpu.usage}%</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>RAM Usage</Text>
            <Text style={styles.cardValue}>{stats.memory.used} / {stats.memory.total}</Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    padding: 16,
  },
  center: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#2a2a2a',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  cardTitle: {
    color: '#aaa',
    fontSize: 16,
    marginBottom: 8,
  },
  cardValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  }
});
