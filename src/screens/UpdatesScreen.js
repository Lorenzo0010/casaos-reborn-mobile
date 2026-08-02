import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal, useWindowDimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RefreshCw, DownloadCloud, CheckCircle, Smartphone, Settings } from 'lucide-react-native';

import { apiClient } from '../api/client';
import { useTheme } from '../contexts/ThemeContext';
import { useAlert } from '../contexts/AlertContext';
import { SPACING, HEADER, CARD, FADE, CONTENT, isTabletWidth } from '../constants/layout';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';

export default function UpdatesScreen({ navigation }) {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const insets = useSafeAreaInsets();

  const [updates, setUpdates] = useState([]);
  const [appUpdate, setAppUpdate] = useState(null);
  const manualCheckContainers = useRef(false);
  const [isChecking, setIsChecking] = useState(false);
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const numColumns = isTablet ? 2 : 1;
  const [checkStatus, setCheckStatus] = useState(null);
  
  // Per l'aggiornamento bloccante di casaos-reborn
  const [isSystemUpdating, setIsSystemUpdating] = useState(false);
  const [updatingContainerId, setUpdatingContainerId] = useState(null);

  // App Update State
  const [isCheckingApp, setIsCheckingApp] = useState(false);
  const [isAppUpdating, setIsAppUpdating] = useState(false);
  const [appUpdateProgress, setAppUpdateProgress] = useState(0);

  const { showAlert } = useAlert();

  // Background Tasks State
  const [tasks, setTasks] = useState({});
  const prevTasksCount = useRef(0);

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
        fetchUpdates();
      }
      prevTasksCount.current = tasksList.length;
    } catch (e) {
      // Ignora
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTasks();
      const interval = setInterval(fetchTasks, 2000);
      return () => clearInterval(interval);
    }, [])
  );

  useEffect(() => {
    let socket = null;

    const setupSocket = async () => {
      const token = await AsyncStorage.getItem('token');
      const ip = await AsyncStorage.getItem('server_ip');
      if (!ip) return;

      socket = io(ip, {
        auth: { token, type: 'web' }
      });

      socket.on('updater.status', (data) => {
        if (data.status === 'checking') {
          setIsChecking(true);
          setCheckStatus(data);
        } else if (data.status === 'idle' || data.status === 'error') {
          setIsChecking(false);
          setCheckStatus(null);
          if (data.status === 'error') {
            showAlert('Search Error', data.message);
          }
          fetchUpdates();
        }
      });

      socket.on('updater.results', (data) => {
        setUpdates(data);
      });
    };

    setupSocket();
    fetchUpdates();
    checkAppUpdate();

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  useEffect(() => {
    let interval;
    if (isChecking) {
      interval = setInterval(() => {
        fetchUpdates();
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isChecking]);

  const fetchUpdates = async () => {
    try {
      const res = await apiClient.get('/api/docker/updates');
      const fetchedUpdates = res.data.updates || [];
      setUpdates(fetchedUpdates);
      
      const isCurrentlyChecking = res.data.status?.isChecking;
      
      if (isCurrentlyChecking) {
        setIsChecking(true);
        if (res.data.status?.currentTask) {
          setCheckStatus(res.data.status.currentTask);
        }
      } else {
        setIsChecking(false);
        setCheckStatus(null);
        if (manualCheckContainers.current) {
          manualCheckContainers.current = false;
        }
      }
    } catch (err) {
      console.warn("Failed to fetch updates", err);
    }
  };

  const checkUpdates = async () => {
    setIsChecking(true);
    manualCheckContainers.current = true;
    try {
      await apiClient.post('/api/docker/check-updates');
    } catch (err) {
      setIsChecking(false);
      manualCheckContainers.current = false;
      showAlert('Error', err.response?.data?.error || err.message);
    }
  };

  const handleUpdate = async (item) => {
    if (item.name === 'casaos-reborn') {
      navigation.navigate('SystemContainerSettings');
    } else {
      // Aggiornamento standard (background)
      setUpdatingContainerId(item.id);
      try {
        await apiClient.post(`/api/docker/containers/${item.id}/update`, { image: item.image });
        // The container stays in the list; progress will be shown via fetchTasks
      } catch (err) {
        showAlert('Error', err.response?.data?.error || err.message);
      } finally {
        setUpdatingContainerId(null);
      }
    }
  };

  const downloadAndInstallApp = async (url, tag, releaseDate) => {
    setIsAppUpdating(true);
    setAppUpdateProgress(0);
    try {
      const fileUri = FileSystem.cacheDirectory + 'app-release.apk';
      
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(fileUri);
      }

      const downloadResumable = FileSystem.createDownloadResumable(
        url,
        fileUri,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          setAppUpdateProgress(progress);
        }
      );

      const { uri } = await downloadResumable.downloadAsync();
      
      await AsyncStorage.setItem('latest_installed_tag', tag);
      if (releaseDate) {
        await AsyncStorage.setItem('latest_installed_date', releaseDate);
      }
      
      const contentUri = await FileSystem.getContentUriAsync(uri);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1, 
        type: 'application/vnd.android.package-archive'
      });
      
    } catch (e) {
      showAlert('Update Error', e.message);
    } finally {
      setIsAppUpdating(false);
    }
  };

  const checkAppUpdate = async () => {
    if (Platform.OS === 'web') {
      setAppUpdate(null);
      return;
    }
    setIsCheckingApp(true);
    try {
      const repo = 'Lorenzo0010/casaos-reborn-mobile';
      const res = await axios.get(`https://api.github.com/repos/${repo}/releases`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (!res.data || res.data.length === 0) {
        setAppUpdate(null);
        return;
      }
      
      const includeBeta = await AsyncStorage.getItem('beta_updates') === 'true';
      const availableReleases = res.data.filter(r => includeBeta ? true : !r.prerelease);
      
      if (availableReleases.length === 0) {
        setAppUpdate(null);
        return;
      }
      
      // Helper function to parse semantic versioning from tag (e.g. v1.1.0-beta)
      const parseSemver = (tag) => {
        const m = tag.match(/v(\d+)\.(\d+)\.(\d+)(?:-(.*))?/);
        if (!m) return { major: 0, minor: 0, patch: 0, pre: '' };
        return {
          major: parseInt(m[1]),
          minor: parseInt(m[2]),
          patch: parseInt(m[3]),
          pre: m[4] || 'zzzz' // 'zzzz' forces stable releases to be considered newer than prereleases of the same version
        };
      };

      const compareSemver = (tagA, tagB) => {
        const a = parseSemver(tagA);
        const b = parseSemver(tagB);
        if (a.major !== b.major) return a.major - b.major;
        if (a.minor !== b.minor) return a.minor - b.minor;
        if (a.patch !== b.patch) return a.patch - b.patch;
        return a.pre.localeCompare(b.pre);
      };

      // Sort releases using semver descending (newest first)
      availableReleases.sort((a, b) => {
        const semverDiff = compareSemver(b.tag_name, a.tag_name);
        if (semverDiff !== 0) return semverDiff;
        // Fallback to date if tags are identical or not semver
        return new Date(b.published_at || b.created_at) - new Date(a.published_at || a.created_at);
      });
      
      const latestRelease = availableReleases[0];
      const latestTag = latestRelease.tag_name;
      const latestDate = latestRelease.published_at || latestRelease.created_at;
      
      const storedDate = await AsyncStorage.getItem('latest_installed_date');
      const storedLatest = await AsyncStorage.getItem('latest_installed_tag');

      let isNewer = false;
      if (storedLatest && storedLatest.startsWith('v')) {
        isNewer = compareSemver(latestTag, storedLatest) > 0;
      } else if (storedDate) {
        isNewer = new Date(latestDate) > new Date(storedDate);
      } else if (storedLatest) {
        isNewer = true;
      } else {
        isNewer = true;
      }

      if (isNewer) {
        const apkAsset = latestRelease.assets.find(a => a.name.endsWith('.apk'));
        if (apkAsset) {
          const isStable = !latestRelease.prerelease;
          const displayDate = new Date(latestDate).toLocaleDateString();
          const displayTime = new Date(latestDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setAppUpdate({
            id: 'app-update',
            name: `CasaOS Mobile App (${isStable ? 'Stable' : 'Beta'})`,
            image: `Version ${latestTag} • ${displayDate} at ${displayTime}`,
            isAppUpdate: true,
            url: apkAsset.browser_download_url,
            tag: latestTag,
            date: latestDate
          });
        } else {
          setAppUpdate(null);
        }
      } else {
        setAppUpdate(null);
      }
    } catch (e) {
      showAlert('Error', 'Cannot check app updates: ' + e.message);
    } finally {
      setIsCheckingApp(false);
    }
  };

  const renderItem = ({ item }) => {
    if (item.isAppUpdate) {
      return (
        <View style={[styles.card, isTablet && { flex: 1 }]}>
          <View style={styles.cardInfo}>
            <Text style={styles.containerName}>{item.name}</Text>
            <Text style={styles.imageName}>{item.image}</Text>
          </View>
          <TouchableOpacity 
            style={styles.updateButton} 
            onPress={() => downloadAndInstallApp(item.url, item.tag, item.date)}
          >
            <DownloadCloud color="#fff" size={20} />
          </TouchableOpacity>
        </View>
      );
    }

    const task = tasks[item.id];
    const isRecreating = !!task;
    
    return (
      <View style={[styles.card, isTablet && { flex: 1 }]}>
        <View style={styles.cardInfo}>
          <Text style={styles.containerName}>{item.name}</Text>
          <Text style={styles.imageName}>{item.image}</Text>
          {isRecreating && (
            <Text style={[styles.imageName, { color: colors.primary, marginTop: 4, fontFamily: 'Inter_700Bold' }]}>
              {task.status || 'Updating...'}
            </Text>
          )}
        </View>
        <TouchableOpacity 
          style={[styles.updateButton, (updatingContainerId === item.id || isRecreating) && styles.updateButtonDisabled]} 
          onPress={() => handleUpdate(item)}
          disabled={updatingContainerId === item.id || isRecreating}
        >
          {updatingContainerId === item.id || isRecreating ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <DownloadCloud color="#fff" size={20} />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const listData = appUpdate ? [appUpdate, ...updates] : updates;

  return (
    <View style={styles.container}>
      {/* Modal di blocco per aggiornamento sistema */}
      <Modal visible={isSystemUpdating} transparent={true} animationType="fade">
        <View style={styles.modalBackground}>
          <View style={styles.modalContent}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.modalText}>System update in progress...</Text>
            <Text style={styles.modalSubtext}>Please wait, CasaOS Reborn is restarting.</Text>
          </View>
        </View>
      </Modal>

      <View style={{ paddingHorizontal: SPACING.base, paddingTop: insets.top + HEADER.totalOffset, paddingBottom: SPACING.sm }}>
        
        <View style={styles.card}>
          <View style={styles.cardInfo}>
            <Text style={styles.containerName}>CasaOS System</Text>
            <Text style={styles.imageName}>Main container settings</Text>
          </View>
          <TouchableOpacity 
            style={styles.updateButton} 
            onPress={() => navigation.navigate('SystemContainerSettings')}
          >
            <Settings color="#fff" size={20} />
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.cardInfo}>
            <Text style={styles.containerName}>Check for Updates</Text>
            <Text style={styles.imageName}>Check updates for containers and app</Text>
          </View>
          <TouchableOpacity 
            style={[styles.updateButton, (isChecking || isCheckingApp) && styles.updateButtonDisabled]} 
            onPress={() => {
              checkUpdates();
              checkAppUpdate();
            }}
            disabled={isChecking || isCheckingApp}
          >
            {(isChecking || isCheckingApp) ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <RefreshCw color="#fff" size={20} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {isChecking && checkStatus && checkStatus.container && (
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>Checking: {checkStatus.container}</Text>
        </View>
      )}

      {!isChecking && listData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <CheckCircle color={colors.success} size={48} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyText}>No updates available</Text>
        </View>
      ) : (
        <FlatList
          key={numColumns}
          data={listData}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={numColumns}
          columnWrapperStyle={isTablet ? { gap: SPACING.base } : undefined}
          contentContainerStyle={styles.list}
        />
      )}

      {/* Modal di download aggiornamento App */}
      <Modal visible={isAppUpdating} transparent={true} animationType="fade">
        <View style={styles.modalBackground}>
          <View style={styles.modalContent}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.modalText}>Downloading App...</Text>
            <Text style={styles.modalSubtext}>{Math.round(appUpdateProgress * 100)}%</Text>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const createStyles = (colors, typography) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 16,
    backgroundColor: colors.background,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: 12,
  },
  progressContainer: {
    padding: 12,
    backgroundColor: colors.border,
  },
  progressText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    ...typography.h3,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  list: {
    padding: SPACING.base,
    paddingBottom: CONTENT.paddingBottom,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: CARD.borderRadius,
    padding: CARD.padding,
    marginBottom: CARD.gap,
    borderWidth: CARD.borderWidth,
    borderColor: colors.surfaceElevated === colors.surface ? colors.border : colors.surfaceElevated,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: CARD.shadowOpacity,
    shadowRadius: CARD.shadowRadius,
    elevation: CARD.elevation,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardInfo: {
    flex: 1,
    marginRight: 16,
  },
  containerName: {
    ...typography.h3,
    color: colors.text,
    marginBottom: 4,
  },
  imageName: {
    ...typography.body,
    color: colors.textSecondary,
  },
  updateButton: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  updateButtonDisabled: {
    opacity: 0.6,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    width: '80%',
  },
  modalText: {
    ...typography.h3,
    color: colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  modalSubtext: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  modalSubtext: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  }
});
