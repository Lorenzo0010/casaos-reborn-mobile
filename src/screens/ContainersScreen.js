import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, Alert, Linking, useWindowDimensions, LayoutAnimation } from 'react-native';
import { Image } from 'expo-image';
import { Play, Square, RotateCw, Edit, Check, CheckSquare, Pin, ChevronUp, ChevronDown, Globe, PlusCircle, LogOut, Info, X, Calendar, Type, Activity, GripVertical, Eye, EyeOff } from 'lucide-react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { apiClient, logout } from '../api/client';
import { useTheme } from '../contexts/ThemeContext';
import { useAlert } from '../contexts/AlertContext';
import { SPACING, HEADER, CARD, FADE, CONTENT, isTabletWidth } from '../constants/layout';

const getContainerColor = (name) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 60%, 50%)`;
};

export default function ContainersScreen() {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();

  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [tasks, setTasks] = useState({});
  const prevTasksCount = useRef(0);
  const touchStart = useRef({ x: 0, y: 0, ignore: false });
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isTablet = isTabletWidth(width);
  const numColumns = isTablet ? 2 : 1;

  const [sortMode, setSortMode] = useState('date');
  const [pinnedContainers, setPinnedContainers] = useState([]);
  const [customOrder, setCustomOrder] = useState([]);
  const [showSystemContainers, setShowSystemContainers] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [containerOverrides, setContainerOverrides] = useState({});
  const [originalPrefs, setOriginalPrefs] = useState(null);

  const startEditMode = useCallback(() => {
    setOriginalPrefs({ sortMode, pinnedContainers, customOrder, showSystemContainers });
    setEditMode(true);
  }, [sortMode, pinnedContainers, customOrder, showSystemContainers]);

  const cancelEditMode = useCallback(() => {
    if (originalPrefs) {
      setSortMode(originalPrefs.sortMode);
      setPinnedContainers(originalPrefs.pinnedContainers);
      setCustomOrder(originalPrefs.customOrder);
      setShowSystemContainers(originalPrefs.showSystemContainers);
    }
    setEditMode(false);
  }, [originalPrefs]);

  const applyEditMode = useCallback(() => {
    setEditMode(false);
  }, []);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: HEADER.actionGap }}>
          <TouchableOpacity 
            style={{ width: HEADER.actionSize, height: HEADER.actionSize, borderRadius: HEADER.actionRadius, backgroundColor: 'rgba(255, 255, 255, 0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' }}
            onPress={!editMode ? () => navigation.navigate('ContainerCreate') : applyEditMode}
          >
            {!editMode ? <PlusCircle color={colors.text} size={22} /> : <Check color={colors.success} size={22} />}
          </TouchableOpacity>
          <TouchableOpacity 
            style={{ width: HEADER.actionSize, height: HEADER.actionSize, borderRadius: HEADER.actionRadius, backgroundColor: 'rgba(255, 255, 255, 0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' }}
            onPress={!editMode ? startEditMode : cancelEditMode}
          >
            {!editMode ? <Edit color={colors.text} size={22} /> : <X color={colors.error} size={22} />}
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, editMode, colors, startEditMode, applyEditMode, cancelEditMode]);

  const fetchPreferences = async () => {
    try {
      const res = await apiClient.get('/api/system/preferences');
      if (res.data.sortMode) setSortMode(res.data.sortMode);
      if (Array.isArray(res.data.pinnedContainers)) setPinnedContainers(res.data.pinnedContainers);
      if (Array.isArray(res.data.customOrder)) setCustomOrder(res.data.customOrder);
      if (res.data.showSystemContainers !== undefined) setShowSystemContainers(res.data.showSystemContainers);
      if (res.data.containerOverrides) setContainerOverrides(res.data.containerOverrides);
    } catch (e) {
      console.error('Error loading preferences', e);
    } finally {
      setPrefsLoaded(true);
    }
  };

  useEffect(() => {
    if (!prefsLoaded || editMode) return;
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
  }, [sortMode, pinnedContainers, customOrder, showSystemContainers, prefsLoaded, editMode]);

  const fetchContainers = async () => {
    try {
      const res = await apiClient.get('/api/docker/containers');
      setContainers(res.data || []);
    } catch (e) {
      console.error(e);
      const errorMessage = e.response?.data?.error || e.message || String(e);
      showAlert('Container Fetch Error', `Cannot retrieve containers. Details: ${errorMessage}`);
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
      fetchPreferences();
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
      showAlert('Error', `Cannot perform action '${action}': ${serverMsg}`);
    } finally {
      setActionLoading(null);
    }
  };

  const getContainerName = (c) => {
    const stableId = c.Names ? c.Names[0].replace('/', '') : c.Id;
    const override = containerOverrides[stableId];
    return (override && override.displayName) || (c.Labels && (c.Labels['casaos.reborn.name'] || c.Labels['casaos.app.name'])) || stableId;
  };

  const getContainerUrl = (container) => {
    const stableId = container.Names ? container.Names[0].replace('/', '') : container.Id;
    const override = containerOverrides[stableId];

    const baseUrl = apiClient.defaults.baseURL || '';
    const hostname = baseUrl.replace(/^https?:\/\//, '').split(':')[0].split('/')[0];
    if (!hostname) return null;

    if (override && override.url) {
      if (override.url.startsWith('http')) return override.url;
      return `http://${hostname}:${override.url}`;
    }

    const labels = container.Labels || {};
    let scheme = labels['casaos.reborn.web.scheme'] || 'http';
    if (!scheme.includes('://')) scheme = scheme + '://';

    let path = labels['casaos.reborn.web.path'] || '/';
    if (!path.startsWith('/')) path = '/' + path;

    const customPort = labels['casaos.reborn.web.port'];

    // 1. Explicit User Override (Priorità 1)
    if (customPort && customPort !== '0') {
      return `${scheme}${hostname}:${customPort}${path}`;
    }

    // 2. Filter ONLY TCP ports, ignoring UDP mappings (Priorità 2)
    const tcpMappings = (container.Ports || []).filter(p => p.PublicPort && (p.Type === 'tcp' || !p.Type));
    
    // 3. Fallback to first TCP port or default port 80/443 (Priorità 3)
    const defaultFallbackPort = scheme === 'https://' ? 443 : 80;
    const targetPort = tcpMappings.length > 0 ? tcpMappings[0].PublicPort : defaultFallbackPort;

    return `${scheme}${hostname}:${targetPort}${path}`;
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
  }, [containers, sortMode, pinnedContainers, customOrder, showSystemContainers, containerOverrides]);

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

    let containerState = item.state || item.State || item.status || 'Unknown';
    if (isRecreating) {
      containerState = task.status || 'Updating...';
    }

    const isRunning = (containerState || '').toLowerCase().includes('running');
    const casaosName = getContainerName(item);
    const webUrl = isRunning ? getContainerUrl(item) : null;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          (editMode || isPinned) && { borderColor: isPinned ? colors.primary : colors.border, borderWidth: 1 },
          isTablet && { flex: 1 }
        ]}
        delayPressIn={150}
        onPressIn={(e) => {
          touchStart.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY, ignore: false };
        }}
        onPressOut={(e) => {
          const dx = Math.abs(e.nativeEvent.pageX - touchStart.current.x);
          const dy = Math.abs(e.nativeEvent.pageY - touchStart.current.y);
          if (dx > 10 || dy > 10) {
            touchStart.current.ignore = true;
          }
        }}
        onPress={() => {
          if (touchStart.current.ignore) {
            touchStart.current.ignore = false;
            return;
          }
          if (isRecreating || editMode) return;
          if (isRunning && webUrl) {
            Linking.openURL(webUrl).catch(() => showAlert('Error', 'Cannot open link'));
          } else {
            navigation.navigate('ContainerDetails', { containerId, containerName: casaosName });
          }
        }}
        activeOpacity={(isRecreating || editMode) ? 1 : 0.7}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <View style={{ position: (editMode || isPinned) ? 'relative' : 'absolute', opacity: (editMode || isPinned) ? 1 : 0, left: 0 }}>
            <TouchableOpacity onPress={() => togglePin(stableId)} style={{ padding: 8, marginRight: 4 }} disabled={!(editMode || isPinned)}>
              <Pin size={20} color={isPinned ? colors.primary : colors.textSecondary} fill={isPinned ? colors.primary : 'none'} />
            </TouchableOpacity>
          </View>

          {(() => {
            const override = containerOverrides[stableId];
            let iconUrl = (override && override.icon) || (item.Labels && (item.Labels['casaos.reborn.icon'] || item.Labels['icon']));
            if (iconUrl && typeof iconUrl === 'string') {
              iconUrl = iconUrl.trim();
              if (!iconUrl.startsWith('http') && !iconUrl.startsWith('data:')) {
                if (!iconUrl.startsWith('/')) iconUrl = '/' + iconUrl;
                iconUrl = `${apiClient.defaults.baseURL}${iconUrl}`;
              }
              return (
                <Image
                  source={{ 
                    uri: iconUrl,
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
                  }}
                  style={{ width: 40, height: 40, borderRadius: 8, marginRight: 12 }}
                  contentFit="contain"
                  transition={200}
                />
              );
            }
            const initial = stableId.charAt(0).toUpperCase();
            const bgColor = getContainerColor(stableId);
            return (
              <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <Text style={[{ color: 'white' }, typography.h2]}>{initial}</Text>
              </View>
            );
          })()}

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
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', minWidth: 80 }}>
              <View style={{ flexDirection: 'row', position: editMode ? 'relative' : 'absolute', opacity: editMode ? 1 : 0, right: 0 }} pointerEvents={editMode ? 'auto' : 'none'}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => moveCustom(stableId, -1)}>
                  <ChevronUp color={colors.text} size={20} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => moveCustom(stableId, 1)}>
                  <ChevronDown color={colors.text} size={20} />
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', position: !editMode ? 'relative' : 'absolute', opacity: !editMode ? 1 : 0, right: 0 }} pointerEvents={!editMode ? 'auto' : 'none'}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('ContainerDetails', { containerId, containerName: casaosName })}>
                  <Info color={colors.textSecondary} size={20} />
                </TouchableOpacity>
                {isRunning ? (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction(containerId, 'stop')}>
                    <Square color={colors.error} size={20} fill={colors.error} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction(containerId, 'start')}>
                    <Play color={colors.success} size={20} fill={colors.success} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && containers.length === 0) {
    return (
      <View style={[styles.center, { paddingTop: insets.top + HEADER.totalOffset }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Header UI with Edit options
  const renderHeader = () => {
    const getModeIcon = (mode, color) => {
      switch(mode) {
        case 'date': return <Calendar color={color} size={16} />;
        case 'alphabetical': return <Type color={color} size={16} />;
        case 'status': return <Activity color={color} size={16} />;
        case 'custom': return <GripVertical color={color} size={16} />;
        default: return null;
      }
    };

    if (!editMode) return null;

    return (
      <View style={[styles.header, styles.editOptions]}>
          <Text style={[typography.h3, { color: colors.text, marginBottom: 16 }]}>Display Settings</Text>
          
          <View style={styles.sortSelectorContainer}>
        <Text style={{ ...typography.subtitle, color: colors.textSecondary, marginBottom: 10 }}>Sort by</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}>
          {['date', 'alphabetical', 'status', 'custom'].map(mode => {
            const isActive = sortMode === mode;
            const pillColor = isActive ? colors.text : colors.textSecondary;
            const bgColor = isActive ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)';
            const borderColor = isActive ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)';
            
            return (
              <TouchableOpacity
                key={mode}
                style={[styles.sortPill, { backgroundColor: bgColor, borderColor, width: '48%' }]}
                onPress={() => setSortMode(mode)}
              >
                {getModeIcon(mode, pillColor)}
                <Text style={[styles.sortPillText, { color: pillColor, fontFamily: isActive ? 'Inter_600SemiBold' : 'Inter_400Regular' }]} numberOfLines={1}>
                  {mode === 'date' ? 'Creation Date' : mode === 'alphabetical' ? 'Alphabetical' : mode === 'status' ? 'Status' : 'Custom'}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 20 }} />

      <TouchableOpacity
        style={[styles.systemToggle, { backgroundColor: showSystemContainers ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.03)' }]}
        onPress={() => setShowSystemContainers(!showSystemContainers)}
        activeOpacity={0.8}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {showSystemContainers ? <Eye color={colors.text} size={20} /> : <EyeOff color={colors.textSecondary} size={20} />}
          <Text style={[styles.systemToggleText, { color: showSystemContainers ? colors.text : colors.textSecondary }]}>
            Show System Containers
          </Text>
        </View>
        <View style={[styles.toggleSwitch, showSystemContainers && { backgroundColor: 'rgba(255, 255, 255, 0.3)', alignItems: 'flex-end' }]}>
          <View style={styles.toggleKnob} />
        </View>
      </TouchableOpacity>
    </View>
  );
};

  return (
    <View style={styles.container}>
      <FlatList
        key={numColumns}
        data={sortedContainers}
        keyExtractor={(item) => {
          const stableId = item.Names ? item.Names[0].replace('/', '') : item.Id;
          return stableId || item.id || Math.random().toString();
        }}
        renderItem={renderItem}
        numColumns={numColumns}
        columnWrapperStyle={isTablet ? { gap: SPACING.base } : undefined}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{ padding: SPACING.base, paddingTop: insets.top + HEADER.totalOffset, paddingBottom: CONTENT.paddingBottom }}
        extraData={containerOverrides}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          !loading && <Text style={styles.emptyText}>No containers found</Text>
        }
      />

    </View>
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
  header: {
    marginBottom: SPACING.base,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text,
  },
  editBtn: {
    padding: 8,
  },
  editOptions: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  systemToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  systemToggleText: {
    ...typography.subtitle,
    marginLeft: 12,
    fontFamily: 'Inter_500Medium',
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 2,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFF',
  },
  sortSelectorContainer: {
  },
  sortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  sortPillText: {
    ...typography.body,
    fontSize: 14,
  },
  emptyText: {
    ...typography.subtitle,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 40,
  },
  card: {
    backgroundColor: colors.surface,
    padding: CARD.padding,
    borderRadius: CARD.borderRadius,
    marginBottom: CARD.gap,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  name: {
    ...typography.h3,
    fontFamily: 'Inter_500Medium',
    color: colors.text,
    marginBottom: 4,
  },
  status: {
    ...typography.body,
    color: colors.textSecondary,
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
