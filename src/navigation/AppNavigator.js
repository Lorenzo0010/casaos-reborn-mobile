import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Server, Folder, ShoppingBag } from 'lucide-react-native';

import DashboardScreen from '../screens/DashboardScreen';
import ContainersScreen from '../screens/ContainersScreen';

// Placeholders for other screens
import { StyleSheet, Text, View } from 'react-native';
const PlaceholderScreen = ({ route }) => (
  <View style={{ flex: 1, backgroundColor: '#1e1e1e', justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ color: '#aaa', fontSize: 18 }}>{route.name} - Work in progress</Text>
  </View>
);

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === 'Dashboard') {
            return <Home color={color} size={size} />;
          } else if (route.name === 'Containers') {
            return <Server color={color} size={size} />;
          } else if (route.name === 'Files') {
            return <Folder color={color} size={size} />;
          } else if (route.name === 'Store') {
            return <ShoppingBag color={color} size={size} />;
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
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Containers" component={ContainersScreen} />
      <Tab.Screen name="Files" component={PlaceholderScreen} />
      <Tab.Screen name="Store" component={PlaceholderScreen} />
    </Tab.Navigator>
  );
}
