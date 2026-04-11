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

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
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
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name="Scadenze"
        component={CalendarScreen}
        options={{
          tabBarLabel: 'Scadenze',
          tabBarIcon: ({ color, size }) => <Calendar size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name="Documenti"
        component={DocumentsScreen}
        options={{
          tabBarLabel: 'Documenti',
          tabBarIcon: ({ color, size }) => <FileText size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name="Comunicazioni"
        component={CommunicationsScreen}
        options={{
          tabBarLabel: 'Messaggi',
          tabBarIcon: ({ color, size }) => <MessageSquare size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profilo"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profilo',
          tabBarIcon: ({ color, size }) => <User size={22} color={color} />,
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
