import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Keys for secure storage
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const STORED_CREDENTIALS_KEY = 'stored_credentials';

export interface BiometricConfig {
  isAvailable: boolean;
  biometricType: 'fingerprint' | 'facial' | 'iris' | 'none';
  isEnabled: boolean;
}

export interface StoredCredentials {
  email: string;
  password: string;
}

class BiometricService {
  // Check if biometric authentication is available on device
  async checkAvailability(): Promise<BiometricConfig> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      let biometricType: BiometricConfig['biometricType'] = 'none';
      
      if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        biometricType = 'facial';
      } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        biometricType = 'fingerprint';
      } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        biometricType = 'iris';
      }
      
      const isEnabled = await this.isEnabled();
      
      return {
        isAvailable: hasHardware && isEnrolled,
        biometricType,
        isEnabled,
      };
    } catch (error) {
      console.error('[Biometric] Error checking availability:', error);
      return {
        isAvailable: false,
        biometricType: 'none',
        isEnabled: false,
      };
    }
  }

  // Get friendly name for biometric type
  getBiometricName(type: BiometricConfig['biometricType']): string {
    switch (type) {
      case 'facial':
        return Platform.OS === 'ios' ? 'Face ID' : 'Riconoscimento facciale';
      case 'fingerprint':
        return Platform.OS === 'ios' ? 'Touch ID' : 'Impronta digitale';
      case 'iris':
        return 'Scansione iride';
      default:
        return 'Biometria';
    }
  }

  // Check if biometric login is enabled by user
  async isEnabled(): Promise<boolean> {
    try {
      const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      return enabled === 'true';
    } catch (error) {
      console.error('[Biometric] Error checking enabled status:', error);
      return false;
    }
  }

  // Enable biometric login and store credentials
  async enable(email: string, password: string): Promise<boolean> {
    try {
      // Store credentials securely
      const credentials: StoredCredentials = { email, password };
      await SecureStore.setItemAsync(
        STORED_CREDENTIALS_KEY,
        JSON.stringify(credentials),
        { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }
      );
      
      // Mark as enabled
      await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
      
      console.log('[Biometric] Enabled successfully');
      return true;
    } catch (error) {
      console.error('[Biometric] Error enabling:', error);
      return false;
    }
  }

  // Disable biometric login and clear credentials
  async disable(): Promise<boolean> {
    try {
      await SecureStore.deleteItemAsync(STORED_CREDENTIALS_KEY);
      await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
      
      console.log('[Biometric] Disabled successfully');
      return true;
    } catch (error) {
      console.error('[Biometric] Error disabling:', error);
      return false;
    }
  }

  // Authenticate using biometrics
  async authenticate(promptMessage?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptMessage || 'Accedi con biometria',
        cancelLabel: 'Annulla',
        disableDeviceFallback: false,
        fallbackLabel: 'Usa password',
      });

      if (result.success) {
        console.log('[Biometric] Authentication successful');
        return { success: true };
      } else {
        let errorMessage = 'Autenticazione fallita';
        
        switch (result.error) {
          case 'user_cancel':
            errorMessage = 'Autenticazione annullata';
            break;
          case 'user_fallback':
            errorMessage = 'Usa la password';
            break;
          case 'lockout':
            errorMessage = 'Troppi tentativi falliti. Riprova più tardi.';
            break;
          case 'not_enrolled':
            errorMessage = 'Nessuna biometria configurata sul dispositivo';
            break;
          default:
            errorMessage = result.error || 'Autenticazione fallita';
        }
        
        console.log('[Biometric] Authentication failed:', result.error);
        return { success: false, error: errorMessage };
      }
    } catch (error: any) {
      console.error('[Biometric] Authentication error:', error);
      return { success: false, error: error.message || 'Errore di autenticazione' };
    }
  }

  // Get stored credentials after successful biometric auth
  async getStoredCredentials(): Promise<StoredCredentials | null> {
    try {
      const stored = await SecureStore.getItemAsync(STORED_CREDENTIALS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      return null;
    } catch (error) {
      console.error('[Biometric] Error getting credentials:', error);
      return null;
    }
  }

  // Full biometric login flow
  async authenticateAndGetCredentials(promptMessage?: string): Promise<{
    success: boolean;
    credentials?: StoredCredentials;
    error?: string;
  }> {
    // First authenticate
    const authResult = await this.authenticate(promptMessage);
    
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }
    
    // Then get credentials
    const credentials = await this.getStoredCredentials();
    
    if (!credentials) {
      return { success: false, error: 'Credenziali non trovate. Effettua il login manuale.' };
    }
    
    return { success: true, credentials };
  }

  // Check if we have stored credentials (for showing biometric button)
  async hasStoredCredentials(): Promise<boolean> {
    try {
      const stored = await SecureStore.getItemAsync(STORED_CREDENTIALS_KEY);
      return !!stored;
    } catch {
      return false;
    }
  }
}

export const biometricService = new BiometricService();
