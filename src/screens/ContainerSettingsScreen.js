import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Plus, Trash2, Settings, AlertTriangle } from 'lucide-react-native';
import { apiClient } from '../api/client';
import { useTheme } from '../contexts/ThemeContext';
import { useAlert } from '../contexts/AlertContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HEADER, CONTENT } from '../constants/layout';

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
  const insets = useSafeAreaInsets();

  const { containerId, containerName, details } = route.params;

  const [ports, setPorts] = useState([]);
  const [volumes, setVolumes] = useState([]);
  const [envs, setEnvs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [imageName, setImageName] = useState('');
  const [imageTag, setImageTag] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [icon, setIcon] = useState('');
  const [webUIScheme, setWebUIScheme] = useState('http');
  const [webUIDomain, setWebUIDomain] = useState('');
  const [webUIPort, setWebUIPort] = useState('');
  const [webUIPath, setWebUIPath] = useState('/');

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
      
      setDisplayName(details.Config?.Labels?.['casaos.reborn.name'] || details.Config?.Labels?.['casaos.app.name'] || '');
      setIcon(details.Config?.Labels?.['casaos.reborn.icon'] || details.Config?.Labels?.['icon'] || '');

      // Parse Ports
      const parsedPorts = [];
      if (details.HostConfig?.PortBindings) {
        Object.entries(details.HostConfig.PortBindings).forEach(([containerPortStr, hostBindings]) => {
          const containerPort = containerPortStr.split('/')[0];
          const protocol = containerPortStr.split('/')[1] || 'tcp';
          hostBindings?.forEach(binding => {
            parsedPorts.push({ host: binding.HostPort, container: containerPort, protocol });
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
      const imageEnv = details.ImageEnv || [];
      const IGNORED_ENV_VARS = ['PATH', 'NODE_VERSION', 'YARN_VERSION', 'HOSTNAME', 'PWD', 'HOME', 'SHLVL', 'DEBUG'];
      
      if (details.Config?.Env) {
        details.Config.Env.forEach(envStr => {
          if (imageEnv.includes(envStr)) return;
          const eqIdx = envStr.indexOf('=');
          if (eqIdx !== -1) {
            const key = envStr.substring(0, eqIdx);
            const value = envStr.substring(eqIdx + 1);
            if (!IGNORED_ENV_VARS.includes(key)) {
              parsedEnvs.push({ key, value });
            }
          }
        });
      }
      setEnvs(parsedEnvs);

      const wScheme = details.Config?.Labels?.['casaos.reborn.web.scheme'] || 'http';
      const wDomain = details.Config?.Labels?.['casaos.reborn.web.host'] || '';
      const wPort = details.Config?.Labels?.['casaos.reborn.web.port'] || '';
      const wPath = details.Config?.Labels?.['casaos.reborn.web.path'] || '/';
      setWebUIScheme(wScheme);
      setWebUIDomain(wDomain);
      setWebUIPort(wPort);
      setWebUIPath(wPath);
    }
  }, [details]);

  const handleAddPort = () => setPorts([...ports, { host: '', container: '', protocol: 'tcp' }]);
  const handleRemovePort = (index) => {
    const newPorts = ports.filter((_, i) => i !== index);
    setPorts(newPorts);
  };
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
          const key = `${p.container}/${p.protocol || 'tcp'}`;
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
      displayName: displayName,
      icon: icon,
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
      webUI: (webUIPort || webUIDomain) ? {
        scheme: webUIScheme,
        domain: webUIDomain,
        path: webUIPath,
        port: webUIPort
      } : undefined
    };

    try {
      // Validate Ports
      const requestedPorts = [];
      if (webUIPort && webUIPort !== '0') requestedPorts.push(String(webUIPort));
      ports.forEach(p => {
        if (p.host) requestedPorts.push(String(p.host));
      });

      if (requestedPorts.length > 0) {
        const resContainers = await apiClient.get('/api/docker/containers');
        const allContainers = resContainers.data;
        const conflict = requestedPorts.find(port => {
          return allContainers.some(c => {
            if (c.Id.startsWith(containerId)) return false;
            if (c.Names && c.Names.includes(`/${details.Name?.replace(/^\//, '')}`)) return false;
            return c.Ports && c.Ports.some(cp => String(cp.PublicPort) === port);
          });
        });

        if (conflict) {
          showAlert('Port Conflict', `Port ${conflict} is already in use by another container.`);
          setLoading(false);
          return;
        }
      }

      await apiClient.post(`/api/docker/containers/${containerId}/recreate`, payload);
      navigation.navigate('ContainersList');
    } catch (e) {
      console.error(e);
      showAlert('Error', 'Update failed: ' + (e.response?.data?.error || e.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    showAlert(
      'Delete Container', 
      `Are you sure you want to permanently delete the container ${containerName}? This operation is not reversible.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Yes, Delete', 
          style: 'destructive',
          onPress: async () => {
            setDeleteLoading(true);
            try {
              await apiClient.post(`/api/docker/containers/${containerId}/delete`, {});
              navigation.navigate('ContainersList');
            } catch (e) {
              console.error(e);
              showAlert('Error', 'Deletion failed: ' + (e.response?.data?.error || e.message));
            } finally {
              setDeleteLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderDynamicList = (title, items, handleAdd, handleRemove, handleChange, field1, field2, placeholder1, placeholder2, isPorts = false) => (
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
          {isPorts && (
            <TouchableOpacity 
              style={[styles.input, { width: 60, marginRight: 8, marginBottom: 0, justifyContent: 'center', alignItems: 'center' }]}
              onPress={() => handleChange(index, 'protocol', item.protocol === 'tcp' ? 'udp' : 'tcp')}
            >
              <Text style={{ color: colors.text, fontSize: 12 }}>{(item.protocol || 'tcp').toUpperCase()}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => handleRemove(index)} style={styles.removeBtn}>
            <Trash2 color={colors.error} size={20} />
          </TouchableOpacity>
        </View>
      ))}
      {items.length === 0 && (
        <Text style={{ color: colors.textSecondary, fontStyle: 'italic' }}>No items configured.</Text>
      )}
    </View>
  );

  const stableId = details?.Name?.replace(/^\//, '') || containerName;
  let displayIconUrl = icon;
  
  if (displayIconUrl && typeof displayIconUrl === 'string') {
      displayIconUrl = displayIconUrl.trim();
      if (!displayIconUrl.startsWith('http') && !displayIconUrl.startsWith('data:')) {
          if (!displayIconUrl.startsWith('/')) displayIconUrl = '/' + displayIconUrl;
          displayIconUrl = `${apiClient.defaults.baseURL}${displayIconUrl}`;
      }
  }

  const initial = stableId ? stableId.charAt(0).toUpperCase() : '?';
  const bgColor = stableId ? getContainerColor(stableId) : colors.primary;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingTop: insets.top + HEADER.totalOffset, paddingBottom: CONTENT.paddingBottom }}>
      
      <View style={[styles.headerCard, { flexDirection: 'row', alignItems: 'center' }]}>
        {displayIconUrl ? (
          <Image 
            source={{ 
              uri: displayIconUrl,
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
            }} 
            style={{ width: 64, height: 64, borderRadius: 12, marginRight: 16 }} 
            contentFit="contain"
            transition={200}
          />
        ) : (
          <View style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
            <Text style={[{ color: 'white' }, typography.h1]}>{initial}</Text>
          </View>
        )}
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>{displayName || stableId}</Text>
          <Text style={styles.subtitle}>Settings</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>General</Text>
        <TextInput
          style={styles.input}
          placeholder="Display Name (e.g. AdGuard)"
          placeholderTextColor={colors.textSecondary}
          value={displayName}
          onChangeText={setDisplayName}
        />
        <TextInput
          style={styles.input}
          placeholder="Icon URL"
          placeholderTextColor={colors.textSecondary}
          value={icon}
          onChangeText={setIcon}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>Web Interface (Optional)</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Scheme</Text>
            <TouchableOpacity style={[styles.input, { justifyContent: 'center', marginBottom: 16 }]} onPress={() => setWebUIScheme(webUIScheme === 'http' ? 'https' : 'http')}>
              <Text style={{ color: colors.text }}>{webUIScheme}://</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flex: 2 }}>
            <Text style={styles.label}>Domain</Text>
            <TextInput style={styles.input} placeholder="(auto)" placeholderTextColor={colors.textSecondary} value={webUIDomain} onChangeText={setWebUIDomain} autoCapitalize="none" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Port</Text>
            <TextInput 
              style={[styles.input, { marginBottom: ports.filter(p => p.host).length > 0 ? 4 : 16 }]} 
              placeholder="(auto)" 
              placeholderTextColor={colors.textSecondary} 
              value={webUIPort} 
              onChangeText={setWebUIPort} 
              keyboardType="numeric" 
            />
            {ports.filter(p => p.host).length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {ports.filter(p => p.host).map((p, i) => (
                  <TouchableOpacity 
                    key={i} 
                    onPress={() => setWebUIPort(p.host)} 
                    style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 4, marginRight: 4 }}
                  >
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{p.host}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
        <Text style={styles.label}>Path</Text>
        <TextInput style={styles.input} placeholder="/" placeholderTextColor={colors.textSecondary} value={webUIPath} onChangeText={setWebUIPath} autoCapitalize="none" />
      </View>

      {renderDynamicList('Ports', ports, handleAddPort, handleRemovePort, handlePortChange, 'host', 'container', 'Host (e.g. 8080)', 'Container (e.g. 80)', true)}
      {renderDynamicList('Volumes', volumes, handleAddVolume, handleRemoveVolume, handleVolumeChange, 'host', 'container', 'Host (e.g. /data)', 'Container (e.g. /app)')}
      {renderDynamicList('Environment Variables', envs, handleAddEnv, handleRemoveEnv, handleEnvChange, 'key', 'value', 'Key (e.g. PUID)', 'Value (e.g. 1000)')}

      <TouchableOpacity style={styles.createBtn} onPress={handleSave} disabled={loading || deleteLoading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.createBtnText}>SAVE AND RECREATE</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} disabled={loading || deleteLoading}>
        {deleteLoading ? <ActivityIndicator color="#fff" /> : (
          <>
            <AlertTriangle color="#fff" size={20} style={{ marginRight: 8 }} />
            <Text style={styles.deleteBtnText}>DELETE CONTAINER</Text>
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
  label: { 
    ...typography.body, 
    color: colors.textSecondary, 
    marginBottom: 8 
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
