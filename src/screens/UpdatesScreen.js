import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal } from 'react-native';
import { RefreshCw, DownloadCloud, CheckCircle } from 'lucide-react-native';
import { apiClient } from '../api/client';
import { colors } from '../theme';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function UpdatesScreen() {
  const [updates, setUpdates] = useState([]);
  const [isChecking, setIsChecking] = useState(false);
  const [checkStatus, setCheckStatus] = useState(null);
  
  // Per l'aggiornamento bloccante di casaos-reborn
  const [isSystemUpdating, setIsSystemUpdating] = useState(false);
  const [updatingContainerId, setUpdatingContainerId] = useState(null);

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
        Alert.alert('Iniziato', `Aggiornamento in corso per ${item.name}. Controlla la dashboard o attendi la notifica.`);
        setUpdates(prev => prev.filter(u => u.id !== item.id));
      } catch (err) {
        Alert.alert('Errore', err.response?.data?.error || err.message);
      } finally {
        setUpdatingContainerId(null);
      }
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.containerName}>{item.name}</Text>
        <Text style={styles.imageName}>{item.image}</Text>
      </View>
      <TouchableOpacity 
        style={[styles.updateButton, updatingContainerId === item.id && styles.updateButtonDisabled]} 
        onPress={() => handleUpdate(item)}
        disabled={updatingContainerId === item.id}
      >
        {updatingContainerId === item.id ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <DownloadCloud color="#fff" size={20} />
        )}
      </TouchableOpacity>
    </View>
  );

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
