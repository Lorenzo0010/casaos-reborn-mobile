import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Modal, TextInput, ScrollView, Platform } from 'react-native';
import { Folder, File, ChevronRight, CornerLeftUp, HardDrive, AlertCircle, FolderPlus, FilePlus, Home, Database, Edit, Copy, Scissors, Trash2, ClipboardPaste, X, MoreVertical, Download, Upload } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiClient } from '../api/client';
import { useTheme } from '../contexts/ThemeContext';
import { useAlert } from '../contexts/AlertContext';
import { HEADER, SPACING } from '../constants/layout';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as MediaLibrary from 'expo-media-library';

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'];
const TEXT_EXTENSIONS = ['txt', 'md', 'json', 'js', 'html', 'css', 'yml', 'yaml', 'ini', 'conf', 'sh', 'py', 'csv', 'log'];

function getFileType(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (TEXT_EXTENSIONS.includes(ext) || !fileName.includes('.')) return 'text';
  return 'other';
}

function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default function FilesScreen({ navigation }) {
  const { colors, typography } = useTheme();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();
  
  const [currentPath, setCurrentPath] = useState('');
  const [homedir, setHomedir] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Auto-clear errors after 5 seconds
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  // Modal State
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createMode, setCreateMode] = useState('dir'); // 'dir', 'file', 'rename'
  const [newItemName, setNewItemName] = useState('');

  // Context Menu & Clipboard State
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [clipboard, setClipboard] = useState(null); // { action: 'copy'|'move', source: string, name: string }

  const fetchFiles = useCallback(async (path, isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/api/files/list', { params: { path } });
      if (res.data && res.data.files) {
        setFiles(res.data.files);
        setCurrentPath(res.data.path || path || '/');
        if (res.data.homedir) {
          setHomedir(res.data.homedir);
          if (!path && !currentPath) {
             setCurrentPath(res.data.homedir);
          }
        }
      } else {
        setFiles([]);
      }
    } catch (e) {
      console.error(e);
      setError(e.response?.data?.error || e.message || 'Failed to load files');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles(currentPath);
  }, [currentPath, fetchFiles]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFiles(currentPath, true);
  };

  const navigateToDir = (dirPath) => {
    setCurrentPath(dirPath);
  };

  const navigateUp = () => {
    const safePath = currentPath || '';
    const separator = safePath.includes('\\') ? '\\' : '/';
    let normalizedPath = safePath;
    if (normalizedPath.endsWith(separator) && normalizedPath.length > 1 && !/^[A-Za-z]:[\\/]$/.test(normalizedPath)) {
      normalizedPath = normalizedPath.slice(0, -1);
    }

    const parts = normalizedPath.split(separator);
    if (parts.length <= 1 || (parts.length === 2 && parts[0].endsWith(':'))) {
      setCurrentPath(separator === '\\' ? `${parts[0]}\\` : '/');
      return;
    }
    
    parts.pop();
    let newPath = parts.join(separator);
    if (newPath.endsWith(':')) newPath += '\\';
    if (!newPath) newPath = '/';
    
    setCurrentPath(newPath);
  };

  const openCreateModal = useCallback((mode) => {
    setCreateMode(mode);
    setNewItemName('');
    setSelectedItem(null);
    setCreateModalVisible(true);
  }, []);

  const handleUpload = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets) {
        const formData = new FormData();
        result.assets.forEach(asset => {
          formData.append('files', {
            uri: asset.uri,
            name: asset.name,
            type: asset.mimeType || 'application/octet-stream',
          });
        });

        await apiClient.post(`/api/files/upload?path=${encodeURIComponent(currentPath)}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          }
        });
        
        fetchFiles(currentPath);
        showAlert('Completed', 'Files uploaded successfully');
      }
    } catch (e) {
      setError(e.message || 'Upload failed');
    }
  }, [currentPath, fetchFiles, showAlert]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: HEADER.actionGap }}>
          <TouchableOpacity 
            style={{ width: HEADER.actionSize, height: HEADER.actionSize, justifyContent: 'center', alignItems: 'center' }}
            onPress={() => openCreateModal('dir')}
          >
            <FolderPlus color={colors.text} size={22} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={{ width: HEADER.actionSize, height: HEADER.actionSize, justifyContent: 'center', alignItems: 'center' }}
            onPress={() => openCreateModal('file')}
          >
            <FilePlus color={colors.text} size={22} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={{ width: HEADER.actionSize, height: HEADER.actionSize, justifyContent: 'center', alignItems: 'center' }}
            onPress={handleUpload}
          >
            <Upload color={colors.text} size={22} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, colors, openCreateModal, handleUpload]);

  const handleCreate = async () => {
    if (!newItemName.trim()) return;
    try {
      const separator = currentPath.includes('\\') ? '\\' : '/';
      let targetPath = currentPath.endsWith(separator) ? `${currentPath}${newItemName}` : `${currentPath}${separator}${newItemName}`;
      
      await apiClient.post('/api/files/create', {
        path: targetPath,
        isDir: createMode === 'dir'
      });
      setCreateModalVisible(false);
      setNewItemName('');
      fetchFiles(currentPath);
    } catch (e) {
      console.error(e);
      setError(e.response?.data?.error || e.message || 'Failed to create item');
      setCreateModalVisible(false);
    }
  };

  const handleRenameSubmit = async () => {
    if (!newItemName.trim() || !selectedItem) return;
    try {
      const separator = currentPath.includes('\\') ? '\\' : '/';
      let targetPath = currentPath.endsWith(separator) ? `${currentPath}${newItemName}` : `${currentPath}${separator}${newItemName}`;
      
      await apiClient.post('/api/files/rename', {
        oldPath: selectedItem.path,
        newPath: targetPath
      });
      setCreateModalVisible(false);
      setNewItemName('');
      setSelectedItem(null);
      fetchFiles(currentPath);
    } catch (e) {
      console.error(e);
      setError(e.response?.data?.error || e.message || 'Failed to rename item');
      setCreateModalVisible(false);
    }
  };

  const handleModalSubmit = () => {
    if (createMode === 'rename') {
      handleRenameSubmit();
    } else {
      handleCreate();
    }
  };

  const openContextMenu = (item) => {
    setSelectedItem(item);
    setContextMenuVisible(true);
  };

  const handleDelete = () => {
    setContextMenuVisible(false);
    if (!selectedItem) return;
    showAlert(
      'Confirm Delete',
      `Are you sure you want to delete "${selectedItem.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.post('/api/files/delete', { path: selectedItem.path });
              fetchFiles(currentPath);
            } catch (e) {
              setError(e.response?.data?.error || e.message || 'Failed to delete');
            }
          }
        }
      ]
    );
  };

  const handleCopyToClipboard = (action) => {
    setClipboard({ action, source: selectedItem.path, name: selectedItem.name });
    setContextMenuVisible(false);
  };

  const handlePaste = async () => {
    if (!clipboard) return;
    try {
      const separator = (currentPath || '').includes('\\') ? '\\' : '/';
      const destPath = (currentPath || '').endsWith(separator) ? `${currentPath}${clipboard.name}` : `${currentPath}${separator}${clipboard.name}`;
      
      if (clipboard.action === 'copy') {
        await apiClient.post('/api/files/copy', { source: clipboard.source, dest: destPath });
      } else {
        await apiClient.post('/api/files/move', { source: clipboard.source, dest: destPath });
      }
      setClipboard(null);
      fetchFiles(currentPath);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Failed to paste');
    }
  };

  const handleDownload = async () => {
    if (!selectedItem) return;
    setContextMenuVisible(false);
    
    try {
      const isDir = selectedItem.isDir;
      const fileName = isDir ? `${selectedItem.name}.zip` : selectedItem.name;
      const token = await AsyncStorage.getItem('token');
      
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      const downloadRes = await FileSystem.downloadAsync(
        `${apiClient.defaults.baseURL}/api/files/read?path=${encodeURIComponent(selectedItem.path)}`,
        fileUri,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const type = getFileType(selectedItem.name);

      if (Platform.OS === 'android') {
        if (type === 'image' && !isDir) {
          const permission = await MediaLibrary.requestPermissionsAsync();
          if (permission.granted) {
            await MediaLibrary.saveToLibraryAsync(downloadRes.uri);
            showAlert('Success', 'Image saved to gallery.');
            return;
          }
        }
        
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const base64 = await FileSystem.readAsStringAsync(downloadRes.uri, { encoding: FileSystem.EncodingType.Base64 });
          let mimeType = 'application/octet-stream';
          if (fileName.endsWith('.zip')) mimeType = 'application/zip';
          else if (fileName.endsWith('.pdf')) mimeType = 'application/pdf';
          
          const newFileUri = await FileSystem.StorageAccessFramework.createFileAsync(permissions.directoryUri, fileName, mimeType);
          await FileSystem.writeAsStringAsync(newFileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
          showAlert('Success', 'File downloaded successfully.');
        } else {
          // fallback to share
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(downloadRes.uri);
          }
        }
      } else {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(downloadRes.uri);
        } else {
          showAlert('Success', 'Downloaded to ' + downloadRes.uri);
        }
      }
    } catch (e) {
      setError(e.message || 'Failed to download file');
    }
  };

  const renderItem = ({ item }) => {
    const isDir = item.isDir;
    return (
      <TouchableOpacity 
        style={[styles.row, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
        onPress={() => {
          if (isDir) {
            navigateToDir(item.path);
          } else {
            const type = getFileType(item.name);
            if (type !== 'other') {
              navigation.navigate('FileViewer', { path: item.path, name: item.name });
            } else {
              showAlert('Unsupported File', 'This file type cannot be previewed in the app. You can download it instead.');
            }
          }
        }}
        onLongPress={() => openContextMenu(item)}
        activeOpacity={isDir ? 0.7 : 1}
      >
        <View style={styles.iconContainer}>
          {isDir ? (
            <Folder color={colors.primary} size={24} fill="rgba(59, 130, 246, 0.2)" />
          ) : (
            <File color={colors.textSecondary} size={24} />
          )}
        </View>
        <View style={styles.fileInfo}>
          <Text style={[styles.fileName, typography.bodyMedium, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.fileMeta, typography.caption, { color: colors.textSecondary }]}>
            {isDir ? 'Folder' : formatBytes(item.size)}
            {item.modifiedAt ? ` • ${new Date(item.modifiedAt).toLocaleDateString()}` : ''}
          </Text>
        </View>
        {isDir && <ChevronRight color={colors.textSecondary} size={20} style={{ marginRight: 8 }} />}
        <TouchableOpacity 
          onPress={() => openContextMenu(item)}
          style={{ padding: 4 }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MoreVertical color={colors.textSecondary} size={20} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top + HEADER.totalOffset }]}>
      <View style={styles.breadcrumbRow}>
        <TouchableOpacity onPress={navigateUp} style={[styles.upBtn, { backgroundColor: colors.surfaceElevated }]} disabled={currentPath === '/' || /^[A-Za-z]:[\\/]$/.test(currentPath)}>
          <CornerLeftUp color={currentPath === '/' || /^[A-Za-z]:[\\/]$/.test(currentPath) ? colors.textSecondary : colors.text} size={20} />
        </TouchableOpacity>
        <View style={[styles.pathContainer, { backgroundColor: colors.surfaceElevated }]}>
          <HardDrive color={colors.textSecondary} size={18} />
          <Text style={[styles.pathText, { color: colors.text }]} numberOfLines={1} ellipsizeMode="head">
            {currentPath}
          </Text>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shortcutsRow}>
        {((currentPath || '').includes('\\') || /^[A-Za-z]:/.test(currentPath || '') ? [
          { name: 'System (C:)', path: 'C:\\', icon: <HardDrive color={colors.primary} size={16} /> },
          { name: 'Home', path: '~', icon: <Home color={colors.primary} size={16} /> },
        ] : [
          { name: 'Root', path: '/', icon: <HardDrive color={colors.primary} size={16} /> },
          { name: 'Home', path: '~', icon: <Home color={colors.primary} size={16} /> },
          { name: 'Media', path: '/media', icon: <Database color={colors.primary} size={16} /> },
          { name: 'Mounts', path: '/mnt', icon: <Folder color={colors.primary} size={16} /> },
        ]).map((s, idx) => (
          <TouchableOpacity 
            key={idx} 
            style={[styles.shortcutBtn, { backgroundColor: colors.surfaceElevated }]}
            onPress={() => navigateToDir(s.path)}
          >
            {s.icon}
            <Text style={[styles.shortcutText, typography.caption, { color: colors.text }]}>{s.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {error && (
        <View style={[styles.errorContainer, { backgroundColor: 'rgba(239, 68, 68, 0.1)', marginTop: 16 }]}>
          <AlertCircle color={colors.error} size={24} />
          <Text style={[styles.errorText, typography.body, { color: colors.error }]}>{error}</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={files}
        keyExtractor={(item) => item.path}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 120 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressViewOffset={insets.top + HEADER.totalOffset + 60}
          />
        }
        ListEmptyComponent={
          loading && !refreshing ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Folder color={colors.textSecondary} size={48} />
              <Text style={[styles.emptyText, typography.subtitle, { color: colors.textSecondary }]}>
                Folder is empty
              </Text>
            </View>
          )
        }
      />

      {clipboard && (
        <View style={[styles.clipboardBar, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, paddingBottom: insets.bottom || SPACING.base }]}>
          <View style={styles.clipboardInfo}>
            {clipboard.action === 'copy' ? <Copy color={colors.primary} size={20} /> : <Scissors color={colors.primary} size={20} />}
            <Text style={[typography.bodyMedium, { color: colors.text, marginLeft: 8 }]} numberOfLines={1}>
              {clipboard.action === 'copy' ? 'Copying' : 'Moving'} {clipboard.name}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.clipboardBtnCancel} onPress={() => setClipboard(null)}>
              <X color={colors.textSecondary} size={20} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.clipboardBtnPaste, { backgroundColor: colors.primary }]} onPress={handlePaste}>
              <ClipboardPaste color="#fff" size={20} />
              <Text style={[typography.button, { color: '#fff', marginLeft: 8 }]}>Paste Here</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Context Menu Bottom Sheet */}
      <Modal
        visible={contextMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setContextMenuVisible(false)}
      >
        <TouchableOpacity style={styles.modalBackground} activeOpacity={1} onPress={() => setContextMenuVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.bottomSheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom || 24 }]}>
            <View style={[styles.bottomSheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[typography.h3, { color: colors.text, marginBottom: 16, textAlign: 'center' }]} numberOfLines={1}>
              {selectedItem?.name}
            </Text>
            
            <TouchableOpacity style={styles.sheetAction} onPress={() => { setContextMenuVisible(false); setCreateMode('rename'); setNewItemName(selectedItem?.name); setCreateModalVisible(true); }}>
              <Edit color={colors.text} size={20} />
              <Text style={[typography.bodyMedium, { color: colors.text, marginLeft: 16 }]}>Rename</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetAction} onPress={handleDownload}>
              <Download color={colors.text} size={20} />
              <Text style={[typography.bodyMedium, { color: colors.text, marginLeft: 16 }]}>Download</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.sheetAction} onPress={() => handleCopyToClipboard('copy')}>
              <Copy color={colors.text} size={20} />
              <Text style={[typography.bodyMedium, { color: colors.text, marginLeft: 16 }]}>Copy</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.sheetAction} onPress={() => handleCopyToClipboard('move')}>
              <Scissors color={colors.text} size={20} />
              <Text style={[typography.bodyMedium, { color: colors.text, marginLeft: 16 }]}>Move</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.sheetAction, { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 16 }]} onPress={handleDelete}>
              <Trash2 color={colors.error} size={20} />
              <Text style={[typography.bodyMedium, { color: colors.error, marginLeft: 16 }]}>Delete</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Create / Rename Modal */}
      <Modal
        visible={createModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[typography.h3, { color: colors.text, marginBottom: 16 }]}>
              {createMode === 'dir' ? 'New Folder' : createMode === 'file' ? 'New File' : 'Rename'}
            </Text>
            <TextInput
              style={[
                styles.textInput, 
                typography.body, 
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }
              ]}
              placeholder={createMode === 'dir' ? 'Folder Name' : createMode === 'file' ? 'File Name' : 'New Name'}
              placeholderTextColor={colors.textSecondary}
              value={newItemName}
              onChangeText={setNewItemName}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { borderColor: colors.border, borderWidth: 1 }]} onPress={() => setCreateModalVisible(false)}>
                <Text style={[typography.button, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={handleModalSubmit}>
                <Text style={[typography.button, { color: '#fff' }]}>
                  {createMode === 'rename' ? 'Save' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: SPACING.base,
    paddingTop: 8,
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  upBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pathContainer: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  pathText: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: 13,
  },
  shortcutsRow: {
    paddingTop: 12,
    gap: 8,
  },
  shortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  shortcutText: {
    fontFamily: 'Inter_500Medium',
  },
  listContent: {
    paddingHorizontal: SPACING.xl,
    paddingTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    marginBottom: 4,
  },
  fileMeta: {
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: {
    marginTop: 16,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.xl,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  errorText: {
    flex: 1,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end', // For bottom sheet
  },
  modalContent: {
    padding: 24,
    borderRadius: 16,
    width: '85%',
    maxWidth: 400,
    borderWidth: 1,
    alignSelf: 'center',
    marginBottom: 'auto',
    marginTop: 'auto',
  },
  bottomSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingTop: 12,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  clipboardBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    elevation: 8,
  },
  clipboardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  clipboardBtnCancel: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  clipboardBtnPaste: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 8,
  }
});
