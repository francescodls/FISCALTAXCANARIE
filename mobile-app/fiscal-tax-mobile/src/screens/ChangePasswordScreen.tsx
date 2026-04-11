import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Lock, Eye, EyeOff, Check } from 'lucide-react-native';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { COLORS } from '../config/constants';

export const ChangePasswordScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { token } = useAuth();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const validatePassword = () => {
    if (!currentPassword.trim()) {
      Alert.alert(t.common.error, t.profile.currentPassword + ' required');
      return false;
    }
    if (newPassword.length < 8) {
      Alert.alert(t.common.error, t.profile.passwordTooShort);
      return false;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t.common.error, t.profile.passwordMismatch);
      return false;
    }
    return true;
  };

  const handleChangePassword = async () => {
    if (!validatePassword()) return;

    setLoading(true);
    try {
      await apiService.changePassword(currentPassword, newPassword);
      Alert.alert(t.common.success, t.profile.passwordChanged, [
        { text: t.common.ok, onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      const message = error?.message?.includes('incorrect') 
        ? t.profile.wrongPassword 
        : t.errors.generic;
      Alert.alert(t.common.error, message);
    } finally {
      setLoading(false);
    }
  };

  const InputField = ({
    label,
    value,
    onChangeText,
    showPassword,
    onToggleShow,
  }: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    showPassword: boolean;
    onToggleShow: () => void;
  }) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputWrapper}>
        <Lock size={20} color={COLORS.textSecondary} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          placeholder="••••••••"
          placeholderTextColor={COLORS.textLight}
        />
        <TouchableOpacity onPress={onToggleShow}>
          {showPassword ? (
            <EyeOff size={20} color={COLORS.textSecondary} />
          ) : (
            <Eye size={20} color={COLORS.textSecondary} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t.profile.changePassword}</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconContainer}>
            <Lock size={48} color={COLORS.primary} />
          </View>
          
          <Text style={styles.description}>
            {t.profile.passwordTooShort}
          </Text>

          <View style={styles.form}>
            <InputField
              label={t.profile.currentPassword}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              showPassword={showCurrent}
              onToggleShow={() => setShowCurrent(!showCurrent)}
            />
            <InputField
              label={t.profile.newPassword}
              value={newPassword}
              onChangeText={setNewPassword}
              showPassword={showNew}
              onToggleShow={() => setShowNew(!showNew)}
            />
            <InputField
              label={t.profile.confirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              showPassword={showConfirm}
              onToggleShow={() => setShowConfirm(!showConfirm)}
            />

            {/* Password strength indicator */}
            {newPassword.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBars}>
                  <View style={[styles.strengthBar, newPassword.length >= 4 && styles.strengthWeak]} />
                  <View style={[styles.strengthBar, newPassword.length >= 8 && styles.strengthMedium]} />
                  <View style={[styles.strengthBar, newPassword.length >= 12 && /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword) && styles.strengthStrong]} />
                </View>
                <Text style={styles.strengthText}>
                  {newPassword.length < 8 ? 'Debole' : newPassword.length < 12 ? 'Media' : 'Forte'}
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleChangePassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Check size={20} color="#ffffff" />
                <Text style={styles.submitButtonText}>{t.common.save}</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fb' },
  keyboardView: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  headerRight: { width: 40 },
  content: { flex: 1 },
  contentContainer: { padding: 24 },
  iconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary + '15', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 24 },
  description: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 32, lineHeight: 20 },
  form: { gap: 20 },
  inputContainer: { gap: 8 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 16, height: 56, gap: 12 },
  input: { flex: 1, fontSize: 16, color: COLORS.text },
  strengthContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  strengthBars: { flexDirection: 'row', gap: 4, flex: 1 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0' },
  strengthWeak: { backgroundColor: COLORS.error },
  strengthMedium: { backgroundColor: COLORS.warning },
  strengthStrong: { backgroundColor: COLORS.success },
  strengthText: { fontSize: 12, color: COLORS.textSecondary },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: 14, height: 56, marginTop: 32, gap: 8 },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
});
