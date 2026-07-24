import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient, setBaseUrl } from '../api/client';
import { LogIn } from 'lucide-react-native';

export default function LoginScreen({ navigation }) {
  const [ipAddress, setIpAddress] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const savedIp = await AsyncStorage.getItem('server_ip');
        if (savedIp) setIpAddress(savedIp);
        // You could also auto-login here if token is saved and valid
      } catch (e) {
        console.error('Failed to load saved data');
      }
    };
    loadSavedData();
  }, []);

  const handleLogin = async () => {
    if (!ipAddress || !username || !password) {
      setError('Compila tutti i campi');
      return;
    }

    setLoading(true);
    setError('');

    try {
      setBaseUrl(ipAddress);
      
      const res = await apiClient.post('/api/login', { username, password });
      
      if (res.data && res.data.token) {
        await AsyncStorage.setItem('token', res.data.token);
        await AsyncStorage.setItem('server_ip', ipAddress);
        
        navigation.replace('MainApp'); // Will be our Tab Navigator
      } else {
        setError('Login fallito. Nessun token restituito.');
      }
    } catch (err) {
      setError('Impossibile connettersi o credenziali errate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>CasaOS Reborn</Text>
        <Text style={styles.subtitle}>Mobile Client</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Server IP / Hostname (es. 192.168.1.10:3000)</Text>
          <TextInput
            style={styles.input}
            value={ipAddress}
            onChangeText={setIpAddress}
            placeholder="192.168.1.x:3000"
            placeholderTextColor="#888"
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="admin"
            placeholderTextColor="#888"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="********"
            placeholderTextColor="#888"
            secureTextEntry
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <LogIn color="#fff" size={20} style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Login</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e', // Dark theme background
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#2a2a2a',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#aaaaaa',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorText: {
    color: '#ff4d4f',
    textAlign: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(255, 77, 79, 0.1)',
    padding: 8,
    borderRadius: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#dddddd',
    marginBottom: 8,
    fontSize: 14,
  },
  input: {
    backgroundColor: '#1e1e1e',
    color: '#ffffff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    marginTop: 12,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  }
});
