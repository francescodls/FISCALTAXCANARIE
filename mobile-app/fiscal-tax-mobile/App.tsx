import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { AuthProvider } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { NetworkProvider } from './src/context/NetworkContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AppNavigator } from './src/navigation/AppNavigator';

// Configura le notifiche
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Componente interno che usa il tema
const ThemedApp: React.FC = () => {
  const { isDark, colors } = useTheme();
  
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />
      <AppNavigator />
    </View>
  );
};

export default function App() {
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    // Listener per notifiche in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('[Push] Notification received in foreground:', notification);
    });

    // Listener per tap su notifiche
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[Push] Notification tapped:', response);
      const data = response.notification.request.content.data;
      if (data) {
        console.log('[Push] Notification data:', data);
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NetworkProvider>
          <ThemeProvider>
            <LanguageProvider>
              <AuthProvider>
                <ThemedApp />
              </AuthProvider>
            </LanguageProvider>
          </ThemeProvider>
        </NetworkProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Funzione per registrare push token - da chiamare dopo il login
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  try {
    // Verifica che sia un dispositivo fisico
    if (!Device.isDevice) {
      console.log('[Push] Must use physical device for Push Notifications');
      return null;
    }

    // Verifica permessi esistenti
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Richiedi permessi se non ancora concessi
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Push] Permission not granted');
      return null;
    }

    // Ottieni project ID da app.json
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? 
                      Constants.easConfig?.projectId ??
                      'd6421bc3-ee75-4de5-8b2b-6b22646aad31';

    // Ottieni token
    const pushTokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    
    token = pushTokenData.data;
    console.log('[Push] Token obtained:', token);

    // Configura canale per Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0d9488',
      });
    }

  } catch (error) {
    console.error('[Push] Error registering for push notifications:', error);
  }

  return token;
}
