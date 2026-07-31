import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, Switch, Alert } from 'react-native';
import { Plus, Trash2, Server, FileText, Code, Upload, Save, Check } from 'lucide-react-native';
import { apiClient } from '../api/client';
import { useTheme } from '../contexts/ThemeContext';
import { useAlert } from '../contexts/AlertContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HEADER, CONTENT } from '../constants/layout';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import yaml from 'js-yaml';

export default function ContainerCreateScreen({ navigation }) {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState('manual');
  const [yamlInput, setYamlInput] = useState('');

  const [image, setImage] = useState('');
  const [tag, setTag] = useState('latest');
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [icon, setIcon] = useState('');
  const [webUIScheme, setWebUIScheme] = useState('http');
  const [webUIPort, setWebUIPort] = useState('');
  const [webUIPath, setWebUIPath] = useState('/');
  
  const [networkMode, setNetworkMode] = useState('bridge');
  const [pidMode, setPidMode] = useState('');
  const [hostname, setHostname] = useState('');
  const [restartPolicy, setRestartPolicy] = useState('unless-stopped');
  const [privileged, setPrivileged] = useState(false);
  const [memory, setMemory] = useState('0');
  const [cpuQuota, setCpuQuota] = useState(0);
  
  const [ports, setPorts] = useState([{ host: '', container: '', protocol: 'tcp' }]);
  const [volumes, setVolumes] = useState([{ host: '', container: '' }]);
  const [envs, setEnvs] = useState([{ key: '', value: '' }]);
  const [devices, setDevices] = useState([{ host: '', container: '' }]);
  const [commands, setCommands] = useState([{ value: '' }]);
  const [capAdd, setCapAdd] = useState('');
  
  const [loading, setLoading] = useState(false);

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/x-yaml', 'text/yaml', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      
      const fileUri = result.assets[0].uri;
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      setYamlInput(fileContent);
      handleImportYaml(fileContent);
    } catch (err) {
      showAlert('Error', 'Cannot read file: ' + err.message);
    }
  };

  const handleImportYaml = (yamlString) => {
    try {
      const parsed = yaml.load(yamlString);
      if (!parsed || typeof parsed !== 'object') throw new Error('Invalid YAML');
      
      let service = parsed;
      if (parsed.services) {
        const serviceName = Object.keys(parsed.services)[0];
        service = parsed.services[serviceName];
        if (!service.container_name) service.container_name = serviceName;
      }

      if (!service.image) throw new Error('No image specified in YAML');

      let imageName = service.image;
      let imageTag = 'latest';
      const colonIdx = service.image.lastIndexOf(':');
      if (colonIdx > 0 && !service.image.substring(colonIdx).includes('/')) {
        imageName = service.image.substring(0, colonIdx);
        imageTag = service.image.substring(colonIdx + 1);
      }

      const normalizeScheme = (s) => {
        if (!s) return 'http';
        return s.replace('://', '').toLowerCase();
      };

      const getCasaOSData = (xCasaos) => {
        if (!xCasaos) return {};
        const res = {};
        if (xCasaos.icon) res.icon = xCasaos.icon;
        if (xCasaos.title) {
          if (typeof xCasaos.title === 'string') res.title = xCasaos.title;
          else if (xCasaos.title.custom) res.title = xCasaos.title.custom;
          else if (xCasaos.title.en_us) res.title = xCasaos.title.en_us;
        }
        if (xCasaos.port_map) res.port = String(xCasaos.port_map);
        if (xCasaos.scheme) res.scheme = normalizeScheme(xCasaos.scheme);
        if (xCasaos.index) res.path = xCasaos.index;

        if (xCasaos.ports) {
            const uiPort = xCasaos.ports.find(p => p.ui || p.web);
            if (uiPort) {
                res.scheme = normalizeScheme(uiPort.scheme) || res.scheme || 'http';
                res.port = uiPort.target || uiPort.published || res.port || '';
                res.path = uiPort.path || res.path || '/';
            }
        }
        return res;
      };

      const rootCasaosData = getCasaOSData(parsed['x-casaos']);
      const serviceCasaosData = getCasaOSData(service['x-casaos']);

      setImage(imageName);
      setTag(imageTag);
      setName(parsed.name || service.container_name || Object.keys(parsed.services)[0] || '');
      setDisplayName(serviceCasaosData.title || rootCasaosData.title || '');
      setIcon(serviceCasaosData.icon || rootCasaosData.icon || (service.labels && service.labels.icon) || '');
      setRestartPolicy(service.restart || 'unless-stopped');
      setPrivileged(!!service.privileged);
      setNetworkMode(service.network_mode || 'bridge');
      setPidMode(service.pid || '');
      setHostname(service.hostname || '');
      
      const memStr = service.deploy?.resources?.limits?.memory || service.mem_limit || '';
      if (memStr) {
        const memMatch = String(memStr).match(/^(\d+)\s*([kmgt]?)b?$/i);
        if (memMatch) {
          let memMB = parseInt(memMatch[1]);
          const unit = (memMatch[2] || '').toLowerCase();
          if (unit === 'k') memMB = Math.round(memMB / 1024);
          else if (unit === 'g') memMB = memMB * 1024;
          else if (unit === 't') memMB = memMB * 1024 * 1024;
          setMemory(String(memMB));
        }
      }

      if (serviceCasaosData.port || rootCasaosData.port) {
          setWebUIScheme(serviceCasaosData.scheme || rootCasaosData.scheme || 'http');
          setWebUIPort(serviceCasaosData.port || rootCasaosData.port || '');
          setWebUIPath(serviceCasaosData.path || rootCasaosData.path || '/');
      }

      if (service.ports) {
        const p = service.ports.map(pt => {
          if (typeof pt === 'string') {
            const parts = pt.split(':');
            let protocol = 'tcp';
            let host = '';
            let container = '';
            if (parts.length === 2) { host = parts[0]; container = parts[1]; }
            if (parts.length === 3) { host = parts[1]; container = parts[2]; }
            if (container.includes('/')) {
                const cParts = container.split('/');
                container = cParts[0];
                protocol = cParts[1].toLowerCase();
            }
            return { host, container, protocol };
          } else if (typeof pt === 'object') {
              return {
                  host: String(pt.published || ''),
                  container: String(pt.target || ''),
                  protocol: (pt.protocol || 'tcp').toLowerCase()
              };
          }
          return { host: '', container: '', protocol: 'tcp' };
        }).filter(pt => pt.host && pt.container);
        setPorts(p.length ? p : [{ host: '', container: '', protocol: 'tcp' }]);
      }

      if (service.volumes && service.volumes.length > 0) {
        const v = service.volumes.map(vol => {
          if (typeof vol === 'string') {
            const parts = vol.split(':');
            if (parts.length >= 2) return { host: parts[0], container: parts[1] };
          } else if (typeof vol === 'object') {
              return { host: vol.source || '', container: vol.target || '' };
          }
          return { host: '', container: '' };
        }).filter(vol => vol.host && vol.container);
        setVolumes(v.length ? v : [{ host: '', container: '' }]);
      }

      if (service.environment) {
        let e = [];
        if (Array.isArray(service.environment)) {
          e = service.environment.map(env => {
            const [k, ...v] = env.split('=');
            return { key: k, value: v.join('=') };
          });
        } else {
          e = Object.entries(service.environment).map(([k, v]) => ({ key: k, value: String(v) }));
        }
        setEnvs(e.length ? e : [{ key: '', value: '' }]);
      }

      if (service.devices && service.devices.length > 0) {
          const d = service.devices.map(dev => {
              if (typeof dev === 'string') {
                  const parts = dev.split(':');
                  if (parts.length >= 2) return { host: parts[0], container: parts[1] };
              }
              return { host: '', container: '' };
          }).filter(dev => dev.host && dev.container);
          setDevices(d.length ? d : [{ host: '', container: '' }]);
      }

      if (service.command && (typeof service.command === 'string' || service.command.length > 0)) {
          if (Array.isArray(service.command)) {
              setCommands(service.command.map(c => ({ value: c })));
          } else {
              setCommands(service.command.split(' ').map(c => ({ value: c })));
          }
      }
      
      if (service.cap_add && service.cap_add.length > 0) {
          setCapAdd(service.cap_add.join(', '));
      }

      setActiveTab('manual');
      showAlert('Success', 'YAML parsed and imported successfully.');
    } catch (err) {
      showAlert('YAML Error', err.message);
    }
  };

  const handleDynamicListChange = (setter, items, index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setter(newItems);
  };
  const addDynamicItem = (setter, items, emptyObj) => setter([...items, emptyObj]);
  const removeDynamicItem = (setter, items, index) => setter(items.filter((_, i) => i !== index));

  const handleCreate = async () => {
    if (!image) {
      showAlert('Error', 'Enter an image name (e.g. nginx)');
      return;
    }

    setLoading(true);
    
    const portsObj = {};
    ports.forEach(p => {
      if (p.host && p.container) {
          const key = `${p.container}/${p.protocol}`;
          if (!portsObj[key]) portsObj[key] = [];
          portsObj[key].push({ HostPort: p.host });
      }
    });

    const envArray = envs.filter(e => e.key).map(e => `${e.key}=${e.value}`);
    const volumesArray = volumes.filter(v => v.host && v.container).map(v => `${v.host}:${v.container}`);
    const devicesArray = devices.filter(d => d.host && d.container).map(d => ({
        PathOnHost: d.host,
        PathInContainer: d.container,
        CgroupPermissions: 'rwm'
    }));
    const commandsArray = commands.filter(c => c.value).map(c => c.value);

    let cpuQuotaObj = 0;
    if (cpuQuota === 1) cpuQuotaObj = 25000;
    else if (cpuQuota === 2) cpuQuotaObj = 50000;
    else if (cpuQuota === 3) cpuQuotaObj = 75000;

    let parsedCapAdd = capAdd.split(',').map(c => c.trim().toUpperCase()).filter(c => c);

    const payload = {
      image,
      tag: tag || 'latest',
      name: name || undefined,
      displayName: displayName,
      icon: icon,
      webUI: webUIPort ? { scheme: webUIScheme, port: webUIPort, path: webUIPath } : null,
      networkMode: networkMode,
      pidMode: pidMode,
      hostname: hostname,
      restartPolicy: restartPolicy,
      privileged: privileged,
      memory: memory && parseInt(memory) > 0 ? parseInt(memory) * 1024 * 1024 : 0,
      cpuQuota: cpuQuotaObj,
      ports: portsObj,
      volumes: volumesArray,
      env: envArray,
      devices: devicesArray,
      cmd: commandsArray,
      capAdd: parsedCapAdd
    };

    try {
      await apiClient.post('/api/docker/containers/create', payload);
      navigation.goBack();
    } catch (e) {
      console.error(e);
      showAlert('Error', 'Creation failed: ' + (e.response?.data?.error || e.message));
    } finally {
      setLoading(false);
    }
  };

  const renderDynamicList = (title, items, setter, emptyObj, field1, field2, placeholder1, placeholder2, isPorts = false, isCommands = false) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <TouchableOpacity onPress={() => addDynamicItem(setter, items, emptyObj)} style={styles.addBtn}>
          <Plus color={colors.primary} size={20} />
        </TouchableOpacity>
      </View>
      {items.map((item, index) => (
        <View key={index} style={styles.dynamicRow}>
          {isCommands ? (
            <TextInput
              style={[styles.input, { flex: 1, marginRight: 8, marginBottom: 0 }]}
              placeholder={placeholder1}
              placeholderTextColor={colors.textSecondary}
              value={item[field1]}
              onChangeText={(val) => handleDynamicListChange(setter, items, index, field1, val)}
            />
          ) : (
            <>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 8, marginBottom: 0 }]}
                placeholder={placeholder1}
                placeholderTextColor={colors.textSecondary}
                value={item[field1]}
                onChangeText={(val) => handleDynamicListChange(setter, items, index, field1, val)}
              />
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 8, marginBottom: 0 }]}
                placeholder={placeholder2}
                placeholderTextColor={colors.textSecondary}
                value={item[field2]}
                onChangeText={(val) => handleDynamicListChange(setter, items, index, field2, val)}
              />
              {isPorts && (
                <TouchableOpacity 
                  style={[styles.input, { width: 60, marginRight: 8, marginBottom: 0, justifyContent: 'center', alignItems: 'center' }]}
                  onPress={() => handleDynamicListChange(setter, items, index, 'protocol', item.protocol === 'tcp' ? 'udp' : 'tcp')}
                >
                  <Text style={{ color: colors.text, fontSize: 12 }}>{item.protocol.toUpperCase()}</Text>
                </TouchableOpacity>
              )}
            </>
          )}
          <TouchableOpacity onPress={() => removeDynamicItem(setter, items, index)} style={styles.removeBtn}>
            <Trash2 color={colors.error} size={20} />
          </TouchableOpacity>
        </View>
      ))}
      {items.length === 0 && (
        <Text style={{ color: colors.textSecondary, fontStyle: 'italic' }}>No items configured.</Text>
      )}
    </View>
  );

  const renderOptionCycler = (label, value, setter, options) => {
    const currentIndex = options.findIndex(o => o.value === value);
    const nextIndex = (currentIndex + 1) % options.length;
    return (
      <View style={styles.optionRow}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity 
          style={styles.cycleBtn}
          onPress={() => setter(options[nextIndex].value)}
        >
          <Text style={styles.cycleBtnText}>{options[currentIndex]?.label || value}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingTop: insets.top + HEADER.totalOffset, paddingBottom: CONTENT.paddingBottom }}>
      
      <View style={styles.headerCard}>
        <Server color={colors.primary} size={48} style={{ marginBottom: 16 }} />
        <Text style={styles.title}>New Container</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'manual' && styles.tabBtnActive]} 
          onPress={() => setActiveTab('manual')}
        >
          <FileText size={18} color={activeTab === 'manual' ? '#fff' : colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'manual' && styles.tabTextActive]}>Manual</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'yaml' && styles.tabBtnActive]} 
          onPress={() => setActiveTab('yaml')}
        >
          <Code size={18} color={activeTab === 'yaml' ? '#fff' : colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'yaml' && styles.tabTextActive]}>YAML</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'yaml' ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Import Compose YAML</Text>
          <Text style={[styles.label, { marginBottom: 12, marginTop: 8 }]}>You can paste the text below or upload a file from your device.</Text>
          <TouchableOpacity style={styles.uploadBtn} onPress={handlePickDocument}>
            <Upload color="#fff" size={20} style={{ marginRight: 8 }} />
            <Text style={styles.uploadBtnText}>UPLOAD YAML FILE</Text>
          </TouchableOpacity>
          <TextInput
            style={[styles.input, { height: 250, textAlignVertical: 'top', fontFamily: 'monospace' }]}
            placeholder={"version: '3'\nservices:\n  app:\n    image: nginx"}
            placeholderTextColor={colors.textSecondary}
            value={yamlInput}
            onChangeText={setYamlInput}
            multiline
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.createBtn} onPress={() => handleImportYaml(yamlInput)}>
            <Check color="#fff" size={20} style={{ marginRight: 8 }} />
            <Text style={styles.createBtnText}>ANALYZE & COMPILE</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Settings</Text>
            
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <View style={{ flex: 2 }}>
                <Text style={styles.label}>Image *</Text>
                <TextInput style={styles.input} placeholder="e.g. nginx" placeholderTextColor={colors.textSecondary} value={image} onChangeText={setImage} autoCapitalize="none" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Tag</Text>
                <TextInput style={styles.input} placeholder="latest" placeholderTextColor={colors.textSecondary} value={tag} onChangeText={setTag} autoCapitalize="none" />
              </View>
            </View>
            
            <Text style={styles.label}>Container Name (Optional)</Text>
            <TextInput style={styles.input} placeholder="e.g. my-nginx" placeholderTextColor={colors.textSecondary} value={name} onChangeText={setName} autoCapitalize="none" />

            <Text style={styles.label}>Display Name (Dashboard)</Text>
            <TextInput style={styles.input} placeholder={name || "e.g. Nginx"} placeholderTextColor={colors.textSecondary} value={displayName} onChangeText={setDisplayName} />

            <Text style={styles.label}>Icon URL (Optional)</Text>
            <TextInput style={styles.input} placeholder="https://..." placeholderTextColor={colors.textSecondary} value={icon} onChangeText={setIcon} autoCapitalize="none" />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Web Interface (Optional)</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>WebUI Port</Text>
                <TextInput style={styles.input} placeholder="8080" placeholderTextColor={colors.textSecondary} value={webUIPort} onChangeText={setWebUIPort} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Scheme</Text>
                <TouchableOpacity style={[styles.input, { justifyContent: 'center' }]} onPress={() => setWebUIScheme(webUIScheme === 'http' ? 'https' : 'http')}>
                  <Text style={{ color: colors.text }}>{webUIScheme}://</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.label}>Path</Text>
            <TextInput style={styles.input} placeholder="/" placeholderTextColor={colors.textSecondary} value={webUIPath} onChangeText={setWebUIPath} autoCapitalize="none" />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resources & Privileges</Text>
            <Text style={[styles.label, { marginTop: 8 }]}>Memory Limit (MB, 0=unlimited)</Text>
            <TextInput style={styles.input} placeholder="0" placeholderTextColor={colors.textSecondary} value={memory} onChangeText={setMemory} keyboardType="numeric" />
            
            {renderOptionCycler('CPU Quota', cpuQuota, setCpuQuota, [
              { label: 'Unlimited', value: 0 },
              { label: 'Low (25%)', value: 1 },
              { label: 'Medium (50%)', value: 2 },
              { label: 'High (75%)', value: 3 },
            ])}
            
            <View style={[styles.optionRow, { borderBottomWidth: 0, marginTop: 8, paddingVertical: 0 }]}>
              <Text style={styles.label}>Privileged Mode</Text>
              <Switch value={privileged} onValueChange={setPrivileged} trackColor={{ true: colors.primary, false: colors.border }} />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>System & Network</Text>
            {renderOptionCycler('Network Mode', networkMode, setNetworkMode, [
              { label: 'bridge', value: 'bridge' },
              { label: 'host', value: 'host' },
              { label: 'none', value: 'none' },
            ])}
            
            {renderOptionCycler('Restart Policy', restartPolicy, setRestartPolicy, [
              { label: 'Unless Stopped', value: 'unless-stopped' },
              { label: 'Always', value: 'always' },
              { label: 'On Failure', value: 'on-failure' },
              { label: 'No', value: 'no' },
            ])}

            <Text style={[styles.label, { marginTop: 8 }]}>Hostname (Optional)</Text>
            <TextInput style={styles.input} placeholder="e.g. my-host" placeholderTextColor={colors.textSecondary} value={hostname} onChangeText={setHostname} autoCapitalize="none" />

            <Text style={styles.label}>PID Mode (Optional, e.g. host)</Text>
            <TextInput style={styles.input} placeholder="" placeholderTextColor={colors.textSecondary} value={pidMode} onChangeText={setPidMode} autoCapitalize="none" />
            
            <Text style={styles.label}>Cap Add (comma separated)</Text>
            <TextInput style={styles.input} placeholder="e.g. NET_ADMIN, SYS_ADMIN" placeholderTextColor={colors.textSecondary} value={capAdd} onChangeText={setCapAdd} autoCapitalize="characters" />
          </View>

          {renderDynamicList('Ports', ports, setPorts, { host: '', container: '', protocol: 'tcp' }, 'host', 'container', 'Host (e.g. 8080)', 'Container (e.g. 80)', true)}
          {renderDynamicList('Volumes', volumes, setVolumes, { host: '', container: '' }, 'host', 'container', 'Host (e.g. /data)', 'Container (e.g. /app)')}
          {renderDynamicList('Environment Variables', envs, setEnvs, { key: '', value: '' }, 'key', 'value', 'Key (e.g. PUID)', 'Value (e.g. 1000)')}
          {renderDynamicList('Devices', devices, setDevices, { host: '', container: '' }, 'host', 'container', 'Host (e.g. /dev/dri)', 'Container (e.g. /dev/dri)')}
          {renderDynamicList('Commands', commands, setCommands, { value: '' }, 'value', null, 'Command (e.g. --appendonly=yes)', null, false, true)}

          <TouchableOpacity style={styles.createBtn} onPress={handleCreate} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : (
              <>
                <Save color="#fff" size={20} style={{ marginRight: 8 }} />
                <Text style={styles.createBtnText}>CREATE CONTAINER</Text>
              </>
            )}
          </TouchableOpacity>
          
          <View style={{ height: 40 }} />
        </>
      )}
    </ScrollView>
  );
}

const createStyles = (colors, typography) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerCard: { backgroundColor: colors.surface, padding: 24, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  title: { ...typography.h3, color: colors.text },
  tabContainer: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 12, padding: 4, marginBottom: 16 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 8 },
  tabBtnActive: { backgroundColor: colors.primary },
  tabText: { ...typography.button, color: colors.textSecondary, marginLeft: 8 },
  tabTextActive: { color: '#fff' },
  section: { backgroundColor: colors.surface, padding: 16, borderRadius: 12, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { ...typography.h3, color: colors.text },
  label: { ...typography.body, color: colors.textSecondary, marginBottom: 8 },
  input: {
    ...typography.subtitle, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: colors.border,
    borderRadius: 8, color: colors.text, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16
  },
  dynamicRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  addBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8 },
  removeBtn: { padding: 10, backgroundColor: 'rgba(255,0,0,0.1)', borderRadius: 8 },
  createBtn: { backgroundColor: colors.primary, padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', marginTop: 8 },
  createBtnText: { ...typography.button, color: '#fff' },
  uploadBtn: { backgroundColor: colors.border, padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', marginBottom: 16 },
  uploadBtnText: { ...typography.button, color: '#fff' },
  optionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 12 },
  cycleBtn: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  cycleBtnText: { ...typography.body, color: colors.text, fontWeight: 'bold' }
});
