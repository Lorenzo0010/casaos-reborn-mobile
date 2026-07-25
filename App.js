import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Alert, Modal, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import axios from 'axios';

import LoginScreen from './src/screens/LoginScreen';
import AppNavigator from './src/navigation/AppNavigator';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);

  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const repo = 'Lorenzo0010/casaos-reborn-mobile';
        const res = await axios.get(`https://api.github.com/repos/${repo}/releases/latest`);
        const latestRelease = res.data;
        const latestTag = latestRelease.tag_name;
        
        const lastIgnored = await AsyncStorage.getItem('ignored_update_tag');
        if (lastIgnored === latestTag) {
            return;
        }

        const storedLatest = await AsyncStorage.getItem('latest_installed_tag');

        if (latestTag && latestTag !== storedLatest) {
          const apkAsset = latestRelease.assets.find(a => a.name.endsWith('.apk'));
          if (apkAsset) {
            Alert.alert(
              'Aggiornamento Disponibile',
              `È disponibile la build ${latestTag}. Vuoi aggiornare ora?`,
              [
                { 
                  text: 'Ignora', 
                  style: 'cancel',
                  onPress: () => AsyncStorage.setItem('ignored_update_tag', latestTag)
                },
                { 
                  text: 'Aggiorna', 
                  onPress: () => downloadAndInstall(apkAsset.browser_download_url, latestTag) 
                }
              ]
            );
          }
        }
      } catch (e) {
        console.warn('Update check failed', e.message);
      }
    };
    
    checkForUpdates();
  }, []);

  const downloadAndInstall = async (url, tag) => {
    setIsUpdating(true);
    setUpdateProgress(0);
    try {
      const fileUri = FileSystem.cacheDirectory + 'app-release.apk';
      
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(fileUri);
      }

      const downloadResumable = FileSystem.createDownloadResumable(
        url,
        fileUri,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          setUpdateProgress(progress);
        }
      );

      const { uri } = await downloadResumable.downloadAsync();
      
      await AsyncStorage.setItem('latest_installed_tag', tag);
      
      const contentUri = await FileSystem.getContentUriAsync(uri);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1, 
        type: 'application/vnd.android.package-archive'
      });
      
    } catch (e) {
      Alert.alert('Errore di Aggiornamento', e.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="MainApp" component={AppNavigator} />
        </Stack.Navigator>
      </NavigationContainer>

      {/* Modal di download aggiornamento */}
      <Modal visible={isUpdating} transparent={true} animationType="fade">
        <View style={styles.modalBackground}>
          <View style={styles.modalContent}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.modalText}>Download in corso...</Text>
            <Text style={styles.modalSubtext}>{Math.round(updateProgress * 100)}%</Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2a2a2a',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    width: '80%',
  },
  modalText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  modalSubtext: {
    color: '#aaaaaa',
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  }
});
