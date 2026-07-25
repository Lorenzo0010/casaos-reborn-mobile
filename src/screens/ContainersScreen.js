import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { Play, Square, RotateCw } from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { apiClient } from '../api/client';
import { colors } from '../theme';

export default function ContainersScreen() {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [tasks, setTasks] = useState({});
  const prevTasksCount = useRef(0);
  const navigation = useNavigation();

  const fetchContainers = async () => {
    try {
      const res = await apiClient.get('/api/docker/containers');
      setContainers(res.data || []);
    } catch (e) {
      console.error(e);
      Alert.alert('Errore', 'Impossibile recuperare i container');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await apiClient.get('/api/docker/tasks');
      const tasksList = res.data || [];
      const tasksMap = {};
      tasksList.forEach(t => {
        if (t.id) tasksMap[t.id] = t;
      });
      setTasks(tasksMap);

      if (tasksList.length < prevTasksCount.current) {
        // Un task è terminato, ricarichiamo la lista
        fetchContainers();
      }
      prevTasksCount.current = tasksList.length;
    } catch (e) {
      // Ignora l'errore o logga in modo silenzioso
    }
  };

  useEffect(() => {
    fetchContainers();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchTasks();
      const interval = setInterval(fetchTasks, 2000);
      return () => clearInterval(interval);
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchContainers();
    fetchTasks();
  }, []);

  const handleAction = async (id, action) => {
    setActionLoading(id);
    try {
      await apiClient.post(`/api/docker/containers/${id}/${action}`, {});
      // Ricarica la lista per mostrare il nuovo stato
      await fetchContainers();
    } catch (e) {
      console.error('Action Error:', e.response?.data || e.message);
      const serverMsg = e.response?.data?.error || e.message;
      Alert.alert('Errore', `Impossibile eseguire l'azione '${action}': ${serverMsg}`);
    } finally {
      setActionLoading(null);
    }
  };

  const renderItem = ({ item }) => {
    // Gestisce diversi formati JSON delle API
    const containerId = item.Id || item.id;
    const task = tasks[containerId];
    const isRecreating = !!task;

    const containerName = item.name || item.title || (item.Names && item.Names[0]) || 'Sconosciuto';
    let containerState = item.state || item.State || item.status || 'Sconosciuto';
    
    if (isRecreating) {
      containerState = task.status || 'Aggiornamento in corso...';
    }

    const isRunning = (containerState || '').toLowerCase().includes('running');

    // Estrae l'icona e il nome CasaOS se disponibili
    const casaosName = item.Labels?.['casaos.reborn.name'] || String(containerName).replace(/^\//, '');

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => !isRecreating && navigation.navigate('ContainerDetails', { containerId, containerName: casaosName })}
        activeOpacity={isRecreating ? 1 : 0.7}
      >
        <View style={styles.cardInfo}>
          <Text style={styles.name}>{casaosName}</Text>
          <Text style={[styles.status, { color: isRecreating ? colors.primary : (isRunning ? colors.success : colors.error) }]}>
            {String(containerState).toUpperCase()}
          </Text>
        </View>
        
        <View style={styles.actions}>
          {(actionLoading === containerId || isRecreating) ? (
            <ActivityIndicator color={colors.primary} size="small" style={{ margin: 10 }} />
          ) : (
            <>
              {isRunning ? (
                <>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction(containerId, 'restart')}>
                    <RotateCw color={colors.primary} size={20} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction(containerId, 'stop')}>
                    <Square color={colors.error} size={20} fill={colors.error} />
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction(containerId, 'start')}>
                  <Play color={colors.success} size={20} fill={colors.success} />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && containers.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={containers}
        keyExtractor={(item) => item.Id || item.id || Math.random().toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          !loading && <Text style={styles.emptyText}>Nessun container trovato</Text>
        }
      />
    </View>
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
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
  card: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  name: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  status: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    marginLeft: 8,
  }
});
