import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAlert } from '../contexts/AlertContext';
import { apiClient } from '../api/client';
import { Save, AlertCircle } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { SPACING, HEADER } from '../constants/layout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'];
const TEXT_EXTENSIONS = ['txt', 'md', 'json', 'js', 'html', 'css', 'yml', 'yaml', 'ini', 'conf', 'sh', 'py', 'csv', 'log'];

function getFileType(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (TEXT_EXTENSIONS.includes(ext) || !fileName.includes('.')) return 'text';
  return 'other';
}

export default function FileViewerScreen({ route, navigation }) {
  const { path, name } = route.params;
  const { colors, typography } = useTheme();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();
  
  const fileType = useMemo(() => getFileType(name), [name]);

  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const init = async () => {
      const t = await AsyncStorage.getItem('token');
      setToken(t);
      if (fileType === 'text') {
        fetchText();
      } else {
        setLoading(false);
      }
    };
    init();
  }, [path, name, fileType]);

  const fetchText = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/files/read', {
        params: { path },
        responseType: 'text'
      });
      const textData = typeof res.data === 'object' ? JSON.stringify(res.data, null, 2) : res.data.toString();
      setContent(textData);
      setOriginalContent(textData);
    } catch (e) {
      console.error(e);
      setError(e.response?.data?.error || e.message || 'Failed to read file');
    } finally {
      setLoading(false);
    }
  };

  const saveText = useCallback(async () => {
    try {
      setSaving(true);
      await apiClient.post('/api/files/write', {
        path,
        content
      });
      setOriginalContent(content);
    } catch (e) {
      console.error(e);
      setError(e.response?.data?.error || e.message || 'Failed to save file');
    } finally {
      setSaving(false);
    }
  }, [path, content]);

  React.useLayoutEffect(() => {
    if (fileType === 'text') {
      navigation.setOptions({
        headerRight: () => (
          <TouchableOpacity 
            style={{ width: HEADER.actionSize, height: HEADER.actionSize, justifyContent: 'center', alignItems: 'center', opacity: saving ? 0.5 : 1 }}
            onPress={saveText}
            disabled={saving}
          >
            {saving ? <ActivityIndicator size="small" color={colors.primary} /> : <Save color={colors.primary} size={22} />}
          </TouchableOpacity>
        ),
      });
    }
  }, [navigation, fileType, saveText, saving, colors]);

  useEffect(() => {
    if (fileType !== 'text') return;
    
    const isDirty = content !== originalContent;
    
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!isDirty) return;

      e.preventDefault();
      
      showAlert(
        'Unsaved changes',
        'You have unsaved changes in this file. Do you want to save them before exiting?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Discard', 
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action)
          },
          { 
            text: 'Save',
            onPress: async () => {
              await saveText();
              navigation.dispatch(e.data.action);
            }
          }
        ]
      );
    });

    return unsubscribe;
  }, [navigation, fileType, content, originalContent, saveText, showAlert]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl }]}>
        <AlertCircle color={colors.error} size={48} style={{ marginBottom: 16 }} />
        <Text style={[typography.body, { color: colors.error, textAlign: 'center' }]}>{error}</Text>
      </View>
    );
  }

  const imageUrl = `${apiClient.defaults.baseURL}/api/files/read?path=${encodeURIComponent(path)}`;

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {fileType === 'text' && (
        <ScrollView 
          style={styles.editorContainer} 
          contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 20 }}
          keyboardShouldPersistTaps="handled"
        >
          <TextInput
            style={[styles.editor, typography.body, { color: colors.text, paddingTop: insets.top + HEADER.totalOffset + 16, minHeight: 300 }]}
            multiline
            value={content}
            onChangeText={setContent}
            textAlignVertical="top"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </ScrollView>
      )}

      {fileType === 'image' && token && (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: imageUrl, headers: { Authorization: `Bearer ${token}` } }}
            style={{ width: '100%', height: '100%', marginTop: insets.top + HEADER.totalOffset }}
            contentFit="contain"
          />
        </View>
      )}


    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  editorContainer: {
    flex: 1,
    paddingHorizontal: SPACING.base,
  },
  editor: {
    flex: 1,
    minHeight: '100%',
    fontFamily: 'monospace',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadBtn: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  }
});
