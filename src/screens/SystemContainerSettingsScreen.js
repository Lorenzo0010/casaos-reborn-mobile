import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Plus, Trash2, Settings, Save } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAlert } from '../contexts/AlertContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SystemContainerSettingsScreen({ navigation }) {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const { showAlert } = useAlert();

  const [ports, setPorts] = useState([]);
  const [envs, setEnvs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const ip = await AsyncStorage.getItem('server_ip');
      if (!ip) throw new Error("IP Server non trovato");
      
      const parsedUrl = new URL(ip);
      parsedUrl.port = '1112';
      const configUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}:1112/api/config`;

      const response = await fetch(configUrl);
      if (!response.ok) throw new Error("Errore nel recupero della configurazione");
      
      const details = await response.json();
      
      // Parse Ports
      const parsedPorts = [];
      if (details.HostConfig?.PortBindings) {
        Object.entries(details.HostConfig.PortBindings).forEach(([containerPortStr, hostBindings]) => {
          const containerPort = containerPortStr.split('/')[0];
          hostBindings?.forEach(binding => {
            parsedPorts.push({ host: binding.HostPort, container: containerPort });
          });
        });
      }
      setPorts(parsedPorts);

      // Parse Envs
      const parsedEnvs = [];
      if (details.Config?.Env) {
        details.Config.Env.forEach(envStr => {
          const eqIdx = envStr.indexOf('=');
          if (eqIdx !== -1) {
            parsedEnvs.push({ key: envStr.substring(0, eqIdx), value: envStr.substring(eqIdx + 1) });
          }
        });
      }
      setEnvs(parsedEnvs);
    } catch (e) {
      console.error(e);
      showAlert('Errore', 'Impossibile connettersi all\'updater di sistema.');
      navigation.goBack();
    } finally {
      setFetching(false);
    }
  };

  const handleAddPort = () => setPorts([...ports, { host: '', container: '' }]);
  const handleRemovePort = (index) => setPorts(ports.filter((_, i) => i !== index));
  const handlePortChange = (index, field, value) => {
    const newPorts = [...ports];
    newPorts[index][field] = value;
    setPorts(newPorts);
  };

  const handleAddEnv = () => setEnvs([...envs, { key: '', value: '' }]);
  const handleRemoveEnv = (index) => setEnvs(envs.filter((_, i) => i !== index));
  const handleEnvChange = (index, field, value) => {
    const newEnvs = [...envs];
    newEnvs[index][field] = value;
    setEnvs(newEnvs);
  };

  const handleSave = async () => {
    setLoading(true);
    
    const portsObj = {};
    const exposedPorts = {};
    ports.forEach(p => {
      if (p.host && p.container) {
          const key = `${p.container}/tcp`;
          if (!portsObj[key]) portsObj[key] = [];
          portsObj[key].push({ HostPort: p.host });
          exposedPorts[key] = {};
      }
    });

    const envArray = envs.filter(e => e.key && e.value).map(e => `${e.key}=${e.value}`);

    const payload = {
      Env: envArray,
      ExposedPorts: exposedPorts,
      HostConfig: {
        PortBindings: portsObj
      }
    };

    try {
      const ip = await AsyncStorage.getItem('server_ip');
      if (!ip) throw new Error("IP Server non trovato");
      
      const parsedUrl = new URL(ip);
      parsedUrl.port = '1112';
      const updaterUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}:1112/api/update`;

      showAlert('Aggiornamento avviato', 'Il sistema verrà riavviato per applicare le modifiche. L\'app potrebbe perdere temporaneamente la connessione.');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      await fetch(updaterUrl, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      navigation.goBack();
    } catch (e) {
      console.error(e);
      // Spesso fetch() fallisce perché il server taglia la connessione riavviandosi, che è normale
      // Navigation goBack will handle the UI state
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const renderDynamicList = (title, items, handleAdd, handleRemove, handleChange, field1, field2, placeholder1, placeholder2) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <TouchableOpacity onPress={handleAdd} style={styles.addBtn}>
          <Plus color={colors.primary} size={20} />
        </TouchableOpacity>
      </View>
      {items.map((item, index) => (
        <View key={index} style={styles.dynamicRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 8, marginBottom: 0 }]}
            placeholder={placeholder1}
            placeholderTextColor={colors.textSecondary}
            value={item[field1]}
            onChangeText={(val) => handleChange(index, field1, val)}
          />
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 8, marginBottom: 0 }]}
            placeholder={placeholder2}
            placeholderTextColor={colors.textSecondary}
            value={item[field2]}
            onChangeText={(val) => handleChange(index, field2, val)}
          />
          <TouchableOpacity onPress={() => handleRemove(index)} style={styles.removeBtn}>
            <Trash2 color={colors.error} size={20} />
          </TouchableOpacity>
        </View>
      ))}
      {items.length === 0 && (
        <Text style={{ color: colors.textSecondary, fontStyle: 'italic' }}>Nessun elemento configurato.</Text>
      )}
    </View>
  );

  if (fetching) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
      
      <View style={[styles.headerCard, { flexDirection: 'row', alignItems: 'center' }]}>
        <View style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
          <Settings color="white" size={32} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text style={styles.title} numberOfLines={1}>Sistema CasaOS</Text>
          <Text style={styles.subtitle}>casaos-reborn</Text>
        </View>
      </View>

      {renderDynamicList('Porte (Riavvia UI)', ports, handleAddPort, handleRemovePort, handlePortChange, 'host', 'container', 'Host (es. 10000)', 'Container (es. 10000)')}
      {renderDynamicList('Variabili d\'Ambiente', envs, handleAddEnv, handleRemoveEnv, handleEnvChange, 'key', 'value', 'Chiave (es. PUID)', 'Valore (es. 1000)')}

      <TouchableOpacity style={styles.createBtn} onPress={handleSave} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : (
            <>
                <Save color="#fff" size={20} style={{ marginRight: 8 }} />
                <Text style={styles.createBtnText}>SALVA E RIAVVIA SISTEMA</Text>
            </>
        )}
      </TouchableOpacity>
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const createStyles = (colors, typography) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerCard: {
    backgroundColor: colors.surface,
    padding: 24,
    borderRadius: 12,
    marginBottom: 16,
  },
  title: {
    ...typography.h3,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 4,
    textTransform: 'uppercase',
    fontFamily: 'Inter_600SemiBold',
  },
  section: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },
  input: {
    ...typography.body,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  dynamicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  addBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
  },
  removeBtn: {
    padding: 10,
    backgroundColor: 'rgba(255,0,0,0.1)',
    borderRadius: 8,
  },
  createBtn: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  createBtnText: {
    ...typography.button,
    color: '#fff',
  }
});
