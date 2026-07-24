import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const apiClient = axios.create({
  baseURL: '',
  timeout: 10000,
});

apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Interceptor per gestire token scaduti (401/403)
apiClient.interceptors.response.use((response) => response, async (error) => {
  if (error.response && (error.response.status === 401 || error.response.status === 403)) {
    // Il token è invalido o scaduto, facciamo logout
    await logout();
  }
  return Promise.reject(error);
});

export const setBaseUrl = (url) => {
  if (!url) return;
  let formattedUrl = url;
  if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
    formattedUrl = 'http://' + formattedUrl;
  }
  apiClient.defaults.baseURL = formattedUrl;
};

export const initApiClient = async () => {
  const ip = await AsyncStorage.getItem('server_ip');
  if (ip) {
    setBaseUrl(ip);
  }
};

export const logout = async (navigation = null) => {
  await AsyncStorage.removeItem('token');
  if (navigation) {
    navigation.replace('Login');
  }
};
