import './src/i18n'; // Initialize i18n first
import React, { useEffect, useState, useCallback } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { SearchScreen } from './src/screens';
import ResultScreen from './src/screens/ResultScreen';
import { theme } from './src/constants/theme';
import { loadSavedLanguage } from './src/i18n';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Navigation types
export type RootStackParamList = {
  Search: undefined;
  Result: { stationId: string; locationAlias?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Load saved language preference
        await loadSavedLanguage();

        // Add any other async loading here:
        // - Fonts: await Font.loadAsync({ ... })
        // - Images: await Asset.loadAsync([ ... ])
        // - API data preloading

        // Simulate minimum splash duration for branding (optional)
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        console.warn('Error loading app resources:', e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      // Hide splash screen after app is ready and layout is complete
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator
          initialRouteName="Search"
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="Search" component={SearchScreen} />
          <Stack.Screen name="Result" component={ResultScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}
