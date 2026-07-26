import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { Plus, Trash2, Settings, AlertTriangle } from 'lucide-react-native';
import { apiClient } from '../api/client';
import { useTheme } from '../contexts/ThemeContext';
import { useAlert } from '../contexts/AlertContext';

const getContainerColor = (name) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 60%, 50%)`;
};

export default function ContainerSettingsScreen({ route, navigation }) {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const { showAlert } = useAlert();

  const { containerId, containerName, details } = route.params;

  const [ports, setPorts] = useState([]);
  const [volumes, setVolumes] = useState([]);
  const [envs, setEnvs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [imageName, setImageName] = useState('');
  const [imageTag, setImageTag] = useState('');

  useEffect(() => {
    if (details) {
      // Parse Image
      const fullImage = details.Config?.Image || '';
      let imgName = fullImage;
      let imgTag = 'latest';
      const colonIdx = fullImage.lastIndexOf(':');
      if (colonIdx > 0 && !fullImage.substring(colonIdx).includes('/')) {
        imgName = fullImage.substring(0, colonIdx);
        imgTag = fullImage.substring(colonIdx + 1);
      }
      setImageName(imgName);
      setImageTag(imgTag);
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

      // Parse Volumes (Binds)
      const parsedVolumes = [];
      if (details.HostConfig?.Binds) {
        details.HostConfig.Binds.forEach(bind => {
          const parts = bind.split(':');
          if (parts.length >= 2) {
            parsedVolumes.push({ host: parts[0], container: parts[1] });
          }
        });
      }
      setVolumes(parsedVolumes);

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
    }
  }, [details]);

  const handleAddPort = () => setPorts([...ports, { host: '', container: '' }]);
  const handleRemovePort = (index) => setPorts(ports.filter((_, i) => i !== index));
  const handlePortChange = (index, field, value) => {
    const newPorts = [...ports];
    newPorts[index][field] = value;
    setPorts(newPorts);
  };

  const handleAddVolume = () => setVolumes([...volumes, { host: '', container: '' }]);
  const handleRemoveVolume = (index) => setVolumes(volumes.filter((_, i) => i !== index));
  const handleVolumeChange = (index, field, value) => {
    const newVols = [...volumes];
    newVols[index][field] = value;
    setVolumes(newVols);
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
    ports.forEach(p => {
      if (p.host && p.container) {
          const key = `${p.container}/tcp`; // Defaulting to TCP for simplicity
          if (!portsObj[key]) portsObj[key] = [];
          portsObj[key].push({ HostPort: p.host });
      }
    });

    const envArray = envs.filter(e => e.key && e.value).map(e => `${e.key}=${e.value}`);
    const volumesArray = volumes.filter(v => v.host && v.container).map(v => `${v.host}:${v.container}`);

    const payload = {
      image: imageName,
      tag: imageTag,
      name: details.Name?.replace(/^\//, ''),
      displayName: details.Config?.Labels?.['casaos.reborn.name'] || '',
      icon: details.Config?.Labels?.['casaos.reborn.icon'] || details.Config?.Labels?.['casaos.app.icon'] || details.Config?.Labels?.['icon'] || '',
      restartPolicy: details.HostConfig?.RestartPolicy?.Name || 'unless-stopped',
      privileged: !!details.HostConfig?.Privileged,
      networkMode: details.HostConfig?.NetworkMode || 'bridge',
      ports: portsObj,
      volumes: volumesArray,
      env: envArray,
      memory: details.HostConfig?.Memory,
      cpuQuota: details.HostConfig?.CpuShares,
      devices: details.HostConfig?.Devices,
      capAdd: details.HostConfig?.CapAdd,
      cmd: details.Config?.Cmd,
      webUI: details.Config?.Labels?.['casaos.reborn.web.port'] ? {
        scheme: details.Config.Labels['casaos.reborn.web.scheme'] || 'http',
        path: details.Config.Labels['casaos.reborn.web.path'] || '/',
        port: details.Config.Labels['casaos.reborn.web.port']
      } : undefined
    };

    try {
      await apiClient.post(`/api/docker/containers/${containerId}/recreate`, payload);
      navigation.navigate('ContainersList');
    } catch (e) {
      console.error(e);
      showAlert('Errore', 'Aggiornamento fallito: ' + (e.response?.data?.error || e.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    showAlert(
      'Elimina Container', 
      `Sei sicuro di voler eliminare definitivamente il container ${containerName}? Questa operazione non è reversibile.`,
      [
        { text: 'Annulla', style: 'cancel' },
        { 
          text: 'Sì, Elimina', 
          style: 'destructive',
          onPress: async () => {
            setDeleteLoading(true);
            try {
              await apiClient.post(`/api/docker/containers/${containerId}/delete`, {});
              navigation.navigate('ContainersList');
            } catch (e) {
              console.error(e);
              showAlert('Errore', 'Eliminazione fallita: ' + (e.response?.data?.error || e.message));
            } finally {
              setDeleteLoading(false);
            }
          }
        }
      ]
    );
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

  const stableId = details?.Name?.replace(/^\//, '') || containerName;
  let iconUrl = details?.Config?.Labels?.['casaos.reborn.icon'] || details?.Config?.Labels?.['casaos.app.icon'] || details?.Config?.Labels?.['icon'];
  
  if (iconUrl && iconUrl.startsWith('/')) {
      iconUrl = `${apiClient.defaults.baseURL}${iconUrl}`;
  }

  const initial = stableId ? stableId.charAt(0).toUpperCase() : '?';
  const bgColor = stableId ? getContainerColor(stableId) : colors.primary;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      
      <View style={[styles.headerCard, { flexDirection: 'row', alignItems: 'center' }]}>
        {iconUrl ? (
          <Image 
            source={{ uri: iconUrl }} 
            style={{ width: 64, height: 64, borderRadius: 12, marginRight: 16 }} 
            resizeMode="contain"
          />
        ) : (
          <View style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
            <Text style={[{ color: 'white' }, typography.h1]}>{initial}</Text>
          </View>
        )}
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>{stableId}</Text>
          <Text style={styles.subtitle}>Impostazioni</Text>
        </View>
      </View>

      {renderDynamicList('Porte', ports, handleAddPort, handleRemovePort, handlePortChange, 'host', 'container', 'Host (es. 8080)', 'Container (es. 80)')}
      {renderDynamicList('Volumi', volumes, handleAddVolume, handleRemoveVolume, handleVolumeChange, 'host', 'container', 'Host (es. /dati)', 'Container (es. /app)')}
      {renderDynamicList('Variabili d\'Ambiente', envs, handleAddEnv, handleRemoveEnv, handleEnvChange, 'key', 'value', 'Chiave (es. PUID)', 'Valore (es. 1000)')}

      <TouchableOpacity style={styles.createBtn} onPress={handleSave} disabled={loading || deleteLoading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.createBtnText}>SALVA E RICREA</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} disabled={loading || deleteLoading}>
        {deleteLoading ? <ActivityIndicator color="#fff" /> : (
          <>
            <AlertTriangle color="#fff" size={20} style={{ marginRight: 8 }} />
            <Text style={styles.deleteBtnText}>ELIMINA CONTAINER</Text>
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
    ...typography.caption,
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
    ...typography.subtitle,
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
    marginTop: 8,
  },
  createBtnText: {
    ...typography.button,
    color: '#fff',
  },
  deleteBtn: {
    backgroundColor: colors.error,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  deleteBtnText: {
    ...typography.button,
    color: '#fff',
  }
});
