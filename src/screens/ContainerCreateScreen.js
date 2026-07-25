import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Plus, Trash2, Server } from 'lucide-react-native';
import { apiClient } from '../api/client';
import { colors } from '../theme';

export default function ContainerCreateScreen({ navigation }) {
  const [image, setImage] = useState('');
  const [name, setName] = useState('');
  
  const [ports, setPorts] = useState([{ host: '', container: '' }]);
  const [volumes, setVolumes] = useState([{ host: '', container: '' }]);
  const [envs, setEnvs] = useState([{ key: '', value: '' }]);
  
  const [loading, setLoading] = useState(false);

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

  const handleCreate = async () => {
    if (!image) {
      Alert.alert('Errore', 'Inserisci un nome immagine (es. nginx:latest)');
      return;
    }

    setLoading(true);
    
    // Preparazione Payload
    const payload = {
      image,
      container_name: name || undefined,
      ports: ports.filter(p => p.host && p.container).map(p => ({
        host: p.host,
        container: p.container
      })),
      volumes: volumes.filter(v => v.host && v.container).map(v => ({
        host: v.host,
        container: v.container
      })),
      envs: envs.filter(e => e.key && e.value).map(e => ({
        key: e.key,
        value: e.value
      }))
    };

    try {
      await apiClient.post('/api/docker/containers/create', payload);
      Alert.alert('Successo', 'Container creato con successo!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      console.error(e);
      Alert.alert('Errore', 'Creazione fallita: ' + (e.response?.data?.error || e.message));
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
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      
      <View style={styles.headerCard}>
        <Server color={colors.primary} size={48} style={{ marginBottom: 16 }} />
        <Text style={styles.title}>Nuovo Container</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Impostazioni Base</Text>
        <Text style={styles.label}>Immagine *</Text>
        <TextInput
          style={styles.input}
          placeholder="es. nginx:latest"
          placeholderTextColor={colors.textSecondary}
          value={image}
          onChangeText={setImage}
          autoCapitalize="none"
        />
        
        <Text style={styles.label}>Nome Container (Opzionale)</Text>
        <TextInput
          style={styles.input}
          placeholder="es. my-nginx"
          placeholderTextColor={colors.textSecondary}
          value={name}
          onChangeText={setName}
          autoCapitalize="none"
        />
      </View>

      {renderDynamicList('Porte', ports, handleAddPort, handleRemovePort, handlePortChange, 'host', 'container', 'Host (es. 8080)', 'Container (es. 80)')}
      {renderDynamicList('Volumi', volumes, handleAddVolume, handleRemoveVolume, handleVolumeChange, 'host', 'container', 'Host (es. /dati)', 'Container (es. /app)')}
      {renderDynamicList('Variabili d\'Ambiente', envs, handleAddEnv, handleRemoveEnv, handleEnvChange, 'key', 'value', 'Chiave (es. PUID)', 'Valore (es. 1000)')}

      <TouchableOpacity style={styles.createBtn} onPress={handleCreate} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.createBtnText}>CREA CONTAINER</Text>}
      </TouchableOpacity>
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerCard: {
    backgroundColor: colors.surface,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: 'bold',
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
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    fontSize: 16,
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
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
