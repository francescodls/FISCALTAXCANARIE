import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  Home,
  Calendar,
  FileText,
  MessageSquare,
  User,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../config/constants';
import { View, ActivityIndicator, StyleSheet, Image, Text } from 'react-native';

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
// Profile Sub-screens
import { ChangePasswordScreen } from '../screens/ChangePasswordScreen';
import { ManageDevicesScreen } from '../screens/ManageDevicesScreen';
import { EmailNotificationsScreen } from '../screens/EmailNotificationsScreen';
import { HelpCenterScreen } from '../screens/HelpCenterScreen';
import { PrivacyConsentScreen } from '../screens/PrivacyConsentScreen';
import { TermsConditionsScreen } from '../screens/TermsConditionsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  const { t } = useLanguage();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e2e8f0',
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 8,
          height: 70,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 12,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: t.nav.home,
          tabBarIcon: ({ color }) => <Home size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name="Scadenze"
        component={CalendarScreen}
        options={{
          tabBarLabel: t.nav.deadlines,
          tabBarIcon: ({ color }) => <Calendar size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name="Documenti"
        component={DocumentsScreen}
        options={{
          tabBarLabel: t.nav.documents,
          tabBarIcon: ({ color }) => <FileText size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name="Comunicazioni"
        component={CommunicationsScreen}
        options={{
          tabBarLabel: t.nav.messages,
          tabBarIcon: ({ color }) => <MessageSquare size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profilo"
        component={ProfileScreen}
        options={{
          tabBarLabel: t.nav.profile,
          tabBarIcon: ({ color }) => <User size={22} color={color} />,
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

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
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
