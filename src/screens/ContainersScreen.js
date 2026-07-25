import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { Play, Square, RotateCw, Edit, Check, CheckSquare, Pin, ChevronUp, ChevronDown } from 'lucide-react-native';
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

  // Preferences State
  const [sortMode, setSortMode] = useState('date');
  const [pinnedContainers, setPinnedContainers] = useState([]);
  const [customOrder, setCustomOrder] = useState([]);
  const [showSystemContainers, setShowSystemContainers] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  const fetchPreferences = async () => {
    try {
      const res = await apiClient.get('/api/system/preferences');
      if (res.data.sortMode) setSortMode(res.data.sortMode);
      if (Array.isArray(res.data.pinnedContainers)) setPinnedContainers(res.data.pinnedContainers);
      if (Array.isArray(res.data.customOrder)) setCustomOrder(res.data.customOrder);
      if (res.data.showSystemContainers !== undefined) setShowSystemContainers(res.data.showSystemContainers);
    } catch (e) {
      console.error('Error loading preferences', e);
    } finally {
      setPrefsLoaded(true);
    }
  };

  useEffect(() => {
    if (!prefsLoaded) return;
    const savePrefs = async () => {
      try {
        await apiClient.post('/api/system/preferences', {
          sortMode,
          pinnedContainers,
          customOrder,
          showSystemContainers,
        });
      } catch (e) {
        console.error('Error saving preferences', e);
      }
    };
    const timeout = setTimeout(savePrefs, 500);
    return () => clearTimeout(timeout);
  }, [sortMode, pinnedContainers, customOrder, showSystemContainers, prefsLoaded]);

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
        fetchContainers();
      }
      prevTasksCount.current = tasksList.length;
    } catch (e) {
      // Ignora l'errore o logga in modo silenzioso
    }
  };

  useEffect(() => {
    fetchPreferences();
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
      await fetchContainers();
    } catch (e) {
      console.error('Action Error:', e.response?.data || e.message);
      const serverMsg = e.response?.data?.error || e.message;
      Alert.alert('Errore', `Impossibile eseguire l'azione '${action}': ${serverMsg}`);
    } finally {
      setActionLoading(null);
    }
  };

  const getContainerName = (c) => {
    const stableId = c.Names ? c.Names[0].replace('/', '') : c.Id;
    return c.Labels?.['casaos.reborn.name'] || stableId;
  };

  const sortedContainers = React.useMemo(() => {
    let sorted = [...containers];

    if (!showSystemContainers) {
      sorted = sorted.filter(c => {
        const name = c.Names ? c.Names[0].replace('/', '') : c.Id;
        return name !== 'casaos-reborn' && name !== 'casaos-updater';
      });
    }

    if (sortMode === 'alphabetical') {
      sorted.sort((a, b) => getContainerName(a).localeCompare(getContainerName(b)));
    } else if (sortMode === 'date') {
      sorted.sort((a, b) => b.Created - a.Created);
    } else if (sortMode === 'custom') {
      sorted.sort((a, b) => {
        const stableIdA = a.Names ? a.Names[0].replace('/', '') : a.Id;
        const stableIdB = b.Names ? b.Names[0].replace('/', '') : b.Id;
        let idxA = customOrder.indexOf(stableIdA);
        let idxB = customOrder.indexOf(stableIdB);
        if (idxA === -1) idxA = 99999;
        if (idxB === -1) idxB = 99999;
        return idxA - idxB;
      });
    } else if (sortMode === 'status') {
      sorted.sort((a, b) => {
        const isRunningA = a.State === 'running' ? 1 : 0;
        const isRunningB = b.State === 'running' ? 1 : 0;
        if (isRunningA !== isRunningB) return isRunningB - isRunningA;
        return getContainerName(a).localeCompare(getContainerName(b));
      });
    }

    const pinned = [];
    const unpinned = [];
    sorted.forEach(c => {
      const stableId = c.Names ? c.Names[0].replace('/', '') : c.Id;
      if (pinnedContainers.includes(stableId)) pinned.push(c);
      else unpinned.push(c);
    });

    return [...pinned, ...unpinned];
  }, [containers, sortMode, pinnedContainers, customOrder, showSystemContainers]);

  const togglePin = (id) => {
    if (pinnedContainers.includes(id)) {
      setPinnedContainers(pinnedContainers.filter(p => p !== id));
    } else {
      setPinnedContainers([...pinnedContainers, id]);
    }
  };

  const moveCustom = (id, direction) => {
    const newOrder = [...customOrder];
    containers.forEach(c => {
      const stableId = c.Names ? c.Names[0].replace('/', '') : c.Id;
      if (!newOrder.includes(stableId)) newOrder.push(stableId);
    });
    const index = newOrder.indexOf(id);
    if (index === -1) return;

    if (direction === -1 && index > 0) {
      const temp = newOrder[index - 1];
      newOrder[index - 1] = newOrder[index];
      newOrder[index] = temp;
    } else if (direction === 1 && index < newOrder.length - 1) {
      const temp = newOrder[index + 1];
      newOrder[index + 1] = newOrder[index];
      newOrder[index] = temp;
    }
    setCustomOrder(newOrder);
    if (sortMode !== 'custom') setSortMode('custom');
  };

  const renderItem = ({ item }) => {
    const containerId = item.Id || item.id;
    const task = tasks[containerId];
    const isRecreating = !!task;

    const stableId = item.Names ? item.Names[0].replace('/', '') : item.Id;
    const isPinned = pinnedContainers.includes(stableId);

    let containerState = item.state || item.State || item.status || 'Sconosciuto';
    if (isRecreating) {
      containerState = task.status || 'Aggiornamento in corso...';
    }

    const isRunning = (containerState || '').toLowerCase().includes('running');
    const casaosName = getContainerName(item);

    return (
      <TouchableOpacity
        style={[styles.card, (editMode || isPinned) && { borderColor: isPinned ? colors.primary : colors.border, borderWidth: 1 }]}
        onPress={() => !isRecreating && !editMode && navigation.navigate('ContainerDetails', { containerId, containerName: casaosName })}
        activeOpacity={(isRecreating || editMode) ? 1 : 0.7}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          {(editMode || isPinned) && (
            <TouchableOpacity onPress={() => togglePin(stableId)} style={{ padding: 8, marginRight: 4 }}>
              <Pin size={20} color={isPinned ? colors.primary : colors.textSecondary} fill={isPinned ? colors.primary : 'none'} />
            </TouchableOpacity>
          )}
          
          <View style={styles.cardInfo}>
            <Text style={styles.name}>{casaosName}</Text>
            <Text style={[styles.status, { color: isRecreating ? colors.primary : (isRunning ? colors.success : colors.error) }]}>
              {String(containerState).toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          {(actionLoading === containerId || isRecreating) ? (
            <ActivityIndicator color={colors.primary} size="small" style={{ margin: 10 }} />
          ) : (
            editMode ? (
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => moveCustom(stableId, -1)}>
                  <ChevronUp color={colors.text} size={20} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => moveCustom(stableId, 1)}>
                  <ChevronDown color={colors.text} size={20} />
                </TouchableOpacity>
              </View>
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
            )
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

  // Header UI with Edit options
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Container</Text>
        <TouchableOpacity style={styles.editBtn} onPress={() => setEditMode(!editMode)}>
          {editMode ? <Check color={colors.success} size={24} /> : <Edit color={colors.text} size={24} />}
        </TouchableOpacity>
      </View>
      
      {editMode && (
        <View style={styles.editOptions}>
          <TouchableOpacity 
            style={styles.systemToggle} 
            onPress={() => setShowSystemContainers(!showSystemContainers)}
          >
            {showSystemContainers ? <CheckSquare color={colors.primary} size={20} /> : <Square color={colors.textSecondary} size={20} />}
            <Text style={styles.systemToggleText}>Mostra container di sistema</Text>
          </TouchableOpacity>
          
          <View style={styles.sortSelectorContainer}>
            <Text style={{ color: colors.textSecondary, marginBottom: 4 }}>Ordina per:</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {['date', 'alphabetical', 'status', 'custom'].map(mode => (
                <TouchableOpacity 
                  key={mode} 
                  style={[styles.sortPill, sortMode === mode && styles.sortPillActive]}
                  onPress={() => setSortMode(mode)}
                >
                  <Text style={[styles.sortPillText, sortMode === mode && styles.sortPillTextActive]}>
                    {mode === 'date' ? 'Data' : mode === 'alphabetical' ? 'Alfabetico' : mode === 'status' ? 'Stato' : 'Custom'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={sortedContainers}
        keyExtractor={(item) => item.Id || item.id || Math.random().toString()}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
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
  header: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  editBtn: {
    padding: 8,
  },
  editOptions: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  systemToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  systemToggleText: {
    color: colors.text,
    marginLeft: 8,
    fontSize: 16,
  },
  sortSelectorContainer: {
    
  },
  sortPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sortPillActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: colors.primary,
  },
  sortPillText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  sortPillTextActive: {
    color: colors.primary,
    fontWeight: 'bold',
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
