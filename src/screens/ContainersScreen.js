import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, Alert, Linking, useWindowDimensions, LayoutAnimation } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Play, Square, RotateCw, Edit, Check, CheckSquare, Pin, ChevronUp, ChevronDown, Globe, PlusCircle, LogOut, Info, X, Calendar, Type, Activity, GripVertical, Eye, EyeOff, Settings } from 'lucide-react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { apiClient, logout } from '../api/client';
import { useTheme } from '../contexts/ThemeContext';
import { useAlert } from '../contexts/AlertContext';
import { useEdit } from '../contexts/EditContext';
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
  const { isLayoutUnlocked } = useEdit();
  const [prefsLoaded, setPrefsLoaded] = useState(false);



  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: HEADER.actionGap }}>
          <TouchableOpacity 
            style={{ width: HEADER.actionSize, height: HEADER.actionSize, justifyContent: 'center', alignItems: 'center' }}
            onPress={() => navigation.navigate('ContainerCreate')}
          >
            <PlusCircle color={colors.text} size={22} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, colors]);

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
      // Ignore error or log silently
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
    return (c.Labels && (c.Labels['casaos.reborn.name'] || c.Labels['casaos.app.name'])) || stableId;
  };

  const getWebPort = (container) => {
    const labels = container.Labels || {};
    const customPort = labels['casaos.reborn.web.port'];
    if (customPort && customPort !== '0') {
      return customPort;
    }
    const tcpMappings = (container.Ports || []).filter(p => p.PublicPort && (p.Type === 'tcp' || !p.Type));
    if (tcpMappings.length > 0) {
      return tcpMappings[0].PublicPort;
    }
    return null;
  };

  const getContainerUrl = (container) => {
    const baseUrl = apiClient.defaults.baseURL || '';
    const fallbackHostname = baseUrl.replace(/^https?:\/\//, '').split(':')[0].split('/')[0];
    if (!fallbackHostname) return null;

    const labels = container.Labels || {};
    let scheme = labels['casaos.reborn.web.scheme'] || 'http';
    if (!scheme.includes('://')) scheme = scheme + '://';

    let path = labels['casaos.reborn.web.path'] || '/';
    if (!path.startsWith('/')) path = '/' + path;

    const customPort = labels['casaos.reborn.web.port'];
    const customHost = labels['casaos.reborn.web.host'] || fallbackHostname;

    // 1. Explicit User Override (Priorità 1)
    if (customPort && customPort !== '0') {
      return `${scheme}${customHost}:${customPort}${path}`;
    }

    // 2. Filter ONLY TCP ports, ignoring UDP mappings (Priorità 2)
    const tcpMappings = (container.Ports || []).filter(p => p.PublicPort && (p.Type === 'tcp' || !p.Type));
    
    // 3. Fallback to first TCP port or default port 80/443 (Priorità 3)
    const defaultFallbackPort = scheme === 'https://' ? 443 : 80;
    const targetPort = tcpMappings.length > 0 ? tcpMappings[0].PublicPort : defaultFallbackPort;

    return `${scheme}${customHost}:${targetPort}${path}`;
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

    let containerState = item.state || item.State || item.status || 'Unknown';
    if (isRecreating) {
      containerState = task.status || 'Updating...';
    }

    const isRunning = (containerState || '').toLowerCase().includes('running');
    const casaosName = getContainerName(item);
    const webUrl = isRunning ? getContainerUrl(item) : null;

    return (
      <View style={[isTablet && { flex: 1 }, { marginBottom: CARD.gap }]}>
        <TouchableOpacity
          style={[
            styles.card,
            (isLayoutUnlocked || isPinned) && { borderColor: isPinned ? colors.primary : colors.border, borderWidth: 1 }
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
            if (isRecreating || isLayoutUnlocked) return;
            if (isRunning && webUrl) {
              Linking.openURL(webUrl).catch(() => showAlert('Error', 'Cannot open link'));
            } else {
              navigation.navigate('ContainerDetails', { containerId, containerName: casaosName });
            }
          }}
          activeOpacity={(isRecreating || isLayoutUnlocked) ? 1 : 0.7}
        >
          <View style={{ flex: 1, flexDirection: 'column', alignItems: 'stretch' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ position: (isLayoutUnlocked || isPinned) ? 'relative' : 'absolute', opacity: (isLayoutUnlocked || isPinned) ? 1 : 0, left: 0 }}>
                <TouchableOpacity onPress={() => { togglePin(stableId); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={{ padding: 8, marginRight: 4 }} disabled={!(isLayoutUnlocked || isPinned)}>
                  <Pin size={20} color={isPinned ? colors.primary : colors.textSecondary} fill={isPinned ? colors.primary : 'none'} />
                </TouchableOpacity>
              </View>
              {(() => {
                let iconUrl = item.Labels && (item.Labels['casaos.reborn.icon'] || item.Labels['icon']);
                if (iconUrl && typeof iconUrl === 'string') {
                  iconUrl = iconUrl.trim();
                  if (!iconUrl.startsWith('http') && !iconUrl.startsWith('data:')) {
                    if (!iconUrl.startsWith('/')) iconUrl = '/' + iconUrl;
                    iconUrl = `${apiClient.defaults.baseURL}${iconUrl}`;
                  }
                  return (
                    <Image
                      source={{ uri: iconUrl }}
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

              <View style={[styles.cardInfo, { flex: 1, paddingRight: 8, justifyContent: 'center' }]}>
                <Text style={styles.name} numberOfLines={1}>{casaosName}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
                  <View style={{ backgroundColor: isRecreating ? colors.primary : (isRunning ? colors.success : colors.error), paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                    <Text style={{ color: '#fff', fontSize: 11, fontFamily: 'Inter_600SemiBold' }}>
                      {isRecreating ? String(containerState).toLowerCase() : (isRunning ? 'running' : 'stopped')}
                    </Text>
                  </View>

                  {(() => {
                    let pub = item.Ports?.[0]?.PublicPort || item.Labels?.['casaos.reborn.web.port'];
                    let priv = item.Ports?.[0]?.PrivatePort;
                    if (!pub && !priv) return null;
                    return (
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, gap: 4 }}>
                        <Globe color="#ffffff" size={10} />
                        <Text style={{ fontSize: 11, color: '#ffffff', fontFamily: 'monospace' }}>
                          {pub || '?'}:{priv || '?'}
                        </Text>
                      </View>
                    );
                  })()}
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {(actionLoading === containerId || isRecreating) ? (
                  <ActivityIndicator color={colors.primary} size="small" style={{ margin: 10 }} />
                ) : (
                  <>
                    {!isLayoutUnlocked && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <TouchableOpacity
                          style={{ width: 38, height: 38, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' }}
                          onPress={() => { navigation.navigate('ContainerDetails', { containerId, containerName: casaosName }); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                        >
                          <Settings color={colors.text} size={18} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={{ width: 38, height: 38, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' }}
                          onPress={() => handleAction(containerId, 'start')}
                          disabled={isRunning}
                        >
                          <Play color={colors.text} size={18} fill={isRunning ? 'rgba(255,255,255,0.3)' : colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ width: 38, height: 38, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' }}
                          onPress={() => handleAction(containerId, 'stop')}
                          disabled={!isRunning}
                        >
                          <Square color={colors.text} size={18} fill={!isRunning ? 'rgba(255,255,255,0.3)' : colors.text} />
                        </TouchableOpacity>
                      </View>
                    )}
                    {isLayoutUnlocked && (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity style={{ width: 38, height: 38, justifyContent: 'center', alignItems: 'center' }} onPress={() => { moveCustom(stableId, -1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                          <ChevronUp color={colors.text} size={24} />
                        </TouchableOpacity>
                        <TouchableOpacity style={{ width: 38, height: 38, justifyContent: 'center', alignItems: 'center' }} onPress={() => { moveCustom(stableId, 1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                          <ChevronDown color={colors.text} size={24} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                )}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
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

    if (!isLayoutUnlocked) return null;

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
        numColumns={numColumns}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} progressViewOffset={insets.top + HEADER.totalOffset} />
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
    borderWidth: CARD.borderWidth,
    borderColor: colors.surfaceElevated === colors.surface ? colors.border : colors.surfaceElevated,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: CARD.shadowOpacity,
    shadowRadius: CARD.shadowRadius,
    elevation: CARD.elevation,
    flexDirection: 'column',
    alignItems: 'stretch',
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
