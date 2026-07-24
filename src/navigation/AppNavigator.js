import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Server, LogOut } from 'lucide-react-native';
import { TouchableOpacity, Alert } from 'react-native';
import { logout } from '../api/client';
import { useNavigation } from '@react-navigation/native';

import DashboardScreen from '../screens/DashboardScreen';
import ContainersScreen from '../screens/ContainersScreen';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  const navigation = useNavigation();

  const handleLogout = () => {
    Alert.alert('Logout', 'Vuoi davvero disconnetterti?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Sì, Esci', style: 'destructive', onPress: () => logout(navigation) },
    ]);
  };

  const LogoutButton = () => (
    <TouchableOpacity onPress={handleLogout} style={{ marginRight: 16 }}>
      <LogOut color="#ff4d4f" size={24} />
    </TouchableOpacity>
  );

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === 'Dashboard') {
            return <Home color={color} size={size} />;
          } else if (route.name === 'Containers') {
            return <Server color={color} size={size} />;
          }
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#888888',
        tabBarStyle: {
          backgroundColor: '#2a2a2a',
          borderTopColor: '#333333',
        },
        headerStyle: {
          backgroundColor: '#2a2a2a',
        },
        headerTintColor: '#ffffff',
        headerRight: () => <LogoutButton />,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Containers" component={ContainersScreen} />
    </Tab.Navigator>
  );
}
