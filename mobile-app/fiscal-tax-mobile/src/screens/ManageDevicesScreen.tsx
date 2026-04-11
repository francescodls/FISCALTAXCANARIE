import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Smartphone, Monitor, Tablet, X, Check, Clock } from 'lucide-react-native';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../config/constants';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

interface DeviceInfo {
  id: string;
  name: string;
  type: 'mobile' | 'tablet' | 'desktop';
  os: string;
  lastActive: string;
  isCurrent: boolean;
}

export const ManageDevicesScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t, language } = useLanguage();
  const { logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      // Simula il caricamento dei dispositivi
      // In produzione, questo verrebbe dal backend
      const currentDevice: DeviceInfo = {
        id: Constants.sessionId || 'current',
        name: Device.modelName || (Platform.OS === 'ios' ? 'iPhone' : 'Android'),
        type: Device.deviceType === Device.DeviceType.TABLET ? 'tablet' : 'mobile',
        os: `${Platform.OS === 'ios' ? 'iOS' : 'Android'} ${Platform.Version}`,
        lastActive: new Date().toISOString(),
        isCurrent: true,
      };

      // Dispositivi mock per demo - in produzione verrebbero dal backend
      const otherDevices: DeviceInfo[] = [];
      
      setDevices([currentDevice, ...otherDevices]);
    } catch (error) {
      console.error('Error loading devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatLastActive = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return language === 'en' ? 'Now' : language === 'es' ? 'Ahora' : 'Adesso';
    if (diffMins < 60) return `${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'tablet': return Tablet;
      case 'desktop': return Monitor;
      default: return Smartphone;
    }
  };

  const handleDisconnectDevice = (device: DeviceInfo) => {
    if (device.isCurrent) {
      Alert.alert(
        t.profile.disconnectDevice,
        t.profile.logoutConfirm,
        [
          { text: t.common.cancel, style: 'cancel' },
          { text: t.profile.logout, style: 'destructive', onPress: logout },
        ]
      );
    } else {
      Alert.alert(
        t.profile.disconnectDevice,
        `${device.name}?`,
        [
          { text: t.common.cancel, style: 'cancel' },
          { 
            text: t.profile.disconnectDevice, 
            style: 'destructive', 
            onPress: () => {
              setDevices(devices.filter(d => d.id !== device.id));
              Alert.alert(t.common.success, t.profile.disconnectSuccess);
            }
          },
        ]
      );
    }
  };

  const handleDisconnectAll = () => {
    Alert.alert(
      t.profile.disconnectAll,
      t.profile.disconnectAllConfirm,
      [
        { text: t.common.cancel, style: 'cancel' },
        { 
          text: t.profile.disconnectAll, 
          style: 'destructive', 
          onPress: () => {
            logout();
          }
        },
      ]
    );
  };

  const DeviceItem = ({ device }: { device: DeviceInfo }) => {
    const Icon = getDeviceIcon(device.type);
    return (
      <View style={[styles.deviceItem, device.isCurrent && styles.deviceItemCurrent]}>
        <View style={[styles.deviceIcon, device.isCurrent && styles.deviceIconCurrent]}>
          <Icon size={24} color={device.isCurrent ? COLORS.primary : COLORS.textSecondary} />
        </View>
        <View style={styles.deviceInfo}>
          <View style={styles.deviceNameRow}>
            <Text style={styles.deviceName}>{device.name}</Text>
            {device.isCurrent && (
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>{t.profile.currentDevice}</Text>
              </View>
            )}
          </View>
          <Text style={styles.deviceOs}>{device.os}</Text>
          <View style={styles.lastActiveRow}>
            <Clock size={12} color={COLORS.textLight} />
            <Text style={styles.lastActiveText}>
              {t.profile.lastActive}: {formatLastActive(device.lastActive)}
            </Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.disconnectButton}
          onPress={() => handleDisconnectDevice(device)}
        >
          <X size={20} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.profile.manageDevices}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>{t.profile.connectedDevices}</Text>
        
        <View style={styles.devicesCard}>
          {devices.map((device) => (
            <DeviceItem key={device.id} device={device} />
          ))}
        </View>

        {devices.length === 1 && (
          <View style={styles.noOtherDevices}>
            <Check size={24} color={COLORS.success} />
            <Text style={styles.noOtherDevicesText}>{t.profile.noOtherDevices}</Text>
          </View>
        )}

        {devices.length > 0 && (
          <TouchableOpacity 
            style={styles.disconnectAllButton}
            onPress={handleDisconnectAll}
          >
            <X size={20} color={COLORS.error} />
            <Text style={styles.disconnectAllText}>{t.profile.disconnectAll}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fb' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  headerRight: { width: 40 },
  content: { flex: 1 },
  contentContainer: { padding: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  devicesCard: { backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  deviceItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  deviceItemCurrent: { backgroundColor: COLORS.primary + '08' },
  deviceIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  deviceIconCurrent: { backgroundColor: COLORS.primary + '15' },
  deviceInfo: { flex: 1 },
  deviceNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deviceName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  currentBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  currentBadgeText: { fontSize: 10, fontWeight: '600', color: '#ffffff' },
  deviceOs: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  lastActiveRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  lastActiveText: { fontSize: 11, color: COLORS.textLight },
  disconnectButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: COLORS.error + '10' },
  noOtherDevices: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24, gap: 8 },
  noOtherDevicesText: { fontSize: 14, color: COLORS.success, fontWeight: '500' },
  disconnectAllButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 32, backgroundColor: COLORS.error + '10', borderRadius: 12, padding: 16, gap: 8 },
  disconnectAllText: { fontSize: 15, fontWeight: '600', color: COLORS.error },
});
