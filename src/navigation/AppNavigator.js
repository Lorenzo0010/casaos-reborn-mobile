import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { Home, Server, RefreshCw } from 'lucide-react-native';
import { View, useWindowDimensions, TouchableOpacity, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, PlusCircle, Settings as SettingsIcon } from 'lucide-react-native';
import { SPACING, HEADER, NAVBAR, getNavbarWidth, CARD } from '../constants/layout';

import DashboardScreen from '../screens/DashboardScreen';
import ContainersScreen from '../screens/ContainersScreen';
import ContainerDetailsScreen from '../screens/ContainerDetailsScreen';
import ContainerSettingsScreen from '../screens/ContainerSettingsScreen';
import ContainerCreateScreen from '../screens/ContainerCreateScreen';
import UpdatesScreen from '../screens/UpdatesScreen';
import SystemContainerSettingsScreen from '../screens/SystemContainerSettingsScreen';
import AdvancedScreen from '../screens/AdvancedScreen';
import WidgetDetailsScreen from '../screens/WidgetDetailsScreen';

const Tab = createMaterialTopTabNavigator();
const Stack = createNativeStackNavigator();

/**
 * CustomHeader — Smart pill header
 * 
 * Rules:
 * - Without headerRight: pill is centered
 * - With headerRight: pill stays centered via space-between with a left spacer,
 *   action buttons float on the right. If the title is too long, flexShrink
 *   lets it compress gracefully instead of overflowing.
 */
function CustomHeader({ options, route, back, navigation }) {
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const title = options.title !== undefined ? options.title : route.name;
  const hasRight = !!options.headerRight;

  // Estimate the width of the right action area for the invisible left spacer
  // We add SPACING.base to balance the pill's marginRight and keep it perfectly centered
  const rightAreaWidth = hasRight
    ? (HEADER.actionSize * 2) + HEADER.actionGap + SPACING.base
    : 0;

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>


      {/* Header row container */}
      <View style={{
        marginTop: insets.top + HEADER.topGap,
        paddingHorizontal: SPACING.base,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: hasRight ? 'space-between' : 'center',
      }}>
        {/* Left spacer for centering when there are right buttons */}
        {hasRight && <View style={{ width: rightAreaWidth, opacity: 0, flexShrink: 1 }} />}

        {/* Title Pill */}
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: HEADER.pillRadius,
          height: HEADER.pillHeight,
          justifyContent: 'center',
          paddingHorizontal: HEADER.pillPaddingH,
          borderWidth: HEADER.borderWidth,
          borderColor: colors.surfaceElevated === colors.surface ? colors.border : colors.surfaceElevated,
          elevation: CARD.elevation,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: CARD.shadowOpacity,
          shadowRadius: CARD.shadowRadius,
          flexDirection: 'row',
          alignItems: 'center',
          marginRight: hasRight ? SPACING.base : 0, // Garantisce sempre spazio tra pillola e bottoni a destra
        }}>
          {back && (
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: SPACING.base, marginLeft: -SPACING.md }}>
              <ChevronLeft color={colors.text} size={HEADER.backIconSize} />
            </TouchableOpacity>
          )}
          <Text style={{ ...typography.h1, fontFamily: 'Inter_500Medium', color: colors.text, fontSize: HEADER.titleFontSize }}>
            {title}
          </Text>
        </View>

        {/* Action buttons (right side) */}
        {hasRight && (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: HEADER.actionGap,
            backgroundColor: colors.surface,
            borderRadius: HEADER.pillRadius,
            height: HEADER.pillHeight,
            paddingHorizontal: HEADER.actionGap,
            justifyContent: 'center',
            elevation: CARD.elevation,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: CARD.shadowOpacity,
            shadowRadius: CARD.shadowRadius,
            borderWidth: HEADER.borderWidth,
            borderColor: colors.surfaceElevated === colors.surface ? colors.border : colors.surfaceElevated,
          }}>
            {options.headerRight()}
          </View>
        )}
      </View>
    </View>
  );
}


function ContainersStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTransparent: true,
        header: (props) => <CustomHeader {...props} />,
      }}
    >
      <Stack.Screen 
        name="ContainersList" 
        component={ContainersScreen} 
        options={{ 
          title: 'Containers'
        }} 
      />
      <Stack.Screen 
        name="ContainerDetails" 
        component={ContainerDetailsScreen} 
        options={{ title: 'Container Details' }} 
      />
      <Stack.Screen 
        name="ContainerSettings" 
        component={ContainerSettingsScreen} 
        options={{ title: 'Settings' }} 
      />
      <Stack.Screen 
        name="ContainerCreate" 
        component={ContainerCreateScreen} 
        options={{ title: 'New Container' }} 
      />
    </Stack.Navigator>
  );
}

function DashboardStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTransparent: true,
        header: (props) => <CustomHeader {...props} />,
      }}
    >
      <Stack.Screen 
        name="DashboardMain" 
        component={DashboardScreen} 
        options={{ title: 'Dashboard' }} 
      />
      <Stack.Screen 
        name="WidgetDetails" 
        component={WidgetDetailsScreen} 
        options={({ route }) => ({ title: route.params?.title || 'Details' })}
      />
    </Stack.Navigator>
  );
}

function UpdatesStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTransparent: true,
        header: (props) => <CustomHeader {...props} />,
      }}
    >
      <Stack.Screen 
        name="UpdatesMain" 
        component={UpdatesScreen} 
        options={{ title: 'Updates' }} 
      />
      <Stack.Screen 
        name="SystemContainerSettings" 
        component={SystemContainerSettingsScreen} 
        options={{ title: 'CasaOS System' }} 
      />
    </Stack.Navigator>
  );
}

function AdvancedStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTransparent: true,
        header: (props) => <CustomHeader {...props} />,
      }}
    >
      <Stack.Screen 
        name="AdvancedMain" 
        component={AdvancedScreen} 
        options={{ title: 'Advanced' }} 
      />
    </Stack.Navigator>
  );
}

function CustomTabBar({ state, descriptors, navigation, colors, BAR_WIDTH, leftPosition, bottomInset }) {
  return (
    <View style={{
      flexDirection: 'row',
      backgroundColor: colors.surface,
      position: 'absolute',
      bottom: NAVBAR.bottomGap + bottomInset,
      left: leftPosition,
      width: BAR_WIDTH,
      borderRadius: NAVBAR.radius,
      height: NAVBAR.height,
      elevation: CARD.elevation,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: CARD.shadowOpacity,
      shadowRadius: CARD.shadowRadius,
      borderWidth: HEADER.borderWidth,
      borderColor: colors.surfaceElevated === colors.surface ? colors.border : colors.surfaceElevated,
      justifyContent: 'space-evenly',
      alignItems: 'center',
    }}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const color = isFocused ? colors.primary : colors.textSecondary;
        let IconComponent = null;
        if (route.name === 'Dashboard') IconComponent = Home;
        else if (route.name === 'ContainersTab') IconComponent = Server;
        else if (route.name === 'Updates') IconComponent = RefreshCw;
        else if (route.name === 'Advanced') IconComponent = SettingsIcon;

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' }}
          >
            <View style={{
              backgroundColor: isFocused ? colors.primary : 'transparent',
              width: 48,
              height: 48,
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: 24,
              opacity: isFocused ? 1 : 0.8
            }}>
              {IconComponent && <IconComponent color={isFocused ? '#ffffff' : colors.text} size={24} />}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function getSwipeEnabled(route) {
  const routeName = getFocusedRouteNameFromRoute(route) ?? '';
  const disableSwipeRoutes = [
    'ContainerDetails',
    'ContainerSettings',
    'ContainerCreate',
    'SystemContainerSettings',
    'WidgetDetails'
  ];
  return !disableSwipeRoutes.includes(routeName);
}

export default function AppNavigator() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const BAR_WIDTH = getNavbarWidth(width);
  const leftPosition = (width - BAR_WIDTH) / 2;

  return (
    <>
    <Tab.Navigator
      tabBarPosition="bottom"
      tabBar={(props) => <CustomTabBar {...props} colors={colors} BAR_WIDTH={BAR_WIDTH} leftPosition={leftPosition} bottomInset={insets.bottom} />}
      screenOptions={{
        swipeEnabled: true,
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardStackNavigator} 
        options={({ route }) => ({ swipeEnabled: getSwipeEnabled(route) })}
      />
      <Tab.Screen 
        name="ContainersTab" 
        component={ContainersStackNavigator}
        options={({ route }) => ({ swipeEnabled: getSwipeEnabled(route) })}
      />
      <Tab.Screen 
        name="Updates" 
        component={UpdatesStackNavigator} 
        options={({ route }) => ({ swipeEnabled: getSwipeEnabled(route) })}
      />
      <Tab.Screen 
        name="Advanced" 
        component={AdvancedStackNavigator} 
        options={({ route }) => ({ swipeEnabled: getSwipeEnabled(route) })}
      />
    </Tab.Navigator>
    {/* Ombra della Status Bar di sistema (top) */}
    <LinearGradient
      colors={['rgba(0,0,0,0.3)', 'transparent']}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top + 40 }}
      pointerEvents="none"
    />
    {/* Ombra della Navigation Bar di sistema (bottom) */}
    <LinearGradient
      colors={['transparent', 'rgba(0,0,0,0.4)']}
      style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: insets.bottom + 40 }}
      pointerEvents="none"
    />
    </>
  );
}
