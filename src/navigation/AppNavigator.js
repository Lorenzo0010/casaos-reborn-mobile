import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, Server, LogOut, RefreshCw } from 'lucide-react-native';
import { TouchableOpacity, Alert, View } from 'react-native';
import { logout } from '../api/client';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme';

import DashboardScreen from '../screens/DashboardScreen';
import ContainersScreen from '../screens/ContainersScreen';
import ContainerDetailsScreen from '../screens/ContainerDetailsScreen';
import ContainerSettingsScreen from '../screens/ContainerSettingsScreen';
import ContainerCreateScreen from '../screens/ContainerCreateScreen';
import UpdatesScreen from '../screens/UpdatesScreen';
import WidgetDetailsScreen from '../screens/WidgetDetailsScreen';
import { PlusCircle } from 'lucide-react-native';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const handleLogout = (navigation) => {
  Alert.alert('Logout', 'Vuoi davvero disconnetterti?', [
    { text: 'Annulla', style: 'cancel' },
    { text: 'Sì, Esci', style: 'destructive', onPress: () => logout(navigation) },
  ]);
};

const LogoutButton = () => {
  const navigation = useNavigation();
  return (
    <TouchableOpacity onPress={() => handleLogout(navigation)} style={{ marginLeft: 16 }}>
      <LogOut color="#ff4d4f" size={24} />
    </TouchableOpacity>
  );
};

const ContainersHeaderRight = () => {
  const navigation = useNavigation();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
      <TouchableOpacity onPress={() => navigation.navigate('ContainerCreate')} style={{ marginRight: 16 }}>
        <PlusCircle color={colors.primary} size={24} />
      </TouchableOpacity>
      <LogoutButton />
    </View>
  );
};

function ContainersStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen 
        name="ContainersList" 
        component={ContainersScreen} 
        options={{ title: 'Containers', headerRight: () => <ContainersHeaderRight /> }} 
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
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
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
        options={({ route }) => ({ title: route.params?.title || 'Dettagli', headerRight: () => <LogoutButton /> })}
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
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
          }
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        headerStyle: {
          backgroundColor: colors.surface,
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
        options={{ title: 'Aggiornamenti', headerRight: () => <LogoutButton /> }} 
      />
    </Tab.Navigator>
  );
}
