import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator } from 'react-native';
import { apiClient } from '../api/client';

export default function ContainersScreen() {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContainers = async () => {
      try {
        const res = await apiClient.get('/api/docker/containers');
        setContainers(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchContainers();
  }, []);

  const renderItem = ({ item }) => {
    const containerName = item.name || item.title || (item.Names && item.Names[0]) || 'Sconosciuto';
    const containerState = item.state || item.State || item.status || 'Sconosciuto';
    const isRunning = (containerState || '').toLowerCase().includes('running');

    return (
      <View style={styles.card}>
        <Text style={styles.name}>{String(containerName).replace(/^\\//, '')}</Text>
        <Text style={[styles.status, { color: isRunning ? '#4ade80' : '#f87171' }]}>
          {String(containerState)}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={containers}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  center: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  status: {
    fontSize: 14,
    fontWeight: 'bold',
  }
});
