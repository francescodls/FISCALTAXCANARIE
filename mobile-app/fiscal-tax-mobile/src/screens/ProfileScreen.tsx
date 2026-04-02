import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User,
  Mail,
  Phone,
  Building,
  LogOut,
  ChevronRight,
  Shield,
  Bell,
  HelpCircle,
  FileText,
  ExternalLink,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../config/constants';

export const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Esci',
      'Sei sicuro di voler uscire?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Esci',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  const MenuItem = ({
    icon: Icon,
    title,
    subtitle,
    onPress,
    showChevron = true,
    color = COLORS.text,
  }: {
    icon: any;
    title: string;
    subtitle?: string;
    onPress: () => void;
    showChevron?: boolean;
    color?: string;
  }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIcon, { backgroundColor: color + '15' }]}>
        <Icon size={20} color={color} />
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuTitle, { color }]}>{title}</Text>
        {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      {showChevron && <ChevronRight size={20} color={COLORS.textLight} />}
    </TouchableOpacity>
  );

  const getTipoClienteLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      autonomo: 'Lavoratore Autonomo',
      societa: 'Società',
      pensionato: 'Pensionato',
      dipendente: 'Dipendente',
    };
    return labels[tipo?.toLowerCase()] || tipo || 'Non specificato';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Profilo */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.full_name || 'Utente'}</Text>
          <Badge
            text={getTipoClienteLabel(user?.tipo_cliente || '')}
            variant="outline"
          />
        </View>

        {/* Info Card */}
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Mail size={18} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>{user?.email}</Text>
          </View>
          {user?.phone && (
            <View style={styles.infoRow}>
              <Phone size={18} color={COLORS.textSecondary} />
              <Text style={styles.infoText}>{user.phone}</Text>
            </View>
          )}
        </Card>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Card style={styles.menuCard}>
            <MenuItem
              icon={Shield}
              title="Privacy e Dati"
              subtitle="Gestisci consensi e diritti"
              onPress={() => Linking.openURL('https://fiscaltaxcanarie.com/privacy-policy/')}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon={Bell}
              title="Notifiche Push"
              subtitle="Attive"
              onPress={() => Alert.alert('Notifiche', 'Le notifiche push sono attive')}
            />
          </Card>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Supporto</Text>
          <Card style={styles.menuCard}>
            <MenuItem
              icon={HelpCircle}
              title="Assistenza"
              subtitle="Contatta il supporto"
              onPress={() => Linking.openURL('mailto:info@fiscaltaxcanarie.com')}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon={FileText}
              title="Privacy Policy"
              onPress={() => Linking.openURL('https://fiscaltaxcanarie.com/privacy-policy/')}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon={ExternalLink}
              title="Sito Web"
              onPress={() => Linking.openURL('https://fiscaltaxcanarie.com')}
            />
          </Card>
        </View>

        {/* Logout */}
        <View style={styles.logoutSection}>
          <Button
            title="Esci"
            variant="outline"
            onPress={handleLogout}
            icon={<LogOut size={18} color={COLORS.error} />}
            style={styles.logoutButton}
            textStyle={{ color: COLORS.error }}
          />
        </View>

        {/* Version */}
        <Text style={styles.version}>Fiscal Tax Canarie v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  infoCard: {
    marginBottom: SPACING.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.md,
  },
  infoText: {
    fontSize: 15,
    color: COLORS.text,
  },
  menuSection: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  menuCard: {
    padding: 0,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  menuSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 68,
  },
  logoutSection: {
    marginTop: SPACING.md,
  },
  logoutButton: {
    borderColor: COLORS.error,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: SPACING.lg,
  },
});
