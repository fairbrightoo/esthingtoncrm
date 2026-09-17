import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { Slot } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';

import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  
  useEffect(() => {
    // Hide the splash screen once the root layout mounts
    SplashScreen.hideAsync();
  }, []);

  return (
    <AuthProvider>
      <Slot />
    </AuthProvider>
  );
}
