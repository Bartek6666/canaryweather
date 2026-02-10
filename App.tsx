import './src/i18n'; // Initialize i18n first
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { SearchScreen } from './src/screens';
import ResultScreen from './src/screens/ResultScreen';
import { theme } from './src/constants/theme';
import { loadSavedLanguage } from './src/i18n';

// Navigation types
export type RootStackParamList = {
  Search: undefined;
  Result: { stationId: string; locationAlias?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  // Load saved language preference on app start
  useEffect(() => {
    loadSavedLanguage();
  }, []);

  return (
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
  );
}
