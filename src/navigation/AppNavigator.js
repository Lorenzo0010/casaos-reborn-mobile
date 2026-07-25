import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, Server, RefreshCw } from 'lucide-react-native';
import { Alert, View, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';

import DashboardScreen from '../screens/DashboardScreen';
import ContainersScreen from '../screens/ContainersScreen';
import ContainerDetailsScreen from '../screens/ContainerDetailsScreen';
import ContainerSettingsScreen from '../screens/ContainerSettingsScreen';
import ContainerCreateScreen from '../screens/ContainerCreateScreen';
import UpdatesScreen from '../screens/UpdatesScreen';
import AdvancedScreen from '../screens/AdvancedScreen';
import WidgetDetailsScreen from '../screens/WidgetDetailsScreen';
import { PlusCircle, Settings as SettingsIcon } from 'lucide-react-native';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();



function ContainersStackNavigator() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { 
          backgroundColor: colors.background,
          borderBottomWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: colors.text,
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen 
        name="ContainersList" 
        component={ContainersScreen} 
        options={{ 
          title: 'Containers',
          headerTitleStyle: { fontSize: 28, fontWeight: 'bold' }
        }} 
      />
      <Stack.Screen 
        name="ContainerDetails" 
        component={ContainerDetailsScreen} 
        options={{ title: 'Dettagli Container' }} 
      />
      <Stack.Screen 
        name="ContainerSettings" 
        component={ContainerSettingsScreen} 
        options={{ title: 'Impostazioni' }} 
      />
      <Stack.Screen 
        name="ContainerCreate" 
        component={ContainerCreateScreen} 
        options={{ title: 'Nuovo Container' }} 
      />
    </Stack.Navigator>
  );
}

function DashboardStackNavigator() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { 
          backgroundColor: colors.background,
          borderBottomWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: colors.text,
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen 
        name="DashboardMain" 
        component={DashboardScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="WidgetDetails" 
        component={WidgetDetailsScreen} 
        options={({ route }) => ({ title: route.params?.title || 'Dettagli' })}
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  // Un touch target standard è circa 48-64px. Con 4 icone, 260px equivale a 65px ad icona.
  // È abbastanza compatto da non sprecare spazio ma facile da cliccare!
  const BAR_WIDTH = Math.min(width - 48, 260);
  const leftPosition = (width - BAR_WIDTH) / 2;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === 'Dashboard') {
            return <Home color={color} size={size} />;
          } else if (route.name === 'ContainersTab') {
            return <Server color={color} size={size} />;
          } else if (route.name === 'Updates') {
            return <RefreshCw color={color} size={size} />;
          } else if (route.name === 'Advanced') {
            return <SettingsIcon color={color} size={size} />;
          }
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          position: 'absolute',
          bottom: 16,
          left: leftPosition,
          width: BAR_WIDTH,
          borderRadius: 32,
          height: 64,
          paddingBottom: 0,
          paddingTop: 0,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          marginTop: 4,
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
          padding: 4,
        },
        headerStyle: {
          backgroundColor: colors.background,
          borderBottomWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: colors.text,
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardStackNavigator} 
        options={{ headerShown: false }} 
      />
      <Tab.Screen 
        name="ContainersTab" 
        component={ContainersStackNavigator}
        options={{ headerShown: false, title: 'Containers' }}
      />
      <Tab.Screen 
        name="Updates" 
        component={UpdatesScreen} 
        options={{ title: 'Aggiornamenti' }} 
      />
      <Tab.Screen 
        name="Advanced" 
        component={AdvancedScreen} 
        options={{ title: 'Avanzate' }} 
      />
    </Tab.Navigator>
  );
}
