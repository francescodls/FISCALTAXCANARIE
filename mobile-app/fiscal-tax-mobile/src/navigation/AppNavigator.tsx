import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  Home,
  FileText,
  Bell,
  User,
  MessageSquare,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../config/constants';
import { View, ActivityIndicator, StyleSheet, Image } from 'react-native';

// Screens
import { LoginScreen } from '../screens/LoginScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { DocumentsScreen } from '../screens/DocumentsScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { DeclarationsScreen } from '../screens/DeclarationsScreen';
import { DeclarationDetailScreen } from '../screens/DeclarationDetailScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { GuidaModelliScreen } from '../screens/GuidaModelliScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          paddingTop: 8,
          paddingBottom: 8,
          height: 70,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Documenti"
        component={DocumentsScreen}
        options={{
          tabBarLabel: 'Documenti',
          tabBarIcon: ({ color, size }) => <FileText size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          tabBarLabel: 'Messaggi',
          tabBarIcon: ({ color, size }) => <MessageSquare size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Notifiche"
        component={NotificationsScreen}
        options={{
          tabBarLabel: 'Notifiche',
          tabBarIcon: ({ color, size }) => <Bell size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profilo"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profilo',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
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
          contentStyle: { backgroundColor: COLORS.background },
          animation: 'slide_from_right',
        }}
      >
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Dichiarazioni" component={DeclarationsScreen} />
            <Stack.Screen name="DeclarationDetail" component={DeclarationDetailScreen} />
            <Stack.Screen name="GuidaModelli" component={GuidaModelliScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
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
    backgroundColor: COLORS.background,
  },
  loadingLogo: {
    width: 200,
    height: 80,
    marginBottom: 24,
  },
  loadingSpinner: {
    marginTop: 16,
  },
});
