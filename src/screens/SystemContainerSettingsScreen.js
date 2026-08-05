import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { Plus, Trash2, Settings, Save, ChevronDown, DownloadCloud } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAlert } from '../contexts/AlertContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HEADER } from '../constants/layout';

const CAPABILITIES = [
  'AUDIT_CONTROL', 'AUDIT_READ', 'BLOCK_SUSPEND', 'BPF', 'CHECKPOINT_RESTORE',
  'DAC_READ_SEARCH', 'IPC_LOCK', 'IPC_OWNER', 'LEASE', 'LINUX_IMMUTABLE',
  'MAC_ADMIN', 'MAC_OVERRIDE', 'NET_ADMIN', 'NET_BROADCAST', 'PERFMON',
  'SYS_ADMIN', 'SYS_BOOT', 'SYS_MODULE', 'SYS_NICE', 'SYS_PACCT',
  'SYS_PTRACE', 'SYS_RAWIO', 'SYS_RESOURCE', 'SYS_TIME', 'SYS_TTY_CONFIG',
  'SYSLOG', 'WAKE_ALARM'
];

export default function SystemContainerSettingsScreen({ navigation }) {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();

  const [ports, setPorts] = useState([]);
  const [envs, setEnvs] = useState([]);
  const [volumes, setVolumes] = useState([]);
  const [devices, setDevices] = useState([]);
  const [commands, setCommands] = useState([]);
  const [capAdd, setCapAdd] = useState([]);
  
  const [webUI, setWebUI] = useState({ scheme: 'http', port: '', path: '/' });
  const [networkMode, setNetworkMode] = useState('bridge');
  const [pidMode, setPidMode] = useState('');
  const [hostname, setHostname] = useState('');
  const [restartPolicy, setRestartPolicy] = useState('unless-stopped');
  const [memoryLimit, setMemoryLimit] = useState('0');
  const [cpuQuota, setCpuQuota] = useState(0); // 0=Unlimited, 1=Low, 2=Medium, 3=High
  const [privileged, setPrivileged] = useState(false);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [quickUpdating, setQuickUpdating] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const ip = await AsyncStorage.getItem('server_ip');
      if (!ip) throw new Error("Server IP not found");
      
      let formattedIp = ip;
      if (!formattedIp.startsWith('http://') && !formattedIp.startsWith('https://')) {
        formattedIp = 'http://' + formattedIp;
      }
      
      const parsedUrl = new URL(formattedIp);
      parsedUrl.port = '1112';
      const configUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}:1112/api/config`;

      const response = await fetch(configUrl);
      if (!response.ok) throw new Error("Error retrieving configuration");
      
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

      // Parse Volumes
      const parsedVolumes = [];
      if (details.HostConfig?.Binds) {
        details.HostConfig.Binds.forEach(b => {
          const parts = b.split(':');
          parsedVolumes.push({ host: parts[0] || '', container: parts[1] || '' });
        });
      }
      setVolumes(parsedVolumes);

      // Parse Devices
      const parsedDevices = [];
      if (details.HostConfig?.Devices) {
        details.HostConfig.Devices.forEach(d => {
          parsedDevices.push({ host: d.PathOnHost || '', container: d.PathInContainer || '' });
        });
      }
      setDevices(parsedDevices);

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

      // Parse Cmd
      const parsedCmd = [];
      if (details.Config?.Cmd) {
        details.Config.Cmd.forEach(c => parsedCmd.push({ value: c }));
      }
      setCommands(parsedCmd);

      // Web UI Labels
      const labels = details.Config?.Labels || {};
      setWebUI({
        scheme: (labels['casaos.reborn.web.scheme'] || 'http').replace('://', ''),
        port: labels['casaos.reborn.web.port'] || '',
        path: labels['casaos.reborn.web.path'] || '/'
      });

      // Advanced Settings
      setNetworkMode(details.HostConfig?.NetworkMode || 'bridge');
      setPidMode(details.HostConfig?.PidMode || '');
      setHostname(details.Config?.Hostname || '');
      setRestartPolicy(details.HostConfig?.RestartPolicy?.Name || 'unless-stopped');
      setMemoryLimit(details.HostConfig?.Memory ? Math.round(details.HostConfig.Memory / (1024 * 1024)).toString() : '0');
      setPrivileged(!!details.HostConfig?.Privileged);
      setCapAdd(details.HostConfig?.CapAdd || []);

      let parsedCpuQuota = 0;
      if (details.HostConfig?.CpuQuota === 25000) parsedCpuQuota = 1;
      else if (details.HostConfig?.CpuQuota === 50000) parsedCpuQuota = 2;
      else if (details.HostConfig?.CpuQuota === 75000) parsedCpuQuota = 3;
      setCpuQuota(parsedCpuQuota);

    } catch (e) {
      console.error(e);
      showAlert('Error', 'Cannot connect to the system updater.');
      navigation.goBack();
    } finally {
      setFetching(false);
    }
  };

  const updateDynamicList = (setter, items, index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setter(newItems);
  };
  const removeDynamicList = (setter, items, index) => setter(items.filter((_, i) => i !== index));
  const addDynamicList = (setter, items, obj) => setter([...items, obj]);

  const toggleCapability = (cap) => {
    if (capAdd.includes(cap)) {
      setCapAdd(capAdd.filter(c => c !== cap));
    } else {
      setCapAdd([...capAdd, cap]);
    }
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
    const cmdArray = commands.filter(c => c.value).map(c => c.value);
    const bindsArray = volumes.filter(v => v.host && v.container).map(v => `${v.host}:${v.container}`);
    const devicesArray = devices.filter(d => d.host && d.container).map(d => ({ PathOnHost: d.host, PathInContainer: d.container, CgroupPermissions: 'rwm' }));
    
    let cpuQuotaObj = 0;
    if (cpuQuota === 1) cpuQuotaObj = 25000;
    else if (cpuQuota === 2) cpuQuotaObj = 50000;
    else if (cpuQuota === 3) cpuQuotaObj = 75000;

    const payload = {
      Env: envArray,
      ExposedPorts: exposedPorts,
      Labels: {
        'casaos.reborn.web.scheme': webUI.scheme || 'http',
        'casaos.reborn.web.port': webUI.port || '',
        'casaos.reborn.web.path': webUI.path || '/'
      },
      Hostname: hostname || undefined,
      Cmd: cmdArray.length > 0 ? cmdArray : undefined,
      HostConfig: {
        PortBindings: portsObj,
        Binds: bindsArray,
        Devices: devicesArray,
        NetworkMode: networkMode,
        PidMode: pidMode,
        Privileged: privileged,
        Memory: parseInt(memoryLimit) > 0 ? parseInt(memoryLimit) * 1024 * 1024 : 0,
        CpuQuota: cpuQuotaObj,
        RestartPolicy: { Name: restartPolicy, MaximumRetryCount: 0 },
        CapAdd: capAdd
      }
    };

    try {
      const ip = await AsyncStorage.getItem('server_ip');
      if (!ip) throw new Error("Server IP not found");
      
      let formattedIp = ip;
      if (!formattedIp.startsWith('http://') && !formattedIp.startsWith('https://')) {
        formattedIp = 'http://' + formattedIp;
      }
      
      const parsedUrl = new URL(formattedIp);
      parsedUrl.port = '1112';
      const updaterUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}:1112/api/update`;

      showAlert('Update started', 'The system will be restarted to apply changes. The app may temporarily lose connection.');
      
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
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const renderSelector = (title, options, selectedValue, onSelect) => (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.inputLabel}>{title}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map(opt => {
          const isSelected = selectedValue === opt.value;
          return (
            <TouchableOpacity 
              key={opt.value} 
              onPress={() => onSelect(opt.value)}
              style={[
                styles.selectorBtn, 
                isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
            >
              <Text style={[
                styles.selectorText, 
                isSelected && { color: '#fff', fontWeight: 'bold' }
              ]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderDynamicList = (title, items, setter, objTemplate, field1, field2, placeholder1, placeholder2) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <TouchableOpacity onPress={() => addDynamicList(setter, items, objTemplate)} style={styles.addBtn}>
          <Plus color={colors.primary} size={20} />
        </TouchableOpacity>
      </View>
      {items.map((item, index) => (
        <View key={index} style={styles.dynamicRow}>
          {field1 && (
            <TextInput
              style={[styles.input, { flex: 1, marginRight: field2 ? 8 : 0, marginBottom: 0 }]}
              placeholder={placeholder1}
              placeholderTextColor={colors.textSecondary}
              value={item[field1]}
              onChangeText={(val) => updateDynamicList(setter, items, index, field1, val)}
            />
          )}
          {field2 && (
            <TextInput
              style={[styles.input, { flex: 1, marginRight: 8, marginBottom: 0 }]}
              placeholder={placeholder2}
              placeholderTextColor={colors.textSecondary}
              value={item[field2]}
              onChangeText={(val) => updateDynamicList(setter, items, index, field2, val)}
            />
          )}
          <TouchableOpacity onPress={() => removeDynamicList(setter, items, index)} style={styles.removeBtn}>
            <Trash2 color={colors.error} size={20} />
          </TouchableOpacity>
        </View>
      ))}
      {items.length === 0 && (
        <Text style={{ color: colors.textSecondary, fontStyle: 'italic', marginTop: 4 }}>No items configured.</Text>
      )}
    </View>
  );

  if (fetching) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', paddingTop: insets.top + HEADER.totalOffset }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingTop: insets.top + HEADER.totalOffset, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        
        <View style={[styles.headerCard, { flexDirection: 'row', alignItems: 'center' }]}>
          <View style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
            <Settings color="white" size={32} />
          </View>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={styles.title} numberOfLines={1}>CasaOS System</Text>
            <Text style={styles.subtitle}>casaos-reborn</Text>
          </View>
        </View>

        {/* Quick Update Hero */}
        <View style={[styles.section, { alignItems: 'center', paddingVertical: 30 }]}>
          <Text style={[styles.sectionTitle, { textAlign: 'center', fontSize: 20, marginBottom: 8 }]}>🚀 System Update</Text>
          <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 13, marginBottom: 20, lineHeight: 18 }}>Pull the latest image and restart CasaOS Reborn with the current configuration.</Text>
          <TouchableOpacity
            style={[styles.createBtn, { paddingHorizontal: 40, paddingVertical: 16, borderRadius: 14 }]}
            onPress={async () => {
              setQuickUpdating(true);
              try {
                const ip = await AsyncStorage.getItem('server_ip');
                if (!ip) throw new Error('Server IP not found');
                let formattedIp = ip;
                if (!formattedIp.startsWith('http://') && !formattedIp.startsWith('https://')) {
                  formattedIp = 'http://' + formattedIp;
                }
                const parsedUrl = new URL(formattedIp);
                const updaterUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}:1112/api/update`;
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 120000);
                await fetch(updaterUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({}),
                  signal: controller.signal
                });
                clearTimeout(timeoutId);
              } catch (e) {
                console.log('Quick update sent.');
              } finally {
                showAlert('Update Started', 'The system is restarting. The app may temporarily lose connection.');
                setTimeout(() => {
                  setQuickUpdating(false);
                  navigation.goBack();
                }, 5000);
              }
            }}
            disabled={quickUpdating}
          >
            {quickUpdating ? <ActivityIndicator color="#fff" /> : (
              <>
                <DownloadCloud color="#fff" size={22} style={{ marginRight: 10 }} />
                <Text style={[styles.createBtnText, { fontSize: 17 }]}>Update Now</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Advanced Settings Toggle */}
        <TouchableOpacity
          style={[styles.section, { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14 }]}
          onPress={() => setShowAdvanced(!showAdvanced)}
          activeOpacity={0.7}
        >
          <Settings color={colors.textSecondary} size={18} style={{ marginRight: 8 }} />
          <Text style={{ color: colors.textSecondary, fontFamily: 'Inter_600SemiBold', fontSize: 14 }}>Advanced Settings</Text>
          <ChevronDown color={colors.textSecondary} size={18} style={{ marginLeft: 8, transform: [{ rotate: showAdvanced ? '180deg' : '0deg' }] }} />
        </TouchableOpacity>

        {showAdvanced && (<>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Web UI Settings</Text>
          <View style={{ marginTop: 12 }}>
            {renderSelector('Scheme', [
              { label: 'HTTP', value: 'http' },
              { label: 'HTTPS', value: 'https' }
            ], webUI.scheme, (v) => setWebUI({...webUI, scheme: v}))}
            
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Port</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 1111"
                  placeholderTextColor={colors.textSecondary}
                  value={webUI.port}
                  onChangeText={(v) => setWebUI({...webUI, port: v})}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Path</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. /"
                  placeholderTextColor={colors.textSecondary}
                  value={webUI.path}
                  onChangeText={(v) => setWebUI({...webUI, path: v})}
                />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Container Configuration</Text>
          <View style={{ marginTop: 12 }}>
            {renderSelector('Network Mode', [
              { label: 'Bridge', value: 'bridge' },
              { label: 'Host', value: 'host' },
              { label: 'None', value: 'none' }
            ], networkMode, setNetworkMode)}

            {renderSelector('Restart Policy', [
              { label: 'No', value: 'no' },
              { label: 'Always', value: 'always' },
              { label: 'Unless Stopped', value: 'unless-stopped' },
              { label: 'On Failure', value: 'on-failure' }
            ], restartPolicy, setRestartPolicy)}

            {renderSelector('PID Mode', [
              { label: 'Default', value: '' },
              { label: 'Host', value: 'host' }
            ], pidMode, setPidMode)}

            <Text style={styles.inputLabel}>Hostname</Text>
            <TextInput
              style={styles.input}
              placeholder="Optional"
              placeholderTextColor={colors.textSecondary}
              value={hostname}
              onChangeText={setHostname}
            />

            {renderSelector('CPU Quota', [
              { label: 'Unlimited', value: 0 },
              { label: 'Low (25%)', value: 1 },
              { label: 'Medium (50%)', value: 2 },
              { label: 'High (75%)', value: 3 }
            ], cpuQuota, setCpuQuota)}

            <Text style={styles.inputLabel}>Memory Limit (MB) - 0 for unlimited</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 1024"
              placeholderTextColor={colors.textSecondary}
              value={memoryLimit}
              onChangeText={setMemoryLimit}
              keyboardType="numeric"
            />

            <View style={styles.switchRow}>
              <Text style={styles.inputLabel}>Privileged Mode</Text>
              <Switch value={privileged} onValueChange={setPrivileged} trackColor={{ true: colors.primary, false: 'rgba(255,255,255,0.1)' }} />
            </View>
          </View>
        </View>

        {renderDynamicList('Ports (Port Bindings)', ports, setPorts, { host: '', container: '' }, 'host', 'container', 'Host (e.g. 80)', 'Container (e.g. 3000)')}
        {renderDynamicList('Volumes (Binds)', volumes, setVolumes, { host: '', container: '' }, 'host', 'container', '/path/on/host', '/path/in/container')}
        {renderDynamicList('Devices', devices, setDevices, { host: '', container: '' }, 'host', 'container', '/dev/dri (Host)', '/dev/dri (Container)')}
        {renderDynamicList('Environment Variables', envs, setEnvs, { key: '', value: '' }, 'key', 'value', 'Key (e.g. PUID)', 'Value (e.g. 1000)')}
        {renderDynamicList('Commands', commands, setCommands, { value: '' }, 'value', null, 'Command', null)}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Capabilities (cap-add)</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {CAPABILITIES.map(cap => {
              const isActive = capAdd.includes(cap);
              return (
                <TouchableOpacity 
                  key={cap} 
                  onPress={() => toggleCapability(cap)}
                  style={[
                    styles.capBadge, 
                    isActive && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                >
                  <Text style={[
                    styles.capText, 
                    isActive && { color: '#fff', fontWeight: 'bold' }
                  ]}>{cap}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity style={styles.createBtn} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : (
              <>
                  <Save color="#fff" size={20} style={{ marginRight: 8 }} />
                  <Text style={styles.createBtnText}>SAVE SETTINGS & RESTART</Text>
              </>
          )}
        </TouchableOpacity>

        </>)}{/* end showAdvanced */}
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
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
    marginBottom: 12,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },
  inputLabel: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 6,
    textTransform: 'uppercase',
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
    marginLeft: 8,
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
  },
  selectorBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  selectorText: {
    ...typography.body,
    fontSize: 13,
    color: colors.textSecondary,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  capBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  capText: {
    ...typography.body,
    fontSize: 12,
    color: colors.textSecondary,
  }
});
