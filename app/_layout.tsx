import '@/global.css';

import { ActionSheetProvider } from '@expo/react-native-action-sheet';

import { ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ThemeToggle } from '@/components/nativewindui/ThemeToggle';
import { AuthProvider } from '@/contexts/AuthContext';
import { useColorScheme } from '@/lib/useColorScheme';
import { NAV_THEME } from '@/theme';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export default function RootLayout() {
  const { colorScheme, isDarkColorScheme } = useColorScheme();

  return (
    <>
      <StatusBar
        key={`root-status-bar-${isDarkColorScheme ? 'light' : 'dark'}`}
        style={isDarkColorScheme ? 'light' : 'dark'}
      />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ActionSheetProvider>
          <NavThemeProvider value={NAV_THEME[colorScheme]}>
            <AuthProvider>
              <Stack initialRouteName="login">
                <Stack.Screen name="login" options={LOGIN_OPTIONS} />
                <Stack.Screen name="register" options={REGISTER_OPTIONS} />
                <Stack.Screen name="index" options={INDEX_OPTIONS} />
                <Stack.Screen name="(tabs)" options={TABS_OPTIONS} />
                <Stack.Screen name="modal" options={MODAL_OPTIONS} />
              </Stack>
            </AuthProvider>
          </NavThemeProvider>
        </ActionSheetProvider>
      </GestureHandlerRootView>
    </>
  );
}

const INDEX_OPTIONS = {
  headerShown: false,
} as const;

const TABS_OPTIONS = {
  headerShown: false,
} as const;

const LOGIN_OPTIONS = {
  headerShown: false,
} as const;

const REGISTER_OPTIONS = {
  headerShown: false,
} as const;

const MODAL_OPTIONS = {
  presentation: 'modal',
  animation: 'fade_from_bottom', // for android
  title: 'Settings',
  headerRight: () => <ThemeToggle />,
} as const;
