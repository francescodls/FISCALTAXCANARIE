import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../config/constants';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline';

interface BadgeProps {
  text: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  text,
  variant = 'default',
  size = 'md',
  style,
}) => {
  const getColors = () => {
    switch (variant) {
      case 'success':
        return { bg: '#dcfce7', text: '#166534' };
      case 'warning':
        return { bg: '#fef3c7', text: '#92400e' };
      case 'error':
        return { bg: '#fee2e2', text: '#991b1b' };
      case 'info':
        return { bg: '#dbeafe', text: '#1e40af' };
      case 'outline':
        return { bg: 'transparent', text: COLORS.primary, border: COLORS.primary };
      default:
        return { bg: '#f1f5f9', text: '#475569' };
    }
  };

  const colors = getColors();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border || 'transparent',
          borderWidth: colors.border ? 1 : 0,
        },
        size === 'sm' && styles.containerSm,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: colors.text },
          size === 'sm' && styles.textSm,
        ]}
      >
        {text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
  },
  containerSm: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
  textSm: {
    fontSize: 11,
  },
});
