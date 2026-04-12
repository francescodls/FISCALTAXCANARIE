import React, { useEffect, useRef, useState, useCallback } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  Home,
  Calendar,
  FileText,
  MessageSquare,
  User,
} from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS, SHADOWS } from '../config/constants';
import { View, ActivityIndicator, StyleSheet, Image, Text } from 'react-native';
import { apiService } from '../services/api';

// Screens
import { LoginScreen } from '../screens/LoginScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { DocumentsScreen } from '../screens/DocumentsScreen';
import { CommunicationsScreen } from '../screens/CommunicationsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { DeclarationsScreen } from '../screens/DeclarationsScreen';
import { DeclarationDetailScreen } from '../screens/DeclarationDetailScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { GuidaModelliScreen } from '../screens/GuidaModelliScreen';
import { DeadlineDetailScreen } from '../screens/DeadlineDetailScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { TicketDetailScreen } from '../screens/TicketDetailScreen';
import { ThreadDetailScreen } from '../screens/ThreadDetailScreen';
// Profile Sub-screens
import { ChangePasswordScreen } from '../screens/ChangePasswordScreen';
import { ManageDevicesScreen } from '../screens/ManageDevicesScreen';
import { EmailNotificationsScreen } from '../screens/EmailNotificationsScreen';
import { HelpCenterScreen } from '../screens/HelpCenterScreen';
import { PrivacyConsentScreen } from '../screens/PrivacyConsentScreen';
import { TermsConditionsScreen } from '../screens/TermsConditionsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Badge component for tab icons
const TabBadge: React.FC<{ count: number }> = ({ count }) => {
  if (count <= 0) return null;
  
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
};

const MainTabs = () => {
  const { t } = useLanguage();
  const { token } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState(0);

  // Fetch badge counts
  const fetchBadgeCounts = useCallback(async () => {
    if (!token) return;
    
    try {
      const [notifications, threads, deadlines] = await Promise.all([
        apiService.getNotifications().catch(() => []),
        apiService.getCommunicationThreads().catch(() => []),
        apiService.getDeadlines().catch(() => []),
      ]);
      
      // Count unread messages
      const unreadNotifs = notifications.filter((n: any) => !n.read).length;
      const unreadThreads = threads.filter((t: any) => !t.read_by_client).length;
      setUnreadMessages(unreadNotifs + unreadThreads);
      
      // Count upcoming deadlines (next 7 days)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const upcoming = deadlines.filter((d: any) => {
        const deadlineDate = new Date(d.date || d.due_date);
        return deadlineDate >= today && deadlineDate <= nextWeek && d.status !== 'completed';
      }).length;
      setUpcomingDeadlines(upcoming);
      
    } catch (error) {
      console.error('[NavBadge] Error fetching counts:', error);
    }
  }, [token]);

  useEffect(() => {
    fetchBadgeCounts();
    // Refresh every 30 seconds
    const interval = setInterval(fetchBadgeCounts, 30000);
    return () => clearInterval(interval);
  }, [fetchBadgeCounts]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          paddingTop: 10,
          paddingBottom: 28,
          height: 82,
          ...SHADOWS.lg,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: t.nav.home,
          tabBarIcon: ({ color, focused }) => (
            <Home size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tab.Screen
        name="Scadenze"
        component={CalendarScreen}
        options={{
          tabBarLabel: t.nav.deadlines,
          tabBarIcon: ({ color, focused }) => (
            <Calendar size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tab.Screen
        name="Documenti"
        component={DocumentsScreen}
        options={{
          tabBarLabel: t.nav.documents,
          tabBarIcon: ({ color, focused }) => (
            <FileText size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tab.Screen
        name="Comunicazioni"
        component={CommunicationsScreen}
        options={{
          tabBarLabel: t.nav.messages,
          tabBarIcon: ({ color, focused }) => (
            <MessageSquare size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tab.Screen
        name="Profilo"
        component={ProfileScreen}
        options={{
          tabBarLabel: t.nav.profile,
          tabBarIcon: ({ color, focused }) => (
            <User size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <Image
      source={require('../../assets/logo.png')}
      style={styles.loadingLogo}
      resizeMode="contain"
    />
    <Text style={styles.loadingBrand}>Fiscal Tax Canarie</Text>
    <ActivityIndicator size="large" color={COLORS.primary} style={styles.loadingSpinner} />
  </View>
);

export const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const lastNotificationResponse = Notifications.useLastNotificationResponse();

  // Gestione deep link da notifiche push
  useEffect(() => {
    if (lastNotificationResponse && isAuthenticated && navigationRef.current) {
      const data = lastNotificationResponse.notification.request.content.data;
      
      if (data) {
        console.log('[Navigation] Handling push notification deep link:', data);
        
        // Delay per assicurarsi che la navigazione sia pronta
        setTimeout(() => {
          handleNotificationNavigation(data);
        }, 500);
      }
    }
  }, [lastNotificationResponse, isAuthenticated]);

  const handleNotificationNavigation = (data: any) => {
    const nav = navigationRef.current;
    if (!nav) return;

    try {
      switch (data.type) {
        case 'document':
          // Naviga alla sezione documenti
          nav.navigate('Main', { screen: 'DocumentiTab' });
          break;
          
        case 'deadline':
          // Naviga al dettaglio scadenza o calendario
          if (data.deadline_id) {
            nav.navigate('DeadlineDetail', { id: data.deadline_id });
          } else {
            nav.navigate('Main', { screen: 'CalendarTab' });
          }
          break;
          
        case 'message':
          // Naviga alla sezione comunicazioni
          nav.navigate('Main', { screen: 'ComunicazioniTab' });
          break;
          
        case 'ticket':
          // Naviga al dettaglio ticket
          if (data.ticket_id) {
            nav.navigate('TicketDetail', { ticketId: data.ticket_id });
          } else {
            nav.navigate('Main', { screen: 'ComunicazioniTab' });
          }
          break;
          
        case 'notification':
          // Naviga al centro notifiche o al thread se presente
          if (data.thread_id) {
            nav.navigate('ThreadDetail', { threadId: data.thread_id });
          } else {
            nav.navigate('Notifiche');
          }
          break;
          
        default:
          // Default: vai alla home
          nav.navigate('Main', { screen: 'HomeTab' });
      }
      
      console.log('[Navigation] Navigated to:', data.type || 'home');
    } catch (error) {
      console.error('[Navigation] Error handling notification navigation:', error);
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false,
          contentStyle: { backgroundColor: '#f8f9fb' },
          animation: 'slide_from_right',
        }}
      >
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Dichiarazioni" component={DeclarationsScreen} />
            <Stack.Screen name="DeclarationDetail" component={DeclarationDetailScreen} />
            <Stack.Screen name="DeadlineDetail" component={DeadlineDetailScreen} />
            <Stack.Screen name="Notifiche" component={NotificationsScreen} />
            <Stack.Screen name="GuidaModelli" component={GuidaModelliScreen} />
            <Stack.Screen name="Ricerca" component={SearchScreen} />
            <Stack.Screen name="TicketDetail" component={TicketDetailScreen} />
            <Stack.Screen name="ThreadDetail" component={ThreadDetailScreen} />
            {/* Profile Sub-screens */}
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
            <Stack.Screen name="ManageDevices" component={ManageDevicesScreen} />
            <Stack.Screen name="EmailNotifications" component={EmailNotificationsScreen} />
            <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
            <Stack.Screen name="PrivacyConsent" component={PrivacyConsentScreen} />
            <Stack.Screen name="TermsConditions" component={TermsConditionsScreen} />
          </>
        ) : (
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{ animation: 'fade' }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingLogo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  loadingBrand: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 24,
  },
  loadingSpinner: {
    marginTop: 8,
  },
});
