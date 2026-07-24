import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const apiClient = axios.create({
  // URL verrà impostato dinamicamente in base a ciò che l'utente inserisce al login
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

export const setBaseUrl = (url) => {
  let formattedUrl = url;
  if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
    formattedUrl = 'http://' + formattedUrl;
  }
  apiClient.defaults.baseURL = formattedUrl;
};
