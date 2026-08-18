import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { StoreProvider, useStore } from './src/store';
import TaskListScreen from './src/screens/TaskListScreen';
import ProjectsScreen from './src/screens/ProjectsScreen';
import ProjectTasksScreen from './src/screens/ProjectTasksScreen';
import TaskDetailScreen from './src/screens/TaskDetailScreen';
import TaskEditScreen from './src/screens/TaskEditScreen';
import SyncScreen from './src/screens/SyncScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import VoiceScreen from './src/screens/VoiceScreen';
import PhotoScreen from './src/screens/PhotoScreen';
import { colors } from './src/theme';
import { runSync } from './src/sync';
import { rescheduleAll } from './src/notify';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.navy,
    background: colors.bg,
    card: '#FFFFFF',
    text: colors.navy,
    border: colors.border,
  },
};

const headerStyle = {
  headerStyle: { backgroundColor: '#FFFFFF' },
  headerTitleStyle: { color: colors.navy, fontWeight: '800', fontSize: 19 },
  headerTintColor: colors.navy,
  headerShadowVisible: false,
};

function TodayScreen(props) {
  return <TaskListScreen {...props} mode="today" />;
}
function PlanScreen(props) {
  return <TaskListScreen {...props} mode="plan" />;
}
function AllTasksScreen(props) {
  return <TaskListScreen {...props} mode="all" />;
}

function Tabs() {
  const { state } = useStore();
  const routeParDefaut = {
    today: 'Aujourdhui', plan: 'Planifier', projects: 'Projets', all: 'Taches',
  }[state.settings.startScreen] || 'Aujourdhui';

  return (
    <Tab.Navigator
      initialRouteName={routeParDefaut}
      screenOptions={({ route }) => ({
        ...headerStyle,
        tabBarActiveTintColor: colors.navy,
        tabBarInactiveTintColor: colors.textLight,
        tabBarStyle: { height: 62, paddingBottom: 8, paddingTop: 6, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 11.5, fontWeight: '600' },
        tabBarIcon: ({ color, size, focused }) => {
          const icons = {
            Aujourdhui: focused ? 'checkbox' : 'checkbox-outline',
            Planifier: focused ? 'calendar' : 'calendar-outline',
            Projets: focused ? 'briefcase' : 'briefcase-outline',
            Taches: focused ? 'list-circle' : 'list-outline',
          };
          return <Ionicons name={icons[route.name]} size={size - 2} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Aujourdhui"
        component={TodayScreen}
        options={{ title: "Aujourd'hui", tabBarLabel: "Aujourd'hui" }}
      />
      <Tab.Screen
        name="Planifier"
        component={PlanScreen}
        options={{ title: 'À planifier', tabBarLabel: 'À planifier' }}
      />
      <Tab.Screen
        name="Projets"
        component={ProjectsScreen}
        options={{ title: 'Projets / Clients', tabBarLabel: 'Projets' }}
      />
      <Tab.Screen
        name="Taches"
        component={AllTasksScreen}
        options={{ title: 'Toutes les tâches', tabBarLabel: 'Tâches' }}
      />
    </Tab.Navigator>
  );
}

function Root() {
  const { state, dispatch } = useStore();
  const demarrageFait = useRef(false);

  // Tâches d'ouverture : synchronisation et replanification des rappels.
  useEffect(() => {
    if (!state.loaded || demarrageFait.current) return;
    demarrageFait.current = true;

    (async () => {
      if (state.settings.remindersEnabled) {
        await rescheduleAll(state.tasks, {
          eveningHour: state.settings.reminderEvening,
          morningHour: state.settings.reminderMorning,
        });
      }

      if (state.settings.syncOnStart) {
        const res = await runSync(
          { tasks: state.tasks, projects: state.projects },
          { wifiOnlyUpload: state.settings.wifiOnlyUpload }
        );
        if (res.ok) dispatch({ type: 'MERGE', merged: res.merged });
      }
    })();
  }, [state.loaded]);

  if (!state.loaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.navy} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={headerStyle}>
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen name="TaskDetail" component={TaskDetailScreen} options={{ title: 'Détail de la tâche' }} />
        <Stack.Screen name="TaskEdit" component={TaskEditScreen} options={{ title: 'Nouvelle tâche' }} />
        <Stack.Screen name="ProjectTasks" component={ProjectTasksScreen} options={{ title: 'Projet' }} />
        <Stack.Screen name="Sync" component={SyncScreen} options={{ title: 'Synchronisation' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Paramètres' }} />
        <Stack.Screen name="Voice" component={VoiceScreen} options={{ title: 'Dictée vocale' }} />
        <Stack.Screen
          name="Photo"
          component={PhotoScreen}
          options={{ headerShown: false, animation: 'fade' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <StoreProvider>
        <Root />
      </StoreProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
});
