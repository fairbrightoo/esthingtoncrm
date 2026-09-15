import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { Slot } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  
  return (
    <AuthProvider>
      <Slot />
    </AuthProvider>
  );
}
