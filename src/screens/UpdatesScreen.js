import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal } from 'react-native';
import { RefreshCw, DownloadCloud, CheckCircle, Smartphone } from 'lucide-react-native';
import { apiClient } from '../api/client';
import { colors } from '../theme';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';

export default function UpdatesScreen() {
  const [updates, setUpdates] = useState([]);
  const [isChecking, setIsChecking] = useState(false);
  const [checkStatus, setCheckStatus] = useState(null);
  
  // Per l'aggiornamento bloccante di casaos-reborn
  const [isSystemUpdating, setIsSystemUpdating] = useState(false);
  const [updatingContainerId, setUpdatingContainerId] = useState(null);

  // App Update State
  const [isCheckingApp, setIsCheckingApp] = useState(false);
  const [isAppUpdating, setIsAppUpdating] = useState(false);
  const [appUpdateProgress, setAppUpdateProgress] = useState(0);

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
            Alert.alert('Errore Ricerca', data.message);
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

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  const fetchUpdates = async () => {
    try {
      const res = await apiClient.get('/api/docker/updates');
      setUpdates(res.data.updates || []);
      if (res.data.status?.status === 'checking') {
        setIsChecking(true);
      }
    } catch (err) {
      console.warn("Failed to fetch updates", err);
    }
  };

  const checkUpdates = async () => {
    try {
      await apiClient.post('/api/docker/check-updates');
    } catch (err) {
      Alert.alert('Errore', err.response?.data?.error || err.message);
    }
  };

  const handleUpdate = async (item) => {
    if (item.name === 'casaos-reborn') {
      // Meccanismo bloccante tramite updater su porta 1112
      setIsSystemUpdating(true);
      try {
        const ip = await AsyncStorage.getItem('server_ip');
        if (!ip) throw new Error("IP Server non trovato");
        
        // Costruzione sicura dell'URL
        const parsedUrl = new URL(ip);
        parsedUrl.port = '1112';
        const updaterUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}:1112/api/update`;
        
        // Timeout di sicurezza (es. 2 minuti) per evitare che l'app si blocchi all'infinito
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000);

        // Chiamata POST (attenderà la fine dello stream SSE)
        await fetch(updaterUrl, { 
          method: 'POST',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        Alert.alert('Successo', 'CasaOS Reborn è stato aggiornato e si sta riavviando.');
        // Rimuoviamo l'aggiornamento dalla lista
        setUpdates(prev => prev.filter(u => u.id !== item.id));
      } catch (err) {
        Alert.alert('Errore', 'Si è verificato un errore durante l\'aggiornamento di sistema.');
        console.error(err);
      } finally {
        setIsSystemUpdating(false);
      }
    } else {
      // Aggiornamento standard (background)
      setUpdatingContainerId(item.id);
      try {
        await apiClient.post(`/api/docker/containers/${item.id}/update`, { image: item.image });
        // The container stays in the list; progress will be shown via fetchTasks
      } catch (err) {
        Alert.alert('Errore', err.response?.data?.error || err.message);
      } finally {
        setUpdatingContainerId(null);
      }
    }
  };

  const downloadAndInstallApp = async (url, tag) => {
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
      
      const contentUri = await FileSystem.getContentUriAsync(uri);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1, 
        type: 'application/vnd.android.package-archive'
      });
      
    } catch (e) {
      Alert.alert('Errore di Aggiornamento', e.message);
    } finally {
      setIsAppUpdating(false);
    }
  };

  const checkAppUpdate = async () => {
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
        Alert.alert('Nessun aggiornamento', 'Non ci sono release dell\'app su GitHub.');
        return;
      }
      
      const latestRelease = res.data[0];
      const latestTag = latestRelease.tag_name;
      const storedLatest = await AsyncStorage.getItem('latest_installed_tag');

      if (latestTag && latestTag !== storedLatest) {
        const apkAsset = latestRelease.assets.find(a => a.name.endsWith('.apk'));
        if (apkAsset) {
          Alert.alert(
            'Aggiornamento App',
            `Nuova versione ${latestTag} disponibile. Vuoi scaricarla e installarla?`,
            [
              { text: 'Annulla', style: 'cancel' },
              { text: 'Installa', onPress: () => downloadAndInstallApp(apkAsset.browser_download_url, latestTag) }
            ]
          );
        } else {
            Alert.alert('Nessun APK', 'La release trovata non contiene un file APK valido.');
        }
      } else {
        Alert.alert('App Aggiornata', 'Hai già l\'ultima versione installata.');
      }
    } catch (e) {
      Alert.alert('Errore', 'Impossibile controllare aggiornamenti app: ' + e.message);
    } finally {
      setIsCheckingApp(false);
    }
  };

  const renderItem = ({ item }) => {
    const task = tasks[item.id];
    const isRecreating = !!task;
    
    return (
      <View style={styles.card}>
        <View style={styles.cardInfo}>
          <Text style={styles.containerName}>{item.name}</Text>
          <Text style={styles.imageName}>{item.image}</Text>
          {isRecreating && (
            <Text style={[styles.imageName, { color: colors.primary, marginTop: 4, fontWeight: 'bold' }]}>
              {task.status || 'Aggiornamento in corso...'}
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

  return (
    <View style={styles.container}>
      {/* Modal di blocco per aggiornamento sistema */}
      <Modal visible={isSystemUpdating} transparent={true} animationType="fade">
        <View style={styles.modalBackground}>
          <View style={styles.modalContent}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.modalText}>Aggiornamento di sistema in corso...</Text>
            <Text style={styles.modalSubtext}>Attendi, CasaOS Reborn si sta riavviando.</Text>
          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Container Server</Text>
        <TouchableOpacity 
          style={[styles.checkButton, isChecking && styles.checkButtonDisabled]}
          onPress={checkUpdates}
          disabled={isChecking}
        >
          {isChecking ? (
            <ActivityIndicator color="#fff" size="small" style={{ marginRight: 8 }} />
          ) : (
            <RefreshCw color="#fff" size={20} style={{ marginRight: 8 }} />
          )}
          <Text style={styles.checkButtonText}>
            {isChecking ? 'Ricerca in corso...' : 'Cerca Aggiornamenti'}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>CasaOS Mobile App</Text>
        <TouchableOpacity 
          style={[styles.checkButton, { backgroundColor: '#8b5cf6' }, isCheckingApp && styles.checkButtonDisabled]}
          onPress={checkAppUpdate}
          disabled={isCheckingApp}
        >
          {isCheckingApp ? (
            <ActivityIndicator color="#fff" size="small" style={{ marginRight: 8 }} />
          ) : (
            <Smartphone color="#fff" size={20} style={{ marginRight: 8 }} />
          )}
          <Text style={styles.checkButtonText}>
            {isCheckingApp ? 'Controllo...' : 'Verifica Aggiornamento App'}
          </Text>
        </TouchableOpacity>
      </View>

      {isChecking && checkStatus && checkStatus.container && (
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>Controllo: {checkStatus.container}</Text>
        </View>
      )}

      {!isChecking && updates.length === 0 ? (
        <View style={styles.emptyContainer}>
          <CheckCircle color={colors.success} size={48} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyText}>Tutti i container sono aggiornati</Text>
        </View>
      ) : (
        <FlatList
          data={updates}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}

      {/* Modal di download aggiornamento App */}
      <Modal visible={isAppUpdating} transparent={true} animationType="fade">
        <View style={styles.modalBackground}>
          <View style={styles.modalContent}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.modalText}>Download App in corso...</Text>
            <Text style={styles.modalSubtext}>{Math.round(appUpdateProgress * 100)}%</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  checkButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  checkButtonDisabled: {
    opacity: 0.6,
  },
  checkButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    padding: 12,
    backgroundColor: colors.border,
  },
  progressText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardInfo: {
    flex: 1,
    marginRight: 16,
  },
  containerName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  imageName: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  updateButton: {
    backgroundColor: colors.success,
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
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  modalSubtext: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  }
});
