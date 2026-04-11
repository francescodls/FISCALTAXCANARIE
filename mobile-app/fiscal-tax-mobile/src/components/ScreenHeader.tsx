import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Home } from 'lucide-react-native';
import { COLORS, SPACING } from '../config/constants';

interface ScreenHeaderProps {
  title: string;
  showBackButton?: boolean;
  showHomeButton?: boolean;
  rightComponent?: React.ReactNode;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  showBackButton = true,
  showHomeButton = false,
  rightComponent,
}) => {
  const navigation = useNavigation<any>();

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // Fallback: torna alla Home
      navigation.navigate('Main', { screen: 'HomeTab' });
    }
  };

  const handleGoHome = () => {
    navigation.navigate('Main', { screen: 'HomeTab' });
  };

  return (
    <View style={styles.header}>
      <View style={styles.leftSection}>
        {showBackButton && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={24} color={COLORS.text} />
          </TouchableOpacity>
        )}
        {showHomeButton && (
          <TouchableOpacity
            style={styles.homeButton}
            onPress={handleGoHome}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Home size={22} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </View>
      
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      
      <View style={styles.rightSection}>
        {rightComponent || <View style={styles.placeholder} />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    paddingTop: Platform.OS === 'ios' ? 8 : SPACING.md,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 60,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
    borderRadius: 8,
  },
  homeButton: {
    padding: 8,
    marginLeft: 4,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '15',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginHorizontal: SPACING.sm,
  },
  rightSection: {
    minWidth: 60,
    alignItems: 'flex-end',
  },
  placeholder: {
    width: 40,
  },
});
